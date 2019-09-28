import { expect } from "chai";
import { Database } from "../arangojs";
import { GraphEdgeCollection } from "../graph";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);

describe("GraphEdgeCollection API", function() {
  const dbName = `testdb_${Date.now()}`;
  let db: Database;
  let collection: GraphEdgeCollection;
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
    collection = graph.edgeCollection("knows");
    await graph
      .vertexCollection("person")
      .import([
        { _key: "Alice" },
        { _key: "Bob" },
        { _key: "Charlie" },
        { _key: "Dave" },
        { _key: "Eve" }
      ]);
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
    await collection.truncate();
  });
  describe("edgeCollection.edge", () => {
    const data = { _from: "person/Bob", _to: "person/Alice" };
    let meta: any;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns an edge in the collection", async () => {
      const doc = await collection.edge(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._from).to.equal(data._from);
      expect(doc._to).to.equal(data._to);
    });
    it("does not throw on not found when graceful", async () => {
      const doc = await collection.edge("does-not-exist", true);
      expect(doc).to.equal(null);
    });
  });
  describe("edgeCollection.document", () => {
    const data = { _from: "person/Bob", _to: "person/Alice" };
    let meta: any;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns an edge in the collection", async () => {
      const doc = await collection.document(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._from).to.equal(data._from);
      expect(doc._to).to.equal(data._to);
    });
    it("does not throw on not found when graceful", async () => {
      const doc = await collection.document("does-not-exist", true);
      expect(doc).to.equal(null);
    });
  });
  describe("edgeCollection.save", () => {
    it("creates an edge in the collection", async () => {
      const data = { _from: "person/Bob", _to: "person/Alice" };
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
      const doc = await collection.edge(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._from).to.equal(data._from);
      expect(doc._to).to.equal(data._to);
    });
    it("uses the given _key if provided", async () => {
      const data = { _key: "banana", _from: "person/Bob", _to: "person/Alice" };
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
      const doc = await collection.edge(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
      expect(doc._id).to.equal(meta._id);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._key).to.equal(data._key);
      expect(doc._from).to.equal(data._from);
      expect(doc._to).to.equal(data._to);
    });
  });
  describe("edgeCollection.traversal", () => {
    beforeEach(async () => {
      await collection.import([
        { _from: "person/Alice", _to: "person/Bob" },
        { _from: "person/Bob", _to: "person/Charlie" },
        { _from: "person/Bob", _to: "person/Dave" },
        { _from: "person/Eve", _to: "person/Alice" },
        { _from: "person/Eve", _to: "person/Bob" }
      ]);
    });
    it("executes traversal", async () => {
      const result = await collection.traversal("person/Alice", {
        direction: "outbound"
      });
      expect(result).to.have.property("visited");
      const visited = result.visited;
      expect(visited).to.have.property("vertices");
      const vertices = visited.vertices;
      expect(vertices).to.be.instanceOf(Array);
      expect(vertices.length).to.equal(4);
      const names = vertices.map((d: any) => d._key);
      for (const name of ["Alice", "Bob", "Charlie", "Dave"]) {
        expect(names).to.contain(name);
      }
      expect(visited).to.have.property("paths");
      const paths = visited.paths;
      expect(paths).to.be.instanceOf(Array);
      expect(paths.length).to.equal(4);
    });
  });
  describe("edgeCollection.replace", () => {
    it("replaces the given edge", async () => {
      const doc = {
        potato: "tomato",
        _from: "person/Bob",
        _to: "person/Alice"
      };
      const meta = await collection.save(doc);
      delete meta.error;
      Object.assign(doc, meta);
      await collection.replace(doc as any, {
        sup: "dawg",
        _from: "person/Bob",
        _to: "person/Alice"
      });
      const data = await collection.edge((doc as any)._key);
      expect(data).not.to.have.property("potato");
      expect(data).to.have.property("sup", "dawg");
    });
  });
  describe("edgeCollection.update", () => {
    it("updates the given document", async () => {
      const doc = {
        potato: "tomato",
        empty: false,
        _from: "person/Bob",
        _to: "person/Alice"
      };
      const meta = await collection.save(doc);
      delete meta.error;
      Object.assign(doc, meta);
      await collection.update(doc as any, { sup: "dawg", empty: null });
      const data = await collection.edge((doc as any)._key);
      expect(data).to.have.property("potato", doc.potato);
      expect(data).to.have.property("sup", "dawg");
      expect(data).to.have.property("empty", null);
    });
    it("removes null values if keepNull is explicitly set to false", async () => {
      const doc = {
        potato: "tomato",
        empty: false,
        _from: "person/Bob",
        _to: "person/Alice"
      };
      const meta = await collection.save(doc);
      delete meta.error;
      Object.assign(doc, meta);
      await collection.update(
        doc as any,
        { sup: "dawg", empty: null },
        { keepNull: false }
      );
      const data = await collection.edge((doc as any)._key);
      expect(data).to.have.property("potato", doc.potato);
      expect(data).to.have.property("sup", "dawg");
      expect(data).not.to.have.property("empty");
    });
  });
  describe("edgeCollection.remove", () => {
    const key = `d_${Date.now()}`;
    beforeEach(async () => {
      await collection.save({
        _key: key,
        _from: "person/Bob",
        _to: "person/Alice"
      });
    });
    it("deletes the given edge", async () => {
      await collection.remove(key);
      try {
        await collection.edge(key);
      } catch (e) {
        return;
      }
      expect.fail();
    });
  });
});
