import { expect } from "chai";
import { Database } from "../arangojs";
import { ArangoError } from "../error";

const range = (n: number): number[] => Array.from(Array(n).keys());

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);
const it2x = ARANGO_VERSION < 30000 ? it : it.skip;

describe("Manipulating databases", function() {
  let db: Database;
  beforeEach(() => {
    db = new Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
  });
  afterEach(() => {
    db.close();
  });
  describe("database.useDatabase", () => {
    it("updates the database name", () => {
      const name = "example";
      expect(db.name).to.equal("_system"); // default
      db.useDatabase(name);
      expect((db as any)._connection).to.have.property("_databaseName", name);
      expect(db.name).to.equal(name);
    });
    it("returns itself", () => {
      const db2 = db.useDatabase("nope");
      expect(db).to.equal(db2);
    });
  });
  describe("database.createDatabase", () => {
    let name = `testdb_${Date.now()}`;
    afterEach(async () => {
      db.useDatabase("_system");
      await db.dropDatabase(name);
    });
    it("creates a database with the given name", async () => {
      await db.createDatabase(name);
      db.useDatabase(name);
      const info = await db.get();
      expect(info.name).to.equal(name);
    });
    it("adds the given users to the database");
  });
  describe("database.get", () => {
    it("fetches the database description if the database exists", async () => {
      const info = await db.get();
      expect(info.name).to.equal(db.name);
      expect(db.name).to.equal("_system");
    });
    it("fails if the database does not exist", async () => {
      db.useDatabase("__does_not_exist__");
      try {
        await db.get();
      } catch (e) {
        expect(e).to.be.an.instanceof(ArangoError);
        return;
      }
      expect.fail("should not succeed");
    });
  });
  describe("database.listDatabases", () => {
    it("returns a list of all databases", async () => {
      const databases = await db.listDatabases();
      expect(databases).to.be.an.instanceof(Array);
      expect(databases.indexOf("_system")).to.be.greaterThan(-1);
    });
  });
  describe("database.listUserDatabases", () => {
    it("returns a list of databases accessible to the active user");
  });
  describe("database.dropDatabase", () => {
    let name = `testdb_${Date.now()}`;
    beforeEach(async () => {
      await db.createDatabase(name);
    });
    it("deletes the given database from the server", async () => {
      await db.dropDatabase(name);
      let temp = new Database().useDatabase(name);
      try {
        await temp.get();
      } catch (e) {
        return;
      } finally {
        temp.close();
      }
      expect.fail("should not succeed");
    });
  });
  describe("database.truncate", () => {
    let name = `testdb_${Date.now()}`;
    let nonSystemCollections = range(4).map(i => `c_${Date.now()}_${i}`);
    let systemCollections = range(4).map(i => `_c_${Date.now()}_${i}`);
    beforeEach(async () => {
      await db.createDatabase(name);
      db.useDatabase(name);
      await Promise.all([
        ...nonSystemCollections.map(async name => {
          let collection = db.collection(name);
          await collection.create();
          return await collection.save({ _key: "example" });
        }),
        ...systemCollections.map(async name => {
          let collection = db.collection(name);
          await collection.create({ isSystem: true });
          return await collection.save({ _key: "example" });
        })
      ]);
    });
    afterEach(async () => {
      db.useDatabase("_system");
      await db.dropDatabase(name);
    });
    it("removes all documents from all non-system collections in the database", async () => {
      await db.truncate();
      await Promise.all([
        ...nonSystemCollections.map(async name => {
          let doc;
          try {
            doc = await db.collection(name).document("example");
          } catch (e) {
            expect(e).to.be.an.instanceof(ArangoError);
            return;
          }
          expect.fail(`Expected document to be destroyed: ${doc._id}`);
        }),
        ...systemCollections.map(name => {
          db.collection(name).document("example");
        })
      ]);
    });
    it2x(
      "additionally truncates system collections if explicitly passed false",
      async () => {
        await db.truncate(false);
        await Promise.all(
          nonSystemCollections.map(async name => {
            let doc;
            try {
              doc = await db.collection(name).document("example");
            } catch (e) {
              expect(e).to.be.an.instanceof(ArangoError);
              return;
            }
            expect.fail(`Expected document to be destroyed: ${doc._id}`);
          })
        );
      }
    );
  });
});
