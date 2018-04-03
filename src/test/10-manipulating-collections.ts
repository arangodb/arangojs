import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";
import { expect } from "chai";

const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30000);

describe("Manipulating collections", function() {
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
    collection = db.collection(`collection-${Date.now()}`);
    collection
      .create()
      .then(() => void done())
      .catch(done);
  });
  afterEach(done => {
    collection
      .get()
      .then(() => {
        collection
          .drop()
          .then(() => void done())
          .catch(done);
      })
      .catch(() => void done());
  });
  describe("collection.create", () => {
    it("creates a new document collection", done => {
      const collection = db.collection(`document-collection-${Date.now()}`);
      collection
        .create()
        .then(() => {
          return db
            .collection(collection.name)
            .get()
            .then(info => {
              expect(info).to.have.property("name", collection.name);
              expect(info).to.have.property("isSystem", false);
              expect(info).to.have.property("status", 3); // loaded
              expect(info).to.have.property("type", 2); // document collection
            });
        })
        .then(() => void done())
        .catch(done);
    });
    it("creates a new edge collection", done => {
      const collection = db.edgeCollection(`edge-collection-${Date.now()}`);
      collection
        .create()
        .then(() => {
          return db
            .collection(collection.name)
            .get()
            .then(info => {
              expect(info).to.have.property("name", collection.name);
              expect(info).to.have.property("isSystem", false);
              expect(info).to.have.property("status", 3); // loaded
              expect(info).to.have.property("type", 3); // edge collection
            });
        })
        .then(() => void done())
        .catch(done);
    });
  });
  describe("collection.load", () => {
    it("should load a collection", done => {
      collection
        .load()
        .then(info => {
          expect(info).to.have.property("name", collection.name);
          expect(info).to.have.property("status", 3); // loaded
        })
        .then(() => void done())
        .catch(done);
    });
  });
  describe("collection.unload", () => {
    it("should unload a collection", done => {
      collection
        .unload()
        .then(info => {
          expect(info).to.have.property("name", collection.name);
          expect(info).to.have.property("status");
          expect(info.status === 2 || info.status === 4).to.be.true; // unloaded
        })
        .then(() => void done())
        .catch(done);
    });
  });
  describe("collection.setProperties", () => {
    it("should change properties", done => {
      collection
        .setProperties({ waitForSync: true })
        .then(info => {
          expect(info).to.have.property("name", collection.name);
          expect(info).to.have.property("waitForSync", true);
        })
        .then(() => void done())
        .catch(done);
    });
  });
  describe("collection.rename", () => {
    it("should rename a collection", done => {
      db
        .route("/_admin/server/role")
        .get()
        .then(res => {
          if (res.body.role !== "SINGLE") return;
          const name = `rename-collection-${Date.now()}`;
          return collection.rename(name).then(info => {
            expect(info).to.have.property("name", name);
          });
        })
        .then(() => void done())
        .catch(done);
    });
  });
  describe("collection.truncate", () => {
    it("should truncate a non-empty collection", done => {
      collection.save({}).then(() => {
        return collection
          .truncate()
          .then(() => {
            collection.count().then(info => {
              expect(info).to.have.property("name", collection.name);
              expect(info).to.have.property("count", 0);
            });
          })
          .then(() => void done())
          .catch(done);
      });
    });
    it("should allow truncating a empty collection", done => {
      collection.truncate().then(() => {
        return collection
          .count()
          .then(info => {
            expect(info).to.have.property("name", collection.name);
            expect(info).to.have.property("count", 0);
          })
          .then(() => void done())
          .catch(done);
      });
    });
  });
  describe("collection.drop", () => {
    it("should drop a collection", done => {
      collection.drop().then(() => {
        return collection
          .get()
          .then(done)
          .catch(err => {
            expect(err).to.have.property("errorNum", 1203);
            void done();
          });
      });
    });
  });
});
