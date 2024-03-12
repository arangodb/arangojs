import { expect } from "chai";
import { aql } from "../aql";
import { DocumentCollection } from "../collection";
import { Database } from "../database";
import { config } from "./_config";
const range = (n: number): number[] => Array.from(Array(n).keys());

describe("config.maxRetries", () => {
  let system: Database;
  const docKey = "test";
  const dbName = `testdb_${Date.now()}`;
  const collectionName = `collection-${Date.now()}`;
  let db: Database, collection: DocumentCollection<{ data: number }>;
  before(async () => {
    system = new Database({ ...config, agentOptions: { maxSockets: 1_000 } });
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") {
      await system.acquireHostList();
    }
    db = await system.createDatabase(dbName);
    collection = await db.createCollection(collectionName);
    await db.waitForPropagation(
      { path: `/_api/collection/${collection.name}` },
      10000
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
    it("should result in some conflicts", async () => {
      const result = await Promise.allSettled(
        range(1_000).map(() =>
          db.query(
            aql`
              LET doc = DOCUMENT(${collection}, ${docKey})
              UPDATE doc WITH { data: doc.data + 1 } IN ${collection}
            `,
            { retryOnConflict: 0 }
          )
        )
      );
      expect(
        result.filter(({ status }) => status === "rejected")
      ).not.to.have.lengthOf(0);
      const { data } = await collection.document(docKey);
      expect(data).not.to.equal(1_000);
    });
  });
  describe("when set to 100", () => {
    it("should avoid conflicts", async () => {
      await Promise.all(
        range(1_000).map(() =>
          db.query(
            aql`
              LET doc = DOCUMENT(${collection}, ${docKey})
              UPDATE doc WITH { data: doc.data + 1 } IN ${collection}
            `,
            { retryOnConflict: 100 }
          )
        )
      );
      const { data } = await collection.document(docKey);
      expect(data).to.equal(1_000);
    });
  });
});
