import { expect } from "chai";
import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";

describe("Bulk imports", function() {
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
