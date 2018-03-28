import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";
import { expect } from "chai";

describe("Bulk imports", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

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
      return collection
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
  beforeEach(done => {
    collection
      .truncate()
      .then(() => done())
      .catch(done);
  });
  describe("collection.import", () => {
    it("should import new documents", done => {
      const data = [{}, {}, {}];
      collection
        .import(data)
        .then(info => {
          expect(info).to.have.property("created", data.length);
          expect(info).to.have.property("updated", 0);
          expect(info).to.have.property("ignored", 0);
          expect(info).to.have.property("empty", 0);
        })
        .then(() => done())
        .catch(done);
    });
  });
});
