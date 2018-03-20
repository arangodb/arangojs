import { Database } from "../arangojs";
import { EdgeCollection } from "../collection";
import { expect } from "chai";

describe("EdgeCollection API", () => {
  let name = `testdb_${Date.now()}`;
  let db: Database;
  let collection: EdgeCollection;
  before(done => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30000)
    });
    db
      .createDatabase(name)
      .then(() => {
        db.useDatabase(name);
        done();
      })
      .catch(done);
  });
  after(done => {
    db.useDatabase("_system");
    db
      .dropDatabase(name)
      .then(() => void done())
      .catch(done);
  });
  beforeEach(done => {
    collection = db.edgeCollection(`c_${Date.now()}`);
    collection
      .create()
      .then(() => void done())
      .catch(done);
  });
  afterEach(done => {
    collection
      .drop()
      .then(() => void done())
      .catch(done);
  });

  describe("edgeCollection.edge", () => {
    let data = { _from: "d/1", _to: "d/2" };
    let meta: any;
    beforeEach(done => {
      collection
        .save(data)
        .then(result => {
          meta = result;
          done();
        })
        .catch(done);
    });
    it("returns an edge in the collection", done => {
      collection
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
      let data = { _from: "d/1", _to: "d/2" };
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
      let data = { _key: "banana", _from: "d/1", _to: "d/2" };
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
    let knows: any;
    beforeEach(done => {
      knows = db.edgeCollection("knows");
      const person = db.collection("person");
      Promise.all([person.create(), knows.create()])
        .then(() =>
          Promise.all([
            person.import([
              { _key: "Alice" },
              { _key: "Bob" },
              { _key: "Charlie" },
              { _key: "Dave" },
              { _key: "Eve" }
            ]),
            knows.import([
              { _from: "person/Alice", _to: "person/Bob" },
              { _from: "person/Bob", _to: "person/Charlie" },
              { _from: "person/Bob", _to: "person/Dave" },
              { _from: "person/Eve", _to: "person/Alice" },
              { _from: "person/Eve", _to: "person/Bob" }
            ])
          ])
        )
        .then(() => done())
        .catch(done);
    });
    it("executes traversal", done => {
      knows
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
      const doc = { potato: "tomato", _from: "d/1", _to: "d/2" };
      collection
        .save(doc)
        .then(meta => {
          delete meta.error;
          Object.assign(doc, meta);
          return collection.replace(doc as any, {
            sup: "dawg",
            _from: "d/1",
            _to: "d/2"
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
      let doc = { potato: "tomato", empty: false, _from: "d/1", _to: "d/2" };
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
      let doc = { potato: "tomato", empty: false, _from: "d/1", _to: "d/2" };
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
        .save({ _key: key, _from: "d/1", _to: "d/2" })
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
