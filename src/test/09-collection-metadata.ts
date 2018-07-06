import { expect } from "chai";
import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";

describe("Collection metadata", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let db: Database;
  let dbName = `testdb_${Date.now()}`;
  let collection: DocumentCollection;
  let collectionName = `collection-${Date.now()}`;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
    collection = db.collection(collectionName);
    await collection.create();
  });
  after(async () => {
    db.useDatabase("_system");
    await db.dropDatabase(dbName);
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
      db.collection("no")
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
