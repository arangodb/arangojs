import { expect } from "chai";
import { DocumentCollection } from "../collections.js";
import { Database } from "../databases.js";
import { config } from "./_config.js";

const it312 = config.arangoVersion! >= 31200 ? it : it.skip;

describe("Managing indexes", function () {
  let system: Database, db: Database;
  let collection: DocumentCollection;
  const dbName = `testdb_${Date.now()}`;
  const collectionName = `collection-${Date.now()}`;
  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
    await system.createDatabase(dbName);
    db = system.database(dbName);
    collection = await db.createCollection(collectionName);
    await db.waitForPropagation(
      { pathname: `/_api/collection/${collection.name}` },
      10000,
    );
  });
  after(async () => {
    try {
      await system.dropDatabase(dbName);
    } finally {
      system.close();
    }
  });
  describe("collection.ensureIndex#vector", () => {
    it.skip("should create a vector index", async () => {
      // Available in ArangoDB 3.12.4+.
      // Only enabled with the --experimental-vector-index startup option.
      const data = Array.from({ length: 128 }, (_, cnt) => ({
        _key: `vec${cnt}`,
        embedding: Array(128).fill(cnt),
      }));
      await collection.import(data);
      const info = await collection.ensureIndex({
        type: "vector",
        fields: ["embedding"],
        params: {
          metric: "cosine",
          dimension: 128,
          nLists: 2,
        },
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "vector");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["embedding"]);
      expect(info).to.have.property("isNewlyCreated", true);
      expect(info).to.have.nested.property("params.metric", "cosine");
      expect(info).to.have.nested.property("params.dimension", 128);
      expect(info).to.have.nested.property("params.nLists", 2);
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
    it("should create a geo index for one field", async () => {
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
    it("should create a geo index for two fields", async () => {
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
  describe("collection.ensureIndex#mdi", () => {
    it312("should create an MDI index", async () => {
      const info = await collection.ensureIndex({
        type: "mdi",
        fields: ["x", "y", "z"],
        fieldValueTypes: "double",
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "mdi");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["x", "y", "z"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.index", () => {
    it("should return information about a index", async () => {
      const info = await collection.ensureIndex({
        type: "persistent",
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
        type: "persistent",
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
        type: "persistent",
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
