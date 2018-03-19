import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";
import { expect } from "chai";

describe("Collection metadata", () => {
  let db: Database;
  let dbName = `testdb_${Date.now()}`;
  let collection: DocumentCollection;
  let collectionName = `collection-${Date.now()}`;
  before(done => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30000)
    });
    db.createDatabase(dbName).then(() => {
      db.useDatabase(dbName);
      collection = db.collection(collectionName);
      collection
        .create()
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
  describe("collection.get", () => {
    it("should return information about a collection", done => {
      collection
        .get()
        .then(info => {
          expect(info).to.have.property("name", collectionName);
          expect(info).to.have.property("isSystem", false);
          expect(info).to.have.property("status", 3); // loaded
          expect(info).to.have.property("type", 2); // document collection
        })
        .then(() => done())
        .catch(done);
    });
    it("should throw if collection does not exists", done => {
      db
        .collection("no")
        .get()
        .then(done)
        .catch(err => {
          expect(err).to.have.property("errorNum", 1203);
          done();
        });
    });
  });
  describe("collection.properties", () => {
    it("should return properties of a collection", done => {
      collection
        .properties()
        .then(properties => {
          expect(properties).to.have.property("name", collectionName);
          expect(properties).to.have.property("waitForSync", false);
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("collection.count", () => {
    it("should return information about a collection", done => {
      collection
        .count()
        .then(info => {
          expect(info).to.have.property("name", collectionName);
          expect(info).to.have.property("count", 0);
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("collection.revision", () => {
    it("should return information about a collection", done => {
      collection
        .revision()
        .then(info => {
          expect(info).to.have.property("name", collectionName);
          expect(info).to.have.property("revision");
        })
        .then(() => done())
        .catch(done);
    });
  });
});
