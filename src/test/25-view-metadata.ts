import { expect } from "chai";
import { Database } from "../arangojs";
import { ArangoSearchView } from "../view";

describe("View metadata", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let db: Database;
  let dbName = `testdb_${Date.now()}`;
  let view: ArangoSearchView;
  let viewName = `view-${Date.now()}`;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
    view = db.arangoSearchView(viewName);
    await view.create();
  });
  after(async () => {
    db.useDatabase("_system");
    await db.dropDatabase(dbName);
  });
  describe("view.get", () => {
    it("should return information about a view", async () => {
      const info = await view.get();
      expect(info).to.have.property("name", viewName);
      expect(info).to.have.property("type", "arangosearch");
    });
    it("should throw if view does not exists", async () => {
      try {
        await db.arangoSearchView("no").get();
      } catch (err) {
        expect(err).to.have.property("errorNum", 1203);
        return;
      }
      expect.fail("should throw");
    });
  });
  describe("view.properties", () => {
    it("should return properties of a view", async () => {
      const properties = await view.properties();
      expect(properties).to.have.property("name", viewName);
      expect(properties).to.have.property("locale", "C");
      expect(properties).to.have.property("links");
      expect(properties).to.have.property("commit");
    });
  });
});
