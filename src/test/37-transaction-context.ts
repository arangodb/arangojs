/**
 * Unit coverage for the internal asynchronous transaction context.
 *
 * Covered use cases:
 * - propagation and cleanup across asynchronous boundaries;
 * - concurrent, nested, and connection context isolation;
 * - callback rejection and validation;
 * - request header selection for scoped, suppressed, and legacy contexts.
 */
import { expect } from "chai";
import { Database } from "../databases.js";
import {
  getActiveTransactionId,
  runTransactionStep,
} from "../lib/transaction-context.js";
import { Transaction } from "../transactions.js";

describe("async transaction context", () => {
  const sleep = (millis: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, millis));

  it("propagates across async boundaries and is cleared afterwards", async () => {
    const connection = {};

    expect(getActiveTransactionId(connection)).to.equal(undefined);
    const result = await runTransactionStep(
      connection,
      "transaction-a",
      async () => {
        expect(getActiveTransactionId(connection)).to.equal("transaction-a");
        await sleep(1);
        expect(getActiveTransactionId(connection)).to.equal("transaction-a");
        return "result";
      },
    );

    expect(result).to.equal("result");
    expect(getActiveTransactionId(connection)).to.equal(undefined);
  });

  it("isolates concurrent contexts on the same connection", async () => {
    const connection = {};
    const observed: string[] = [];

    await Promise.all([
      runTransactionStep(connection, "transaction-a", async () => {
        await sleep(10);
        observed.push(getActiveTransactionId(connection)!);
      }),
      runTransactionStep(connection, "transaction-b", async () => {
        await sleep(1);
        observed.push(getActiveTransactionId(connection)!);
      }),
    ]);

    expect(observed).to.have.members(["transaction-a", "transaction-b"]);
    expect(getActiveTransactionId(connection)).to.equal(undefined);
  });

  it("restores the outer context after a nested context settles", async () => {
    const connection = {};

    await runTransactionStep(connection, "outer-transaction", async () => {
      expect(getActiveTransactionId(connection)).to.equal("outer-transaction");

      await runTransactionStep(connection, "inner-transaction", async () => {
        expect(getActiveTransactionId(connection)).to.equal(
          "inner-transaction",
        );
        await Promise.resolve();
        expect(getActiveTransactionId(connection)).to.equal(
          "inner-transaction",
        );
      });

      expect(getActiveTransactionId(connection)).to.equal("outer-transaction");
    });

    expect(getActiveTransactionId(connection)).to.equal(undefined);
  });

  it("does not expose a context to another connection", async () => {
    const connectionA = {};
    const connectionB = {};

    await runTransactionStep(connectionA, "transaction-a", async () => {
      expect(getActiveTransactionId(connectionA)).to.equal("transaction-a");
      expect(getActiveTransactionId(connectionB)).to.equal(undefined);
    });
  });

  it("clears the context when the callback rejects", async () => {
    const connection = {};
    let error: unknown;

    try {
      await runTransactionStep(connection, "transaction-a", async () => {
        throw new Error("deliberate failure");
      });
    } catch (e) {
      error = e;
    }

    expect(String(error)).to.include("deliberate failure");
    expect(getActiveTransactionId(connection)).to.equal(undefined);
  });

  it("rejects callbacks that do not return a promise", async () => {
    const connection = {};
    let error: unknown;

    try {
      await runTransactionStep(
        connection,
        "transaction-a",
        (() => undefined) as unknown as () => Promise<unknown>,
      );
    } catch (e) {
      error = e;
    }

    expect(String(error)).to.include("did not return a promise");
    expect(getActiveTransactionId(connection)).to.equal(undefined);
  });

  it("applies scoped headers only to the owning connection", async () => {
    const originalFetch = globalThis.fetch;
    const transactionIds: (string | null)[] = [];
    globalThis.fetch = async (request) => {
      transactionIds.push((request as Request).headers.get("x-arango-trx-id"));
      return new Response(JSON.stringify({ result: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const owner = new Database("http://owner.invalid");
    const other = new Database("http://other.invalid");
    const trx = new Transaction(owner, "transaction-a");

    try {
      await trx.stepAsync(async () => {
        await Promise.resolve();
        await owner.request({ pathname: "/test" });
        await other.request({ pathname: "/test" });
      });

      expect(transactionIds).to.deep.equal(["transaction-a", null]);
    } finally {
      owner.close();
      other.close();
      globalThis.fetch = originalFetch;
    }
  });

  it("suppresses the outer context for nested transaction lifecycle requests", async () => {
    const originalFetch = globalThis.fetch;
    const transactionIds: (string | null)[] = [];
    globalThis.fetch = async (request) => {
      transactionIds.push((request as Request).headers.get("x-arango-trx-id"));
      return new Response(
        JSON.stringify({
          result: { id: "transaction-b", status: "running" },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const db = new Database("http://owner.invalid");
    const outer = new Transaction(db, "transaction-a");

    try {
      await outer.stepAsync(async () => {
        const inner = await db.beginTransaction("example");
        await inner.get();
        await inner.commit();
        await inner.abort();
        await db.request({ pathname: "/transaction-operation" });
      });

      expect(transactionIds).to.deep.equal([
        null,
        null,
        null,
        null,
        "transaction-a",
      ]);
    } finally {
      db.close();
      globalThis.fetch = originalFetch;
    }
  });

  it("preserves legacy step behavior after an async boundary", async () => {
    const originalFetch = globalThis.fetch;
    const transactionIds: (string | null)[] = [];
    globalThis.fetch = async (request) => {
      transactionIds.push((request as Request).headers.get("x-arango-trx-id"));
      return new Response(JSON.stringify({ result: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const db = new Database("http://legacy.invalid");
    const trx = new Transaction(db, "legacy-transaction");

    try {
      await trx.step(async () => {
        await Promise.resolve();
        return db.request({ pathname: "/test" });
      });

      expect(transactionIds).to.deep.equal([null]);
    } finally {
      db.close();
      globalThis.fetch = originalFetch;
    }
  });
});
