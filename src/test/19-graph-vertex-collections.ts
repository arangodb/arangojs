import { expect } from "chai";
import { Database, GraphVertexCollection } from "../arangojs";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);

describe("GraphVertexCollection API", function() {
  const dbName = `testdb_${Date.now()}`;
  let db: Database;
  let collection: GraphVertexCollection;
  before(async () => {
    db = new Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
    const graph = db.graph(`testgraph_${Date.now()}`);
    await graph.create({
      edgeDefinitions: [
        {
          collection: "knows",
          from: ["person"],
          to: ["person"]
        }
      ]
    });
    collection = graph.vertexCollection("person");
  });
  after(async () => {
    try {
      db.useDatabase("_system");
      await db.dropDatabase(dbName);
    } finally {
      db.close();
    }
  });
  beforeEach(async () => {
    await collection.collection.truncate();
  });
  describe("graphVertexCollection.vertex", () => {
    const data = { foo: "bar" };
    let meta: any;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns a vertex in the collection", async () => {
      const doc = await collection.vertex(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc.foo).to.equal(data.foo);
    });
    it("does not throw on not found when graceful", async () => {
      const doc = await collection.vertex("does-not-exist", true);
      expect(doc).to.equal(null);
    });
  });
  describe("graphVertexCollection.vertex", () => {
    const data = { foo: "bar" };
    let meta: any;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns a vertex in the collection", async () => {
      const doc = await collection.vertex(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc.foo).to.equal(data.foo);
    });
    it("does not throw on not found when graceful", async () => {
      const doc = await collection.vertex("does-not-exist", true);
      expect(doc).to.equal(null);
    });
  });
  describe("graphVertexCollection.save", () => {
    it("creates a vertex in the collection", async () => {
      const data = { foo: "bar" };
      const meta = await collection.save(data);
      expect(meta).to.be.an("object");
      expect(meta)
        .to.have.property("_id")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_rev")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_key")
        .that.is.a("string");
      const doc = await collection.vertex(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc.foo).to.equal(data.foo);
    });
    it("uses the given _key if provided", async () => {
      const data = { potato: "tomato", _key: "banana" };
      const meta = await collection.save(data);
      expect(meta).to.be.an("object");
      expect(meta)
        .to.have.property("_id")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_rev")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_key")
        .that.equals(data._key);
      const doc = await collection.vertex(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "potato");
      expect(doc._id).to.equal(meta._id);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._key).to.equal(data._key);
      expect(doc.potato).to.equal(data.potato);
    });
  });
  describe("graphVertexCollection.replace", () => {
    it("replaces the given vertex", async () => {
      const data = { potato: "tomato" };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.replace(doc, { sup: "dawg" });
      const newData = await collection.vertex(doc._key);
      expect(newData).not.to.have.property("potato");
      expect(newData)
        .to.have.property("sup")
        .that.equals("dawg");
    });
  });
  describe("graphVertexCollection.update", () => {
    it("updates the given vertex", async () => {
      const data = { potato: "tomato", empty: false };
      const meta = await collection.save(data);
      const doc = meta.new!;
      await collection.update(doc, { sup: "dawg", empty: null });
      const newData = await collection.vertex(doc._key);
      expect(newData)
        .to.have.property("potato")
        .that.equals(doc.potato);
      expect(newData)
        .to.have.property("sup")
        .that.equals("dawg");
      expect(newData)
        .to.have.property("empty")
        .that.equals(null);
    });
    it("removes null values if keepNull is explicitly set to false", async () => {
      const data = { potato: "tomato", empty: false };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.update(
        doc,
        { sup: "dawg", empty: null },
        { keepNull: false }
      );
      const newData = await collection.vertex(doc._key);
      expect(newData)
        .to.have.property("potato")
        .that.equals(doc.potato);
      expect(newData)
        .to.have.property("sup")
        .that.equals("dawg");
      expect(newData).not.to.have.property("empty");
    });
  });
  describe("graphVertexCollection.remove", () => {
    const key = `d_${Date.now()}`;
    beforeEach(async () => {
      await collection.save({ _key: key });
    });
    it("deletes the given vertex", async () => {
      await collection.remove(key);
      try {
        await collection.vertex(key);
      } catch (e) {
        return;
      }
      expect.fail();
    });
  });
});
