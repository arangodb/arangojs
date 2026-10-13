/**
 * Integration coverage for the opt-in asynchronous stream transaction APIs.
 *
 * Covered use cases:
 * - preserving the legacy `step` behavior while opting into `stepAsync`;
 * - async work, multiple database calls, validation, commit, and abort;
 * - concurrent transactional and non-transactional context isolation;
 * - isolation between independently constructed connections;
 * - nested stream transactions started inside an outer `stepAsync`, including
 *   multiple siblings, multiple nesting levels, independent lifecycle choices,
 *   and restoration of each parent context;
 * - automatic lifecycle handling through `withTransactionAsync`.
 */
import { expect } from "chai";
import { DocumentCollection } from "../collections.js";
import { Database } from "../databases.js";
import { Transaction } from "../transactions.js";
import { config } from "./_config.js";
import {
  clusterIntegrationTimeoutMs,
  propagationForResourceMs,
  waitForNewDatabase,
} from "./_integration-timeouts.js";

describe("Async stream transactions", function () {
  this.timeout(clusterIntegrationTimeoutMs);

  const databaseName = `testdb_async_transactions_${Date.now()}`;
  const sleep = (millis: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, millis));
  let system: Database;
  let db: Database;
  let collection: DocumentCollection;
  let allTransactions: Transaction[];

  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") {
      await system.acquireHostList();
    }
    allTransactions = [];
    db = await system.createDatabase(databaseName);
    await waitForNewDatabase(db);
  });

  after(async () => {
    await Promise.all(
      allTransactions.map((transaction) =>
        transaction.abort().catch(() => undefined),
      ),
    );
    await system.dropDatabase(databaseName);
    system.close();
  });

  beforeEach(async () => {
    collection = await db.createCollection(`collection-${Date.now()}`);
    await db.waitForPropagation(
      { pathname: `/_api/collection/${collection.name}` },
      propagationForResourceMs,
    );
  });

  afterEach(async () => {
    try {
      await collection.get();
    } catch {
      return;
    }
    await collection.drop();
  });

  it("keeps the existing async step behavior unchanged", async () => {
    const trx = await db.beginTransaction(collection);
    allTransactions.push(trx);

    await trx.step(async () => {
      await Promise.resolve();
      return collection.save({ _key: "legacy-async" });
    });
    await trx.abort();

    expect(await collection.documentExists("legacy-async")).to.equal(true);
  });

  it("keeps async work inside stepAsync", async () => {
    const trx = await db.beginTransaction(collection);
    allTransactions.push(trx);

    await trx.stepAsync(async () => {
      await sleep(25);
      return collection.save({ _key: "async-step" });
    });

    expect(
      await trx.stepAsync(() => collection.documentExists("async-step")),
    ).to.equal(true);
    expect(await collection.documentExists("async-step")).to.equal(false);

    await trx.abort();
    expect(await collection.documentExists("async-step")).to.equal(false);
  });

  it("supports multiple database calls in one stepAsync", async () => {
    const trx = await db.beginTransaction(collection);
    allTransactions.push(trx);

    await trx.stepAsync(async () => {
      await collection.save({ _key: "async-multi-a" });
      await collection.save({ _key: "async-multi-b" });
    });

    expect(
      await trx.stepAsync(() => collection.documentExists("async-multi-a")),
    ).to.equal(true);
    expect(
      await trx.stepAsync(() => collection.documentExists("async-multi-b")),
    ).to.equal(true);

    await trx.abort();
    expect(await collection.documentExists("async-multi-a")).to.equal(false);
    expect(await collection.documentExists("async-multi-b")).to.equal(false);
  });

  it("supports concurrent stepAsync transactions on one database", async () => {
    const trx1 = await db.beginTransaction(collection);
    const trx2 = await db.beginTransaction(collection);
    allTransactions.push(trx1, trx2);

    const [meta1, meta2] = await Promise.all([
      trx1.stepAsync(async () => {
        await sleep(50);
        return collection.save({ _key: "concurrent-async-1" });
      }),
      trx2.stepAsync(() => collection.save({ _key: "concurrent-async-2" })),
    ]);

    expect(meta1).to.have.property("_key", "concurrent-async-1");
    expect(meta2).to.have.property("_key", "concurrent-async-2");
    expect(
      await trx1.stepAsync(() =>
        collection.documentExists("concurrent-async-1"),
      ),
    ).to.equal(true);
    expect(
      await trx2.stepAsync(() =>
        collection.documentExists("concurrent-async-2"),
      ),
    ).to.equal(true);
    expect(await collection.documentExists("concurrent-async-1")).to.equal(
      false,
    );
    expect(await collection.documentExists("concurrent-async-2")).to.equal(
      false,
    );

    await trx1.abort();
    await trx2.abort();
  });

  it("does not leak stepAsync context to concurrent non-transactional work", async () => {
    const trx = await db.beginTransaction(collection);
    allTransactions.push(trx);

    await Promise.all([
      trx.stepAsync(async () => {
        await sleep(50);
        return collection.save({ _key: "inside-async-context" });
      }),
      (async () => {
        await sleep(10);
        return collection.save({ _key: "outside-async-context" });
      })(),
    ]);

    expect(await collection.documentExists("outside-async-context")).to.equal(
      true,
    );
    expect(await collection.documentExists("inside-async-context")).to.equal(
      false,
    );

    await trx.abort();
    expect(await collection.documentExists("outside-async-context")).to.equal(
      true,
    );
  });

  it("scopes stepAsync context to its connection", async () => {
    const other = await db.createCollection(`other-${Date.now()}`);
    await db.waitForPropagation(
      { pathname: `/_api/collection/${other.name}` },
      propagationForResourceMs,
    );
    const independentDb = new Database({ ...config, databaseName });
    const independentOther = independentDb.collection(other.name);
    const trx = await db.beginTransaction(collection);
    allTransactions.push(trx);

    try {
      await trx.stepAsync(async () => {
        await independentOther.save({ _key: "outside-connection" });
        await collection.save({ _key: "inside-connection" });
      });
      await trx.abort();

      expect(
        await independentOther.documentExists("outside-connection"),
      ).to.equal(true);
      expect(await collection.documentExists("inside-connection")).to.equal(
        false,
      );
    } finally {
      independentDb.close();
      await other.drop();
    }
  });

  it("keeps a nested committed transaction separate from an aborted outer transaction", async () => {
    const innerCollection = await db.createCollection(`inner-${Date.now()}`);
    await db.waitForPropagation(
      { pathname: `/_api/collection/${innerCollection.name}` },
      propagationForResourceMs,
    );
    const outer = await db.beginTransaction(collection);
    allTransactions.push(outer);

    try {
      await outer.stepAsync(async () => {
        await collection.save({ _key: "outer-before-inner" });

        const inner = await db.beginTransaction(innerCollection);
        allTransactions.push(inner);
        expect(inner.id).not.to.equal(outer.id);
        await inner.stepAsync(async () => {
          await Promise.resolve();
          return innerCollection.save({ _key: "inner-committed" });
        });
        await inner.commit();

        await collection.save({ _key: "outer-after-inner" });
      });

      expect(await innerCollection.documentExists("inner-committed")).to.equal(
        true,
      );

      await outer.abort();

      expect(await innerCollection.documentExists("inner-committed")).to.equal(
        true,
      );
      expect(await collection.documentExists("outer-before-inner")).to.equal(
        false,
      );
      expect(await collection.documentExists("outer-after-inner")).to.equal(
        false,
      );
    } finally {
      await innerCollection.drop();
    }
  });

  it("keeps a nested aborted transaction separate from a committed outer transaction", async () => {
    const innerCollection = await db.createCollection(`inner-${Date.now()}`);
    await db.waitForPropagation(
      { pathname: `/_api/collection/${innerCollection.name}` },
      propagationForResourceMs,
    );
    const outer = await db.beginTransaction(collection);
    allTransactions.push(outer);

    try {
      await outer.stepAsync(async () => {
        await collection.save({ _key: "outer-before-inner" });

        const inner = await db.beginTransaction(innerCollection);
        allTransactions.push(inner);
        expect(inner.id).not.to.equal(outer.id);
        await inner.stepAsync(async () => {
          await Promise.resolve();
          return innerCollection.save({ _key: "inner-aborted" });
        });
        await inner.abort();

        await collection.save({ _key: "outer-after-inner" });
      });
      await outer.commit();

      expect(await collection.documentExists("outer-before-inner")).to.equal(
        true,
      );
      expect(await collection.documentExists("outer-after-inner")).to.equal(
        true,
      );
      expect(await innerCollection.documentExists("inner-aborted")).to.equal(
        false,
      );
    } finally {
      await innerCollection.drop();
    }
  });

  it("supports multiple sibling transactions inside one outer transaction", async () => {
    const firstInnerCollection = await db.createCollection(
      `inner-first-${Date.now()}`,
    );
    const secondInnerCollection = await db.createCollection(
      `inner-second-${Date.now()}`,
    );
    await Promise.all([
      db.waitForPropagation(
        { pathname: `/_api/collection/${firstInnerCollection.name}` },
        propagationForResourceMs,
      ),
      db.waitForPropagation(
        { pathname: `/_api/collection/${secondInnerCollection.name}` },
        propagationForResourceMs,
      ),
    ]);
    const outer = await db.beginTransaction(collection);
    allTransactions.push(outer);

    try {
      await outer.stepAsync(async () => {
        await collection.save({ _key: "outer-before-siblings" });

        const firstInner = await db.beginTransaction(firstInnerCollection);
        allTransactions.push(firstInner);
        await firstInner.stepAsync(() =>
          firstInnerCollection.save({ _key: "first-inner-committed" }),
        );
        await firstInner.commit();

        // Verifies that the outer context is restored between siblings.
        await collection.save({ _key: "outer-between-siblings" });

        const secondInner = await db.beginTransaction(secondInnerCollection);
        allTransactions.push(secondInner);
        expect(
          new Set([outer.id, firstInner.id, secondInner.id]).size,
        ).to.equal(3);
        await secondInner.stepAsync(() =>
          secondInnerCollection.save({ _key: "second-inner-aborted" }),
        );
        await secondInner.abort();

        await collection.save({ _key: "outer-after-siblings" });
      });
      await outer.abort();

      expect(
        await firstInnerCollection.documentExists("first-inner-committed"),
      ).to.equal(true);
      expect(
        await secondInnerCollection.documentExists("second-inner-aborted"),
      ).to.equal(false);
      expect(await collection.documentExists("outer-before-siblings")).to.equal(
        false,
      );
      expect(
        await collection.documentExists("outer-between-siblings"),
      ).to.equal(false);
      expect(await collection.documentExists("outer-after-siblings")).to.equal(
        false,
      );
    } finally {
      await outer.abort().catch(() => undefined);
      await Promise.all([
        firstInnerCollection.drop(),
        secondInnerCollection.drop(),
      ]);
    }
  });

  it("restores every parent in a three-level nested transaction", async () => {
    const middleCollection = await db.createCollection(`middle-${Date.now()}`);
    const deepestCollection = await db.createCollection(
      `deepest-${Date.now()}`,
    );
    await Promise.all([
      db.waitForPropagation(
        { pathname: `/_api/collection/${middleCollection.name}` },
        propagationForResourceMs,
      ),
      db.waitForPropagation(
        { pathname: `/_api/collection/${deepestCollection.name}` },
        propagationForResourceMs,
      ),
    ]);
    const outer = await db.beginTransaction(collection);
    allTransactions.push(outer);

    try {
      await outer.stepAsync(async () => {
        await collection.save({ _key: "outer-before-middle" });

        const middle = await db.beginTransaction(middleCollection);
        allTransactions.push(middle);
        await middle.stepAsync(async () => {
          await middleCollection.save({ _key: "middle-before-deepest" });

          const deepest = await db.beginTransaction(deepestCollection);
          allTransactions.push(deepest);
          expect(new Set([outer.id, middle.id, deepest.id]).size).to.equal(3);
          await deepest.stepAsync(() =>
            deepestCollection.save({ _key: "deepest-committed" }),
          );
          await deepest.commit();

          // Verifies that the middle context is restored after the deepest one.
          await middleCollection.save({ _key: "middle-after-deepest" });
        });
        await middle.abort();

        // Verifies that the outer context is restored after the middle one.
        await collection.save({ _key: "outer-after-middle" });
      });
      await outer.commit();

      expect(await collection.documentExists("outer-before-middle")).to.equal(
        true,
      );
      expect(await collection.documentExists("outer-after-middle")).to.equal(
        true,
      );
      expect(
        await middleCollection.documentExists("middle-before-deepest"),
      ).to.equal(false);
      expect(
        await middleCollection.documentExists("middle-after-deepest"),
      ).to.equal(false);
      expect(
        await deepestCollection.documentExists("deepest-committed"),
      ).to.equal(true);
    } finally {
      await outer.abort().catch(() => undefined);
      await Promise.all([middleCollection.drop(), deepestCollection.drop()]);
    }
  });

  it("withTransactionAsync commits and returns the callback result", async () => {
    const meta = await db.withTransactionAsync(collection, async (stepAsync) =>
      stepAsync(async () => {
        await Promise.resolve();
        return collection.save({ _key: "with-async-success" });
      }),
    );

    expect(meta).to.have.property("_key", "with-async-success");
    expect(await collection.documentExists("with-async-success")).to.equal(
      true,
    );
  });

  it("withTransactionAsync aborts when the callback rejects", async () => {
    let error: unknown;
    try {
      await db.withTransactionAsync(collection, async (stepAsync) => {
        await stepAsync(async () => {
          await Promise.resolve();
          return collection.save({ _key: "with-async-failure" });
        });
        throw new Error("deliberate failure");
      });
    } catch (e) {
      error = e;
    }

    expect(String(error)).to.include("deliberate failure");
    expect(await collection.documentExists("with-async-failure")).to.equal(
      false,
    );
  });

  it("rejects stepAsync callbacks that do not return a promise", async () => {
    const trx = await db.beginTransaction(collection);
    allTransactions.push(trx);
    let error: unknown;

    try {
      await trx.stepAsync(
        (() => undefined) as unknown as () => Promise<unknown>,
      );
    } catch (e) {
      error = e;
    }

    expect(String(error)).to.include("did not return a promise");
    await collection.save({ _key: "after-invalid-callback" });
    await trx.abort();
    expect(await collection.documentExists("after-invalid-callback")).to.equal(
      true,
    );
  });
});
