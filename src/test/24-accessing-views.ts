import { expect } from "chai";
import { Database } from "../database";
import { View } from "../view";
import { config } from "./_config";

const range = (n: number): number[] => Array.from(Array(n).keys());

const describe34 = config.arangoVersion! >= 30400 ? describe : describe.skip;

describe34("Accessing views", function () {
  let name = `testdb_${Date.now()}`;
  let db: Database;
  before(async () => {
    db = new Database(config);
    if (Array.isArray(config.url)) await db.acquireHostList();
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
      expect(view).to.have.property("name").that.equals(name);
    });
  });
  describe("database.listViews", () => {
    let viewNames = range(4).map((i) => `v_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all(
        viewNames.map(async (name) => {
          const view = db.view(name);
          await view.create();
          await db.waitForPropagation(
            { path: `/_api/view/${view.name}` },
            10000
          );
        })
      );
    });
    after(async () => {
      await Promise.all(viewNames.map((name) => db.view(name).drop()));
    });
    it("fetches information about all views", async () => {
      const views = await db.listViews();
      expect(views.length).to.equal(viewNames.length);
      expect(views.map((v) => v.name).sort()).to.eql(viewNames);
    });
  });
  describe("database.views", () => {
    let arangoSearchViewNames = range(4).map((i) => `asv_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all(
        arangoSearchViewNames.map(async (name) => {
          const view = db.view(name);
          await view.create();
          await db.waitForPropagation(
            { path: `/_api/view/${view.name}` },
            10000
          );
        })
      );
    });
    after(async () => {
      await Promise.all(
        arangoSearchViewNames.map((name) => db.view(name).drop())
      );
    });
    it("creates View instances", async () => {
      const views = await db.views();
      let arangoSearchViews = views.filter((v) => v instanceof View).sort();
      expect(arangoSearchViews.length).to.equal(arangoSearchViewNames.length);
      expect(arangoSearchViews.map((v) => v.name).sort()).to.eql(
        arangoSearchViewNames
      );
    });
  });
});
