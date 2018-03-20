import { Database } from "../arangojs";
import { GraphEdgeCollection } from "../graph";
import { expect } from "chai";

describe("GraphEdgeCollection API", () => {
  const dbName = `testdb_${Date.now()}`;
  let db: Database;
  let edge: GraphEdgeCollection;
  before(done => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30000)
    });
    db.createDatabase(dbName).then(() => {
      db.useDatabase(dbName);
      const graph = db.graph(`testgraph_${Date.now()}`);
      return graph
        .create({
          edgeDefinitions: [
            {
              collection: "knows",
              from: ["person"],
              to: ["person"]
            }
          ]
        })
        .then(() => {
          edge = graph.edgeCollection("knows");
          return graph
            .vertexCollection("person")
            .import([
              { _key: "Alice" },
              { _key: "Bob" },
              { _key: "Charlie" },
              { _key: "Dave" },
              { _key: "Eve" }
            ]);
        })
        .then(() => void done())
        .catch(done);
    });
  });
  after(done => {
    db.useDatabase("_system");
    db
      .dropDatabase(dbName)
      .then(() => void done())
      .catch(done);
  });
  beforeEach(done => {
    edge
      .truncate()
      .then(() => done())
      .catch(done);
  });
  describe("edgeCollection.edge", () => {
    let data = { _from: "person/Bob", _to: "person/Alice" };
    let meta: any;
    beforeEach(done => {
      edge
        .save(data)
        .then(result => {
          meta = result;
          done();
        })
        .catch(done);
    });
    it("returns an edge in the collection", done => {
      edge
        .edge(meta._id)
        .then(doc => {
          expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
          expect(doc._id).to.equal(meta._id);
          expect(doc._key).to.equal(meta._key);
          expect(doc._rev).to.equal(meta._rev);
          expect(doc._from).to.equal(data._from);
          expect(doc._to).to.equal(data._to);
        })
        .then(() => void done())
        .catch(done);
    });
  });
  describe("edgeCollection.save", () => {
    it("creates an edge in the collection", done => {
      let data = { _from: "person/Bob", _to: "person/Alice" };
      edge
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
          return edge.edge(meta._id).then(doc => {
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
      edge
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
          return edge.edge(meta._id).then(doc => {
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
      edge
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
      edge
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
      edge
        .save(doc)
        .then(meta => {
          delete meta.error;
          Object.assign(doc, meta);
          return edge.replace(doc as any, {
            sup: "dawg",
            _from: "person/Bob",
            _to: "person/Alice"
          });
        })
        .then(() => edge.edge((doc as any)._key))
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
      edge
        .save(doc)
        .then(meta => {
          delete meta.error;
          Object.assign(doc, meta);
          return edge.update(doc as any, { sup: "dawg", empty: null });
        })
        .then(() => edge.edge((doc as any)._key))
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
      edge
        .save(doc)
        .then(meta => {
          delete meta.error;
          Object.assign(doc, meta);
          return edge.update(
            doc as any,
            { sup: "dawg", empty: null },
            { keepNull: false }
          );
        })
        .then(() => edge.edge((doc as any)._key))
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
      edge
        .save({ _key: key, _from: "person/Bob", _to: "person/Alice" })
        .then(() => void done())
        .catch(done);
    });
    it("deletes the given edge", done => {
      edge
        .remove(key)
        .then(() => edge.edge(key))
        .then(
          () => Promise.reject(new Error("Should not succeed")),
          () => void done()
        )
        .catch(done);
    });
  });
});
