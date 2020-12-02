import { expect } from "chai";
import { DocumentCollection } from "../collection";
import { Database } from "../database";
import { config } from "./_config";

const itPre34 = config.arangoVersion! < 30400 ? it : it.skip;
const it34 = config.arangoVersion! >= 30400 ? it : it.skip;

describe("Managing indexes", function () {
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
    try {
      db.useDatabase("_system");
      await db.dropDatabase(dbName);
    } finally {
      db.close();
    }
  });
  describe("collection.ensureIndex#hash", () => {
    it("should create a hash index", async () => {
      const info = await collection.ensureIndex({
        type: "hash",
        fields: ["value"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "hash");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.ensureIndex#skiplist", () => {
    it("should create a skiplist index", async () => {
      const info = await collection.ensureIndex({
        type: "skiplist",
        fields: ["value"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "skiplist");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.ensureIndex#persistent", () => {
    it("should create a persistent index", async () => {
      const info = await collection.ensureIndex({
        type: "persistent",
        fields: ["value"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "persistent");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.ensureIndex#geo", () => {
    itPre34("should create a geo1 index for one field", async () => {
      const info = await collection.ensureIndex({
        type: "geo",
        fields: ["value"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "geo1");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
    itPre34("should create a geo2 index for two fields", async () => {
      const info = await collection.ensureIndex({
        type: "geo",
        fields: ["value1", "value2"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "geo2");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value1", "value2"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
    it34("should create a geo index for one field", async () => {
      const info = await collection.ensureIndex({
        type: "geo",
        fields: ["value"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "geo");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
    it34("should create a geo index for two fields", async () => {
      const info = await collection.ensureIndex({
        type: "geo",
        fields: ["value1", "value2"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "geo");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value1", "value2"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.ensureIndex#fulltext", () => {
    it("should create a fulltext index", async () => {
      const info = await collection.ensureIndex({
        type: "fulltext",
        fields: ["value"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "fulltext");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.index", () => {
    it("should return information about a index", async () => {
      const info = await collection.ensureIndex({
        type: "hash",
        fields: ["test"],
      });
      const index = await collection.index(info.id);
      expect(index).to.have.property("id", info.id);
      expect(index).to.have.property("type", info.type);
    });
  });
  describe("collection.indexes", () => {
    it("should return a list of indexes", async () => {
      const index = await collection.ensureIndex({
        type: "hash",
        fields: ["test"],
      });
      const indexes = await collection.indexes();
      expect(indexes).to.be.instanceof(Array);
      expect(indexes).to.not.be.empty;
      expect(indexes.filter((i: any) => i.id === index.id).length).to.equal(1);
    });
  });
  describe("collection.dropIndex", () => {
    it("should drop existing index", async () => {
      const info = await collection.ensureIndex({
        type: "hash",
        fields: ["test"],
      });
      const index = await collection.dropIndex(info.id);
      expect(index).to.have.property("id", info.id);
      const indexes = await collection.indexes();
      expect(indexes).to.be.instanceof(Array);
      expect(indexes).to.not.be.empty;
      expect(indexes.filter((i: any) => i.id === index.id).length).to.equal(0);
    });
  });
});
