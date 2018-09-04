import { expect } from "chai";
import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";

const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30400);
const itPre34 = ARANGO_VERSION < 30400 ? it : it.skip;
const it34 = ARANGO_VERSION >= 30400 ? it : it.skip;

describe("Managing indexes", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let db: Database;
  let collection: DocumentCollection;
  const dbName = `testdb_${Date.now()}`;
  const collectionName = `collection-${Date.now()}`;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: ARANGO_VERSION
    });
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
    collection = db.collection(collectionName);
    await collection.create();
  });
  after(async () => {
    try {
      db.useDatabase("_system");
      await db.dropDatabase(dbName);
    } finally {
      db.close();
    }
  });
  describe("collection.createIndex", () => {
    it("should create a index of given type", async () => {
      const info = await collection.createIndex({
        type: "hash",
        fields: ["value0"]
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "hash");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value0"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.createHashIndex", () => {
    it("should create a hash index", async () => {
      const info = await collection.createHashIndex(["value"]);
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "hash");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.createSkipList", () => {
    it("should create a skiplist index", async () => {
      const info = await collection.createSkipList(["value"]);
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "skiplist");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.createPersistentIndex", () => {
    it("should create a persistent index", async () => {
      const info = await collection.createPersistentIndex(["value"]);
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "persistent");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.createGeoIndex", () => {
    itPre34("should create a geo1 index for one field", async () => {
      const info = await collection.createGeoIndex(["value"]);
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "geo1");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
    itPre34("should create a geo2 index for two fields", async () => {
      const info = await collection.createGeoIndex(["value1", "value2"]);
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "geo2");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value1", "value2"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
    it34("should create a geo index for one field", async () => {
      const info = await collection.createGeoIndex(["value"]);
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "geo");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
    it34("should create a geo index for two fields", async () => {
      const info = await collection.createGeoIndex(["value1", "value2"]);
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "geo");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value1", "value2"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.createFulltextIndex", () => {
    it("should create a fulltext index", async () => {
      const info = await collection.createFulltextIndex(["value"]);
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "fulltext");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.index", () => {
    it("should return information about a index", async () => {
      const info = await collection.createHashIndex(["test"]);
      const index = await collection.index(info.id);
      expect(index).to.have.property("id", info.id);
      expect(index).to.have.property("type", info.type);
    });
  });
  describe("collection.indexes", () => {
    it("should return a list of indexes", async () => {
      const index = await collection.createHashIndex(["test"]);
      const indexes = await collection.indexes();
      expect(indexes).to.be.instanceof(Array);
      expect(indexes).to.not.be.empty;
      expect(indexes.filter((i: any) => i.id === index.id).length).to.equal(1);
    });
  });
  describe("collection.dropIndex", () => {
    it("should drop existing index", async () => {
      const info = await collection.createHashIndex(["test"]);
      const index = await collection.dropIndex(info.id);
      expect(index).to.have.property("id", info.id);
      const indexes = await collection.indexes();
      expect(indexes).to.be.instanceof(Array);
      expect(indexes).to.not.be.empty;
      expect(indexes.filter((i: any) => i.id === index.id).length).to.equal(0);
    });
  });
});
