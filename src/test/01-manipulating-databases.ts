import { expect } from "chai";
import { Database } from "../database";
import { ArangoError } from "../error";
import { config } from "./_config";

describe("Manipulating databases", function () {
  let db: Database;
  beforeEach(async () => {
    db = new Database(config);
    if (Array.isArray(config.url)) await db.acquireHostList();
  });
  afterEach(() => {
    db.close();
  });
  describe("database.useDatabase", () => {
    it("updates the database name", () => {
      const name = "example";
      expect(db.name).to.equal("_system"); // default
      db.useDatabase(name);
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
});
