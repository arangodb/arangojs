import { afterEach, beforeEach, describe, it } from "mocha";

import ArangoError from "../src/error";
import { Database } from "../src";
import { expect } from "chai";

const range = n => Array.from(Array(n).keys());

describe("Manipulating databases", () => {
  let db;
  beforeEach(() => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://root:@localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30000)
    });
  });
  describe("database.useDatabase", () => {
    it("updates the database name", () => {
      const name = "example";
      expect(db.name).to.equal("_system"); // default
      db.useDatabase(name);
      expect(db._connection.config).to.have.a.property("databaseName", name);
      expect(db.name).to.equal(name);
    });
    it("returns itself", () => {
      const db2 = db.useDatabase("nope");
      expect(db).to.equal(db2);
    });
  });
  describe("database.createDatabase", () => {
    let name = `testdb_${Date.now()}`;
    afterEach(done => {
      db.useDatabase("_system");
      db
        .dropDatabase(name)
        .then(() => void done())
        .catch(done);
    });
    it("creates a database with the given name", done => {
      db
        .createDatabase(name)
        .then(() => {
          db.useDatabase(name);
          return db.get();
        })
        .then(info => {
          expect(info.name).to.equal(name);
          done();
        })
        .catch(done);
    });
    it("adds the given users to the database");
  });
  describe("database.get", () => {
    it("fetches the database description if the database exists", done => {
      db
        .get()
        .then(info => {
          expect(info.name).to.equal(db.name);
          expect(db.name).to.equal("_system");
          done();
        })
        .catch(done);
    });
    it("fails if the database does not exist", done => {
      db.useDatabase("__does_not_exist__");
      db
        .get()
        .then(
          () => Promise.reject(new Error("Should not succeed")),
          err => {
            expect(err).to.be.an.instanceof(ArangoError);
            done();
          }
        )
        .catch(done);
    });
  });
  describe("database.listDatabases", () => {
    it("returns a list of all databases", done => {
      db
        .listDatabases()
        .then(databases => {
          expect(databases).to.be.an.instanceof(Array);
          expect(databases.indexOf("_system")).to.be.greaterThan(-1);
          done();
        })
        .catch(done);
    });
  });
  describe("database.listUserDatabases", () => {
    it("returns a list of databases accessible to the active user");
  });
  describe("database.dropDatabase", () => {
    let name = `testdb_${Date.now()}`;
    beforeEach(done => {
      db
        .createDatabase(name)
        .then(() => void done())
        .catch(done);
    });
    it("deletes the given database from the server", done => {
      db
        .dropDatabase(name)
        .then(() => new Database({ databaseName: name }).get())
        .then(() => Promise.reject(new Error("Should not succeed")), () => null)
        .then(() => void done())
        .catch(done);
    });
  });
  describe("database.truncate", () => {
    let name = `testdb_${Date.now()}`;
    let nonSystemCollections = range(4).map(i => `c_${Date.now()}_${i}`);
    let systemCollections = range(4).map(i => `_c_${Date.now()}_${i}`);
    beforeEach(done => {
      db
        .createDatabase(name)
        .then(() => {
          db.useDatabase(name);
          return Promise.all([
            ...nonSystemCollections.map(name => {
              let collection = db.collection(name);
              return collection
                .create()
                .then(() => collection.save({ _key: "example" }));
            }),
            ...systemCollections.map(name => {
              let collection = db.collection(name);
              return collection
                .create({ isSystem: true })
                .then(() => collection.save({ _key: "example" }));
            })
          ]);
        })
        .then(() => void done())
        .catch(done);
    });
    afterEach(done => {
      db.useDatabase("_system");
      db
        .dropDatabase(name)
        .then(() => void done())
        .catch(done);
    });
    it("removes all documents from all non-system collections in the database", done => {
      db
        .truncate()
        .then(() => {
          return Promise.all([
            ...nonSystemCollections.map(name =>
              db
                .collection(name)
                .document("example")
                .then(
                  doc =>
                    Promise.reject(
                      new Error(`Expected document to be destroyed: ${doc._id}`)
                    ),
                  err => expect(err).to.be.an.instanceof(ArangoError)
                )
            ),
            ...systemCollections.map(name =>
              db.collection(name).document("example")
            )
          ]);
        })
        .then(() => void done())
        .catch(done);
    });
    it("additionally truncates system collections if explicitly passed false", done => {
      db
        .truncate(false)
        .then(() => {
          return Promise.all(
            nonSystemCollections.map(name =>
              db
                .collection(name)
                .document("example")
                .then(
                  doc =>
                    Promise.reject(
                      new Error(`Expected document to be destroyed: ${doc._id}`)
                    ),
                  err => expect(err).to.be.an.instanceof(ArangoError)
                )
            )
          );
        })
        .then(() => void done())
        .catch(done);
    });
  });
});
