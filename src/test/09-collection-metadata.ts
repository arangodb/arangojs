import { expect } from "chai";
import { DocumentCollection } from "../collection";
import { Database } from "../database";
import { COLLECTION_NOT_FOUND } from "../lib/codes";
import { config } from "./_config";

describe("Collection metadata", function () {
  let db: Database;
  let collection: DocumentCollection;
  const dbName = `testdb_${Date.now()}`;
  const collectionName = `collection-${Date.now()}`;
  before(async () => {
    db = new Database(config);
    if (Array.isArray(config.url)) await db.acquireHostList();
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
    collection = await db.createCollection(collectionName);
    await db.waitForPropagation(
      { path: `/_api/collection/${collection.name}` },
      10000
    );
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
