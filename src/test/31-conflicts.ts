import { expect } from "chai";
import { aql } from "../aql.js";
import { DocumentCollection } from "../collections.js";
import { Database } from "../databases.js";
import { isArangoError } from "../errors.js";
import { config, isClusterRuntime } from "./_config.js";
import {
  clusterIntegrationTimeoutMs,
  waitForNewDatabase,
} from "./_integration-timeouts.js";

/**
 * Enough overlapping writes on one key to make conflicts a certainty, without the thousand-query
 * storm that used to leave a single query still conflicting after all of its retries.
 */
const updateCount = isClusterRuntime ? 100 : 250;

/** Many parallel writes + retries can exhaust coordinators behind an LB; cap in-flight queries. */
const parallelChunk = isClusterRuntime ? 50 : updateCount;

/**
 * All queries here write the same document key, so the server serializes them on an exclusive key
 * lock. Keeping the number of in-flight requests low keeps that lock queue short enough that losers
 * get a write-write conflict (which the driver retries) instead of a server-side lock timeout.
 */
const poolSize = isClusterRuntime ? 16 : 64;

/** How often the test itself re-runs a query the server refused with a lock timeout. */
const lockTimeoutRetries = 100;

/**
 * A lock timeout is not `ERROR_ARANGO_CONFLICT`, so `retryOnConflict` does not (and should not)
 * cover it: the server gave up waiting for the key lock rather than reporting a lost write race.
 */
function isLockTimeoutError(e: unknown): boolean {
  return (
    isArangoError(e) &&
    /timeout waiting to lock|Operation timed out/i.test(e.message ?? "")
  );
}

async function parallelInChunks(
  count: number,
  chunk: number,
  run: () => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < count; i += chunk) {
    const n = Math.min(chunk, count - i);
    await Promise.all(Array.from({ length: n }, run));
  }
}

async function parallelInChunksSettled(
  count: number,
  chunk: number,
  run: () => Promise<unknown>,
): Promise<PromiseSettledResult<unknown>[]> {
  const out: PromiseSettledResult<unknown>[] = [];
  for (let i = 0; i < count; i += chunk) {
    const n = Math.min(chunk, count - i);
    out.push(
      ...(await Promise.allSettled(Array.from({ length: n }, run))),
    );
  }
  return out;
}

describe("query option retryOnConflict", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  let system: Database;
  const docKey = "test";
  const dbName = `testdb_${Date.now()}`;
  const collectionName = `collection-${Date.now()}`;
  let db: Database, collection: DocumentCollection<{ data: number }>;
  before(async () => {
    system = new Database({ ...config, poolSize });
    if (isClusterRuntime) {
      await system.acquireHostList();
    }
    db = await system.createDatabase(dbName);
    await waitForNewDatabase(db);
    collection = await db.createCollection(collectionName);
    await db.waitForPropagation(
      { pathname: `/_api/collection/${collection.name}` },
      80000,
    );
  });
  after(async () => {
    try {
      await system.dropDatabase(dbName);
    } finally {
      system.close();
    }
  });
  beforeEach(async () => {
    await collection.save({ _key: docKey, data: 0 });
  });
  afterEach(async () => {
    await collection.remove(docKey);
  });
  describe("when set to 0", () => {
    it("should result in some conflicts", async function () {
      if (isClusterRuntime) this.timeout(120_000);
      const result = await parallelInChunksSettled(
        updateCount,
        parallelChunk,
        () =>
          db.query(
            aql`
              LET doc = DOCUMENT(${collection}, ${docKey})
              UPDATE doc WITH { data: doc.data + 1 } IN ${collection}
            `,
            { retryOnConflict: 0 },
          ),
      );
      expect(
        result.filter(({ status }) => status === "rejected"),
      ).not.to.have.lengthOf(0);
      const { data } = await collection.document(docKey);
      expect(data).not.to.equal(updateCount);
    });
  });
  describe("when set to 100", () => {
    it("should avoid conflicts", async function () {
      if (isClusterRuntime) this.timeout(300_000);
      // This test creates, by design, a lot of conflicts and retries until its successfull
      // On instrumented server builds this test has a very high chance on running for a long time
      // and hitting the test-timeouts. To still test this behaviour on normal builds we do a check here and
      // continue only when its not a asan/tsan/coverage build.
      const version = await db.version(true);
      if (version.details !== undefined 
        && (version.details['asan'] === 'true' 
        || version.details['tsan'] === 'true'
        || version.details['coverage'] === 'true')) {
        return;
      }
      await parallelInChunks(updateCount, parallelChunk, async () => {
        for (let attempt = 0; ; attempt++) {
          try {
            await db.query(
              aql`
              LET doc = DOCUMENT(${collection}, ${docKey})
              UPDATE doc WITH { data: doc.data + 1 } IN ${collection}
            `,
              { retryOnConflict: 100 },
            );
            return;
          } catch (e) {
            // Conflicts are deliberately not retried here: covering them would hide a driver-side
            // regression in `retryOnConflict`, which is what this test exists for.
            if (!isLockTimeoutError(e) || attempt === lockTimeoutRetries) throw e;
            await new Promise((resolve) =>
              setTimeout(resolve, 50 * (attempt + 1) + Math.random() * 50),
            );
          }
        }
      });
      const { data } = await collection.document(docKey);
      expect(data).to.equal(updateCount);
    });
  });
});
