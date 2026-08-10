import { expect } from "chai";
import { Database } from "../databases.js";
import { FetchFailedError, isSystemError } from "../errors.js";

/**
 * Reproduces the error object undici throws when a connection is refused: a `TypeError` with the
 * underlying system error as its `cause`.
 *
 * The system error is deliberately built from an `Error` SUBCLASS, because that is the shape undici
 * produces — its prototype is not `Error.prototype` itself. That single detail is what previously made
 * `isSystemError` reject it, so a test using a plain `new Error()` would pass even without the fix.
 */
class UndiciSystemError extends Error {
  code = "ECONNREFUSED";
  errno = -111;
  syscall = "connect";
  address = "127.0.0.1";
  port = 8529;
}

function connectionRefused(): TypeError {
  const cause = new UndiciSystemError("connect ECONNREFUSED 127.0.0.1:8529");
  return Object.assign(new TypeError("fetch failed"), { cause });
}

/**
 * Replaces `globalThis.fetch` so the real host wrapper still runs and builds a real
 * `FetchFailedError` from the thrown `TypeError`, exercising the production path rather than a stub of
 * it. `createHost` captures `globalThis.fetch` when the host is created, so this must be installed
 * before the `Database` is constructed.
 */
function withFailingFetch(failures: number) {
  const original = globalThis.fetch;
  const state = {
    attempts: 0,
    restore: () => {
      globalThis.fetch = original;
    },
  };
  globalThis.fetch = (async () => {
    state.attempts += 1;
    if (state.attempts <= failures) throw connectionRefused();
    return new Response(JSON.stringify({ result: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  return state;
}

const REQUEST = {
  method: "POST",
  pathname: "/_api/cursor",
  body: { query: "RETURN 1" },
} as const;

describe("Retrying connection errors", () => {
  describe("isSystemError", () => {
    it("recognises a system error whose prototype is not Error.prototype", () => {
      const err = new UndiciSystemError("connect ECONNREFUSED 127.0.0.1:8529");
      // The condition that used to disqualify it.
      expect(Object.getPrototypeOf(err)).not.to.equal(Error.prototype);
      expect(isSystemError(err)).to.equal(true);
    });

    it("still rejects errors that only look similar", () => {
      expect(isSystemError(new TypeError("fetch failed"))).to.equal(false);
      expect(isSystemError(new Error("nope"))).to.equal(false);
      expect(
        isSystemError({
          code: "ECONNREFUSED",
          syscall: "connect",
          errno: -111,
        }),
      ).to.equal(false);
    });
  });

  describe("FetchFailedError", () => {
    it("is safe to retry when a refused connection is the root cause", () => {
      const err = new FetchFailedError(
        undefined,
        new Request("http://localhost:8529"),
        {
          cause: connectionRefused(),
        },
      );
      expect(err.isSafeToRetry).to.equal(true);
    });

    it("returns null rather than overflowing on a cyclic cause chain", () => {
      const loop: Error & { cause?: unknown } = new Error("loop");
      loop.cause = loop;
      const err = new FetchFailedError(
        undefined,
        new Request("http://localhost:8529"),
        {
          cause: loop as Error,
        },
      );
      expect(err.isSafeToRetry).to.equal(null);
    });
  });

  describe("retry behaviour", () => {
    it("retries a refused connection on the next host", async () => {
      const fetch = withFailingFetch(1);
      try {
        const db = new Database({
          url: ["http://localhost:8529", "http://localhost:8530"],
          databaseName: "_system",
        });
        await db.request(REQUEST);
        // One host failed, the request succeeded on the other.
        expect(fetch.attempts).to.equal(2);
      } finally {
        fetch.restore();
      }
    });

    it("honours maxRetries with a single host", async () => {
      const fetch = withFailingFetch(3);
      try {
        const db = new Database({
          url: "http://localhost:8529",
          databaseName: "_system",
          maxRetries: 3,
        });
        await db.request(REQUEST);
        expect(fetch.attempts).to.equal(4); // initial + 3 retries
      } finally {
        fetch.restore();
      }
    });

    it("makes a single attempt when maxRetries is false", async () => {
      const fetch = withFailingFetch(1);
      try {
        const db = new Database({
          url: ["http://localhost:8529", "http://localhost:8530"],
          databaseName: "_system",
          maxRetries: false,
        });
        await db.request(REQUEST).then(
          () => expect.fail("expected the request to reject"),
          (err) => expect(err).to.be.instanceOf(FetchFailedError),
        );
        expect(fetch.attempts).to.equal(1);
      } finally {
        fetch.restore();
      }
    });

    it("defaults to one attempt per host when maxRetries is unset", async () => {
      const fetch = withFailingFetch(99);
      try {
        const db = new Database({
          url: ["http://localhost:8529", "http://localhost:8530"],
          databaseName: "_system",
        });
        await db.request(REQUEST).catch(() => undefined);
        // Unchanged default: the budget is hosts.length - 1, so two attempts in total.
        expect(fetch.attempts).to.equal(2);
      } finally {
        fetch.restore();
      }
    });
  });
});
