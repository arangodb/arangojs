import { expect } from "chai";
import { Database } from "../arangojs";
import { GraphEdgeCollection } from "../graph";

describe("GraphEdgeCollection API", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  const dbName = `testdb_${Date.now()}`;
  let db: Database;
  let collection: GraphEdgeCollection;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
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
  beforeEach(done => {
    collection
      .truncate()
      .then(() => done())
      .catch(done);
  });
  describe("edgeCollection.edge", () => {
    let data = { _from: "person/Bob", _to: "person/Alice" };
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
    let data = { _from: "person/Bob", _to: "person/Alice" };
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
    it("creates an edge in the collection", done => {
      let data = { _from: "person/Bob", _to: "person/Alice" };
      collection
        .save(data)
        .then(meta => {
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
          return collection.edge(meta._id).then(doc => {
            expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
            expect(doc._id).to.equal(meta._id);
            expect(doc._key).to.equal(meta._key);
            expect(doc._rev).to.equal(meta._rev);
            expect(doc._from).to.equal(data._from);
            expect(doc._to).to.equal(data._to);
          });
        })
        .then(() => void done())
        .catch(done);
    });
    it("uses the given _key if provided", done => {
      let data = { _key: "banana", _from: "person/Bob", _to: "person/Alice" };
      collection
        .save(data)
        .then(meta => {
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
          return collection.edge(meta._id).then(doc => {
            expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
            expect(doc._id).to.equal(meta._id);
            expect(doc._rev).to.equal(meta._rev);
            expect(doc._key).to.equal(data._key);
            expect(doc._from).to.equal(data._from);
            expect(doc._to).to.equal(data._to);
          });
        })
        .then(() => void done())
        .catch(done);
    });
  });
  describe("edgeCollection.traversal", () => {
    beforeEach(done => {
      collection
        .import([
          { _from: "person/Alice", _to: "person/Bob" },
          { _from: "person/Bob", _to: "person/Charlie" },
          { _from: "person/Bob", _to: "person/Dave" },
          { _from: "person/Eve", _to: "person/Alice" },
          { _from: "person/Eve", _to: "person/Bob" }
        ])
        .then(() => done())
        .catch(done);
    });
    it("executes traversal", done => {
      collection
        .traversal("person/Alice", { direction: "outbound" })
        .then((result: any) => {
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
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("edgeCollection.replace", () => {
    it("replaces the given edge", done => {
      const doc = {
        potato: "tomato",
        _from: "person/Bob",
        _to: "person/Alice"
      };
      collection
        .save(doc)
        .then(meta => {
          delete meta.error;
          Object.assign(doc, meta);
          return collection.replace(doc as any, {
            sup: "dawg",
            _from: "person/Bob",
            _to: "person/Alice"
          });
        })
        .then(() => collection.edge((doc as any)._key))
        .then(data => {
          expect(data).not.to.have.property("potato");
          expect(data).to.have.property("sup", "dawg");
          done();
        })
        .catch(done);
    });
  });
  describe("edgeCollection.update", () => {
    it("updates the given document", done => {
      let doc = {
        potato: "tomato",
        empty: false,
        _from: "person/Bob",
        _to: "person/Alice"
      };
      collection
        .save(doc)
        .then(meta => {
          delete meta.error;
          Object.assign(doc, meta);
          return collection.update(doc as any, { sup: "dawg", empty: null });
        })
        .then(() => collection.edge((doc as any)._key))
        .then(data => {
          expect(data).to.have.property("potato", doc.potato);
          expect(data).to.have.property("sup", "dawg");
          expect(data).to.have.property("empty", null);
          done();
        })
        .catch(done);
    });
    it("removes null values if keepNull is explicitly set to false", done => {
      let doc = {
        potato: "tomato",
        empty: false,
        _from: "person/Bob",
        _to: "person/Alice"
      };
      collection
        .save(doc)
        .then(meta => {
          delete meta.error;
          Object.assign(doc, meta);
          return collection.update(
            doc as any,
            { sup: "dawg", empty: null },
            { keepNull: false }
          );
        })
        .then(() => collection.edge((doc as any)._key))
        .then(data => {
          expect(data).to.have.property("potato", doc.potato);
          expect(data).to.have.property("sup", "dawg");
          expect(data).not.to.have.property("empty");
          done();
        })
        .catch(done);
    });
  });
  describe("edgeCollection.remove", () => {
    let key = `d_${Date.now()}`;
    beforeEach(done => {
      collection
        .save({ _key: key, _from: "person/Bob", _to: "person/Alice" })
        .then(() => void done())
        .catch(done);
    });
    it("deletes the given edge", done => {
      collection
        .remove(key)
        .then(() => collection.edge(key))
        .then(
          () => Promise.reject(new Error("Should not succeed")),
          () => void done()
        )
        .catch(done);
    });
  });
});
