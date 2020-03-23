import { expect } from "chai";
import { Database } from "../database";
import { View } from "../view";

const range = (n: number): number[] => Array.from(Array(n).keys());

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);
const describe34 = ARANGO_VERSION >= 30400 ? describe : describe.skip;

describe34("Accessing views", function() {
  let name = `testdb_${Date.now()}`;
  let db: Database;
  before(async () => {
    db = new Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
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
    it("returns a View instance for the view", () => {
      let name = "potato";
      let view = db.view(name);
      expect(view).to.be.an.instanceof(View);
      expect(view)
        .to.have.property("name")
        .that.equals(name);
    });
  });
  describe("database.listViews", () => {
    let viewNames = range(4).map(i => `v_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all(viewNames.map(name => db.view(name).create()));
    });
    after(async () => {
      await Promise.all(viewNames.map(name => db.view(name).drop()));
    });
    it("fetches information about all views", async () => {
      const views = await db.listViews();
      expect(views.length).to.equal(viewNames.length);
      expect(views.map(v => v.name).sort()).to.eql(viewNames);
    });
  });
  describe("database.views", () => {
    let arangoSearchViewNames = range(4).map(i => `asv_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all(
        arangoSearchViewNames.map(name => db.view(name).create())
      );
    });
    after(async () => {
      await Promise.all(
        arangoSearchViewNames.map(name => db.view(name).drop())
      );
    });
    it("creates View instances", async () => {
      const views = await db.views();
      let arangoSearchViews = views.filter(v => v instanceof View).sort();
      expect(arangoSearchViews.length).to.equal(arangoSearchViewNames.length);
      expect(arangoSearchViews.map(v => v.name).sort()).to.eql(
        arangoSearchViewNames
      );
    });
  });
});
