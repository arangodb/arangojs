import { expect } from "chai";
import { Database } from "../arangojs";
import { COLLECTION_NOT_FOUND, DocumentCollection } from "../collection";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);

describe("Collection metadata", function() {
  let db: Database;
  let collection: DocumentCollection;
  const dbName = `testdb_${Date.now()}`;
  const collectionName = `collection-${Date.now()}`;
  before(async () => {
    db = new Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
    collection = db.collection(collectionName);
    await collection.create();
  });
  after(async () => {
    db.useDatabase("_system");
    await db.dropDatabase(dbName);
  });
  describe("collection.get", () => {
    it("should return information about a collection", async () => {
      const info = await collection.get();
      expect(info).to.have.property("name", collectionName);
      expect(info).to.have.property("isSystem", false);
      expect(info).to.have.property("status", 3); // loaded
      expect(info).to.have.property("type", 2); // document collection
    });
    it("should throw if collection does not exist", async () => {
      try {
        await db.collection("no").get();
      } catch (e) {
        expect(e).to.have.property("errorNum", COLLECTION_NOT_FOUND);
        return;
      }
      expect.fail("should throw");
    });
  });
  describe("collection.exists", () => {
    it("should return true if collection exists", async () => {
      const exists = await collection.exists();
      expect(exists).to.equal(true);
    });
    it("should return false if collection does not exist", async () => {
      const exists = await db.collection("no").exists();
      expect(exists).to.equal(false);
    });
  });
  describe("collection.properties", () => {
    it("should return properties of a collection", async () => {
      const properties = await collection.properties();
      expect(properties).to.have.property("name", collectionName);
      expect(properties).to.have.property("waitForSync", false);
    });
  });
  describe("collection.count", () => {
    it("should return information about a collection", async () => {
      const info = await collection.count();
      expect(info).to.have.property("name", collectionName);
      expect(info).to.have.property("count", 0);
    });
  });
  describe("collection.revision", () => {
    it("should return information about a collection", async () => {
      const info = await collection.revision();
      expect(info).to.have.property("name", collectionName);
      expect(info).to.have.property("revision");
    });
  });
});
