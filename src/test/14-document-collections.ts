import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";
import { expect } from "chai";

const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30000);
const it3x = ARANGO_VERSION >= 30000 ? it : it.skip;

describe("DocumentCollection API", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let name = `testdb_${Date.now()}`;
  let db: Database;
  let collection: DocumentCollection;
  before(done => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: ARANGO_VERSION
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
    collection = db.collection(`c_${Date.now()}`);
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
  describe("documentCollection.document", () => {
    it("is missing tests");
  });
  describe("documentCollection.save", () => {
    it("creates a document in the collection", done => {
      let data = { foo: "bar" };
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
          return collection.document(meta._id).then(doc => {
            expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
            expect(doc._id).to.equal(meta._id);
            expect(doc._key).to.equal(meta._key);
            expect(doc._rev).to.equal(meta._rev);
            expect(doc.foo).to.equal(data.foo);
          });
        })
        .then(() => void done())
        .catch(done);
    });
    it("uses the given _key if provided", done => {
      let data = { potato: "tomato", _key: "banana" };
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
          return collection.document(meta._id).then(doc => {
            expect(doc).to.have.keys("_key", "_id", "_rev", "potato");
            expect(doc._id).to.equal(meta._id);
            expect(doc._rev).to.equal(meta._rev);
            expect(doc._key).to.equal(data._key);
            expect(doc.potato).to.equal(data.potato);
          });
        })
        .then(() => void done())
        .catch(done);
    });
    it3x("returns the document if opts.returnNew is set", done => {
      let data = { potato: "tomato" };
      let opts = { returnNew: true };
      collection
        .save(data, opts)
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
          expect(meta.new).to.be.an("object");
          expect(meta.new)
            .to.have.property("_id")
            .that.is.a("string");
          expect(meta.new)
            .to.have.property("_rev")
            .that.is.a("string");
          expect(meta.new)
            .to.have.property("_key")
            .that.is.a("string");
          expect(meta.new.potato).to.equal(data.potato);
        })
        .then(() => void done())
        .catch(done);
    });
    it3x("interprets opts as returnNew if it is a boolean", done => {
      let data = { potato: "tomato" };
      let opts = true;
      collection
        .save(data, opts)
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
          expect(meta.new).to.be.an("object");
          expect(meta.new)
            .to.have.property("_id")
            .that.is.a("string");
          expect(meta.new)
            .to.have.property("_rev")
            .that.is.a("string");
          expect(meta.new)
            .to.have.property("_key")
            .that.is.a("string");
          expect(meta.new.potato).to.equal(data.potato);
        })
        .then(() => void done())
        .catch(done);
    });
  });
  describe("documentCollection.replace", () => {
    it("replaces the given document", done => {
      let doc = { potato: "tomato" };
      collection
        .save(doc)
        .then(meta => {
          delete meta.error;
          Object.assign(doc, meta);
          return collection.replace(doc as any, { sup: "dawg" });
        })
        .then(() => collection.document((doc as any)._key))
        .then(data => {
          expect(data).not.to.have.property("potato");
          expect(data)
            .to.have.property("sup")
            .that.equals("dawg");
          done();
        })
        .catch(done);
    });
  });
  describe("documentCollection.update", () => {
    it("updates the given document", done => {
      let doc = { potato: "tomato", empty: false };
      collection
        .save(doc)
        .then(meta => {
          delete meta.error;
          Object.assign(doc, meta);
          return collection.update(doc as any, { sup: "dawg", empty: null });
        })
        .then(() => collection.document((doc as any)._key))
        .then(data => {
          expect(data)
            .to.have.property("potato")
            .that.equals(doc.potato);
          expect(data)
            .to.have.property("sup")
            .that.equals("dawg");
          expect(data)
            .to.have.property("empty")
            .that.equals(null);
          done();
        })
        .catch(done);
    });
    it("removes null values if keepNull is explicitly set to false", done => {
      let doc = { potato: "tomato", empty: false };
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
        .then(() => collection.document((doc as any)._key))
        .then(data => {
          expect(data)
            .to.have.property("potato")
            .that.equals(doc.potato);
          expect(data)
            .to.have.property("sup")
            .that.equals("dawg");
          expect(data).not.to.have.property("empty");
          done();
        })
        .catch(done);
    });
  });
  describe("documentCollection.remove", () => {
    let key = `d_${Date.now()}`;
    beforeEach(done => {
      collection
        .save({ _key: key })
        .then(() => void done())
        .catch(done);
    });
    it("deletes the given document", done => {
      collection
        .remove(key)
        .then(() => collection.document(key))
        .then(
          () => Promise.reject(new Error("Should not succeed")),
          () => void done()
        )
        .catch(done);
    });
  });
  describe("documentCollection.list", () => {
    it("is missing tests");
  });
});
