import { expect } from "chai";
import { Database } from "../arangojs";
import { ArangoSearchView } from "../view";

const range = (n: number): number[] => Array.from(Array(n).keys());

describe("Accessing views", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let name = `testdb_${Date.now()}`;
  let db: Database;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
    await db.createDatabase(name);
    db.useDatabase(name);
  });
  after(async () => {
    try {
      db.useDatabase("_system");
      await db.dropDatabase(name);
    } finally {
      db.close();
    }
  });
  describe("database.arangoSearchView", () => {
    it("returns a ArangoSearchView instance for the view", () => {
      let name = "potato";
      let view = db.arangoSearchView(name);
      expect(view).to.be.an.instanceof(ArangoSearchView);
      expect(view)
        .to.have.property("name")
        .that.equals(name);
    });
  });
  describe("database.listViews", () => {
    let viewNames = range(4).map(i => `v_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all(
        viewNames.map(name => db.arangoSearchView(name).create())
      );
    });
    after(async () => {
      await Promise.all(
        viewNames.map(name => db.arangoSearchView(name).drop())
      );
    });
    it("fetches information about all views", async () => {
      const views = await db.listViews();
      expect(views.length).to.equal(viewNames.length);
      expect(views.map((c: any) => c.name).sort()).to.eql(viewNames);
    });
  });
  describe("database.views", () => {
    let arangoSearchViewNames = range(4).map(i => `asv_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all(
        arangoSearchViewNames.map(name => db.arangoSearchView(name).create())
      );
    });
    after(async () => {
      await Promise.all(
        arangoSearchViewNames.map(name => db.arangoSearchView(name).drop())
      );
    });
    it("creates ArangoSearchView instances", async () => {
      const views = await db.views();
      let arangoSearchViews = views
        .filter((c: any) => c instanceof ArangoSearchView)
        .sort();
      expect(arangoSearchViews.length).to.equal(arangoSearchViewNames.length);
      expect(arangoSearchViews.map((c: any) => c.name).sort()).to.eql(
        arangoSearchViewNames
      );
    });
  });
});
