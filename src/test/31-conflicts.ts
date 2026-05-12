import { expect } from "chai";
import { aql } from "../aql.js";
import { DocumentCollection } from "../collections.js";
import { Database } from "../databases.js";
import { config } from "./_config.js";
import {
  clusterIntegrationTimeoutMs,
  waitForNewDatabase,
} from "./_integration-timeouts.js";

/** Many parallel writes + retries can exhaust coordinators behind an LB; cap in-flight queries. */
const clusterLbParallelChunk =
  Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE"
    ? 100
    : 1_000;

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

describe("config.maxRetries", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  let system: Database;
  const docKey = "test";
  const dbName = `testdb_${Date.now()}`;
  const collectionName = `collection-${Date.now()}`;
  let db: Database, collection: DocumentCollection<{ data: number }>;
  before(async () => {
    system = new Database({ ...config, poolSize: 1_000 });
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") {
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
      if (clusterLbParallelChunk < 1_000) this.timeout(120_000);
      const result = await parallelInChunksSettled(
        1_000,
        clusterLbParallelChunk,
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
      expect(data).not.to.equal(1_000);
    });
  });
  describe("when set to 100", () => {
    it("should avoid conflicts", async function () {
      if (clusterLbParallelChunk < 1_000) this.timeout(300_000);
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
      await parallelInChunks(1_000, clusterLbParallelChunk, () =>
        db.query(
          aql`
              LET doc = DOCUMENT(${collection}, ${docKey})
              UPDATE doc WITH { data: doc.data + 1 } IN ${collection}
            `,
          { retryOnConflict: 100 },
        ),
      );
      const { data } = await collection.document(docKey);
      expect(data).to.equal(1_000);
    });
  });
});
