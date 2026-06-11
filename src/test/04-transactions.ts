import { expect } from "chai";
import { DocumentCollection } from "../collections.js";
import { Database } from "../databases.js";
import { Transaction } from "../transactions.js";
import { fetchArangoVersionCode } from "./_arango-server-version.js";
import { config } from "./_config.js";
import {
  clusterIntegrationTimeoutMs,
  propagationForResourceMs,
  waitForNewDatabase,
} from "./_integration-timeouts.js";

describe("Transactions", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  let system: Database;
  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
  });
  after(() => {
    system.close();
  });
  describe("database.executeTransaction", () => {
    const name = `testdb_${Date.now()}`;
    let db: Database;
    before(async function () {
      db = await system.createDatabase(name);
      await waitForNewDatabase(db);
      if ((await fetchArangoVersionCode(db)) >= 40000) this.skip();
    });
    after(async () => {
      await system.dropDatabase(name);
    });
    it("should execute a transaction and return the result", async () => {
      const result = await db.executeTransaction(
        [],
        "function (params) {return params;}",
        { params: "test" },
      );
      expect(result).to.equal("test");
    });
  });
  describe("stream transactions", () => {
    const name = `testdb_${Date.now()}`;
    let db: Database;
    let collection: DocumentCollection;
    let allTransactions: Transaction[];
    before(async () => {
      allTransactions = [];
      db = await system.createDatabase(name);
      await waitForNewDatabase(db);
    });
    after(async () => {
      await Promise.all(
        allTransactions.map((transaction) =>
          transaction.abort().catch(() => undefined),
        ),
      );
      await system.dropDatabase(name);
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
      } catch (e: any) {
        return;
      }
      await collection.drop();
    });

    it("can commit an empty transaction", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      {
        const { id, status } = await trx.get();
        expect(id).to.equal(trx.id);
        expect(status).to.equal("running");
      }
      {
        const trx2 = db.transaction(trx.id);
        const { id, status } = await trx2.get();
        expect(id).to.equal(trx.id);
        expect(status).to.equal("running");
      }
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
    });

    it("can abort an empty transaction", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const { id, status } = await trx.abort();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("aborted");
    });

    it("can insert a document", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const meta = await trx.step(() => collection.save({ _key: "test" }));
      expect(meta).to.have.property("_key", "test");
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
      const doc = await collection.document("test");
      expect(doc).to.have.property("_key", "test");
    });

    it("can insert two documents sequentially", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const meta1 = await trx.step(() => collection.save({ _key: "test1" }));
      const meta2 = await trx.step(() => collection.save({ _key: "test2" }));
      expect(meta1).to.have.property("_key", "test1");
      expect(meta2).to.have.property("_key", "test2");
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
      const doc1 = await collection.document("test1");
      expect(doc1).to.have.property("_key", "test1");
      const doc2 = await collection.document("test2");
      expect(doc2).to.have.property("_key", "test2");
    });

    it("does not leak when inserting a document", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      await trx.step(() => collection.save({ _key: "test" }));
      let doc: any;
      try {
        doc = await collection.document("test");
      } catch (e: any) {}
      if (doc) expect.fail("Document should not exist yet.");
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
    });

    it("does not leak when inserting two documents sequentially", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      await trx.step(() => collection.save({ _key: "test1" }));
      await trx.step(() => collection.save({ _key: "test2" }));
      let doc: any;
      try {
        doc = await collection.document("test1");
      } catch (e: any) {}
      if (doc) expect.fail("Document should not exist yet.");
      try {
        doc = await collection.document("test2");
      } catch (e: any) {}
      if (doc) expect.fail("Document should not exist yet.");
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
    });

    it("does not insert a document when aborted", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const meta = await trx.step(() => collection.save({ _key: "test" }));
      expect(meta).to.have.property("_key", "test");
      const { id, status } = await trx.abort();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("aborted");
      let doc: any;
      try {
        doc = await collection.document("test");
      } catch (e: any) {}
      if (doc) expect.fail("Document should not exist yet.");
    });

    it("does not revert unrelated changes when aborted", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const meta = await collection.save({ _key: "test" });
      expect(meta).to.have.property("_key", "test");
      const { id, status } = await trx.abort();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("aborted");
      const doc = await collection.document("test");
      expect(doc).to.have.property("_key", "test");
    });

    it("keeps async work inside the transaction", async () => {
      const sleep = (millis: number) =>
        new Promise((resolve) => setTimeout(resolve, millis));
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);

      await trx.step(async () => {
        await sleep(50);
        return collection.save({ _key: "async-test" });
      });

      const existsInTrx = await trx.step(() =>
        collection.documentExists("async-test"),
      );
      expect(existsInTrx).to.equal(true);

      let leaked = false;
      try {
        await collection.document("async-test");
        leaked = true;
      } catch {}
      expect(leaked).to.equal(false);

      await trx.abort();

      const existsAfterAbort = await collection.documentExists("async-test");
      expect(existsAfterAbort).to.equal(false);
    });

    it("supports multiple DB calls in one async step", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      await trx.step(async () => {
        await collection.save({ _key: "multi-a" });
        await collection.save({ _key: "multi-b" });
      });
      const a = await trx.step(() => collection.documentExists("multi-a"));
      const b = await trx.step(() => collection.documentExists("multi-b"));
      expect(a).to.equal(true);
      expect(b).to.equal(true);
      await trx.commit();
      expect(await collection.documentExists("multi-a")).to.equal(true);
      expect(await collection.documentExists("multi-b")).to.equal(true);
    });

    it("supports concurrent transactions on the same database", async () => {
      const sleep = (millis: number) =>
        new Promise((resolve) => setTimeout(resolve, millis));

      const trx1 = await db.beginTransaction(collection);
      const trx2 = await db.beginTransaction(collection);
      allTransactions.push(trx1, trx2);

      const [meta1, meta2] = await Promise.all([
        trx1.step(() =>
          sleep(100).then(() => collection.save({ _key: "concurrent-1" })),
        ),
        trx2.step(() => collection.save({ _key: "concurrent-2" })),
      ]);

      expect(meta1).to.have.property("_key", "concurrent-1");
      expect(meta2).to.have.property("_key", "concurrent-2");

      const doc1InTrx1 = await trx1.step(() =>
        collection.documentExists("concurrent-1"),
      );
      expect(doc1InTrx1).to.equal(true, "doc1 should exist within trx1");

      const doc2InTrx2 = await trx2.step(() =>
        collection.documentExists("concurrent-2"),
      );
      expect(doc2InTrx2).to.equal(true, "doc2 should exist within trx2");

      const doc1OutsideTrx1 = await collection.documentExists("concurrent-1");
      expect(doc1OutsideTrx1).to.equal(
        false,
        "doc1 should not exist outside trx1",
      );

      await trx1.abort();
      await trx2.abort();
    });

    it("withTransaction commits on success and returns the result", async () => {
      const meta = await db.withTransaction(collection, async (step) =>
        step(() => collection.save({ _key: "with-tx-ok" })),
      );
      expect(meta).to.have.property("_key", "with-tx-ok");
      expect(await collection.documentExists("with-tx-ok")).to.equal(true);
    });

    it("withTransaction aborts when the callback throws", async () => {
      try {
        await db.withTransaction(collection, async (step) => {
          await step(() => collection.save({ _key: "with-tx-fail" }));
          throw new Error("deliberate failure");
        });
        expect.fail("Expected withTransaction to throw");
      } catch (e: any) {
        expect(String(e)).to.include("deliberate failure");
      }
      expect(await collection.documentExists("with-tx-fail")).to.equal(false);
    });

    it("supports sequential transactions on the same database", async () => {
      await db.withTransaction(collection, async (step) => {
        await step(() => collection.save({ _key: "sequential-1" }));
      });
      await db.withTransaction(collection, async (step) => {
        await step(() => collection.save({ _key: "sequential-2" }));
      });
      expect(await collection.documentExists("sequential-1")).to.equal(true);
      expect(await collection.documentExists("sequential-2")).to.equal(true);
    });

    it("does not attach a transaction id to concurrent non-transactional writes", async () => {
      const sleep = (millis: number) =>
        new Promise((resolve) => setTimeout(resolve, millis));
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);

      await Promise.all([
        trx.step(async () => {
          await sleep(100);
          await collection.save({ _key: "concurrent-in-trx" });
        }),
        (async () => {
          await sleep(20);
          await collection.save({ _key: "concurrent-outside-trx" });
        })(),
      ]);

      expect(await collection.documentExists("concurrent-outside-trx")).to.equal(
        true,
        "non-transactional write should commit immediately",
      );
      expect(await collection.documentExists("concurrent-in-trx")).to.equal(
        false,
        "transactional write should not be visible outside the transaction",
      );

      await trx.abort();
      expect(await collection.documentExists("concurrent-in-trx")).to.equal(
        false,
      );
      expect(await collection.documentExists("concurrent-outside-trx")).to.equal(
        true,
        "non-transactional write should survive trx abort",
      );
    });

    it("aborts all saves from one async step", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      await trx.step(async () => {
        await collection.save({ _key: "abort-multi-a" });
        await collection.save({ _key: "abort-multi-b" });
      });
      expect(await trx.step(() => collection.documentExists("abort-multi-a"))).to
        .equal(true);
      expect(await trx.step(() => collection.documentExists("abort-multi-b"))).to
        .equal(true);
      await trx.abort();
      expect(await collection.documentExists("abort-multi-a")).to.equal(false);
      expect(await collection.documentExists("abort-multi-b")).to.equal(false);
    });

    it("can update a document inside a transaction", async () => {
      await collection.save({ _key: "update-me", value: 1 });
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      await trx.step(() => collection.update("update-me", { value: 2 }));
      const inTrx = await trx.step(() => collection.document("update-me"));
      expect(inTrx).to.have.property("value", 2);
      const outsideTrx = await collection.document("update-me");
      expect(outsideTrx).to.have.property("value", 1);
      await trx.commit();
      const committed = await collection.document("update-me");
      expect(committed).to.have.property("value", 2);
    });

    it("can remove a document inside a transaction", async () => {
      await collection.save({ _key: "remove-me" });
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      await trx.step(() => collection.remove("remove-me"));
      expect(
        await trx.step(() => collection.documentExists("remove-me")),
      ).to.equal(false);
      expect(await collection.documentExists("remove-me")).to.equal(true);
      await trx.commit();
      expect(await collection.documentExists("remove-me")).to.equal(false);
    });

    it("can run an AQL query inside a transaction step", async () => {
      await collection.save({ _key: "aql-doc", label: "hello" });
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const label = await trx.step(async () => {
        const cursor = await db.query(
          "FOR d IN @@col FILTER d._key == @key RETURN d.label",
          { "@col": collection.name, key: "aql-doc" },
        );
        return cursor.next();
      });
      expect(label).to.equal("hello");
      await trx.commit();
    });

    it("can use multiple collections in one transaction", async () => {
      const other = await db.createCollection(`other-${Date.now()}`);
      await db.waitForPropagation(
        { pathname: `/_api/collection/${other.name}` },
        propagationForResourceMs,
      );
      const trx = await db.beginTransaction([collection, other]);
      allTransactions.push(trx);
      await trx.step(() => collection.save({ _key: "multi-col-a" }));
      await trx.step(() => other.save({ _key: "multi-col-b" }));
      await trx.commit();
      expect(await collection.documentExists("multi-col-a")).to.equal(true);
      expect(await other.documentExists("multi-col-b")).to.equal(true);
      await other.drop();
    });

    it("lists a running transaction via listTransactions", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      try {
        const running = await db.listTransactions();
        expect(
          running.some(
            (t) => String(t.id) === String(trx.id) && t.state === "running",
          ),
        ).to.equal(true);
      } finally {
        await trx.commit();
      }
    });

    it("throws when step callback does not return a promise", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      try {
        await trx.step(
          (() => undefined) as unknown as () => Promise<unknown>,
        );
        expect.fail("Expected step to throw");
      } catch (e: any) {
        expect(String(e)).to.include("did not return a promise");
      }
      await trx.abort();
    });

    it("supports helper functions that receive step", async () => {
      async function saveViaStep(
        step: Transaction["step"],
        key: string,
        value: number,
      ) {
        await step(() => collection.save({ _key: key, value }));
      }

      await db.withTransaction(collection, async (step) => {
        await saveViaStep(step, "helper-a", 1);
        await saveViaStep(step, "helper-b", 2);
      });
      expect(await collection.document("helper-a")).to.have.property("value", 1);
      expect(await collection.document("helper-b")).to.have.property("value", 2);
    });
  });
});
