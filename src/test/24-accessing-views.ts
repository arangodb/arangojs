import { expect } from "chai";
import { Database } from "../databases.js";
import { View } from "../views.js";
import { config } from "./_config.js";

const range = (n: number): number[] => Array.from(Array(n).keys());

describe("Accessing views", function () {
  const name = `testdb_${Date.now()}`;
  let system: Database, db: Database;
  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
    db = await system.createDatabase(name);
  });
  after(async () => {
    try {
      await system.dropDatabase(name);
    } finally {
      system.close();
    }
  });
  describe("database.view", () => {
    it("returns a View instance for the view", () => {
      const name = "potato";
      const view = db.view(name);
      expect(view).to.be.an.instanceof(View);
      expect(view).to.have.property("name").that.equals(name);
    });
  });
  describe("database.listViews", () => {
    const viewNames = range(4).map((i) => `v_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all(
        viewNames.map(async (name) => {
          const view = db.view(name);
          await view.create({ type: "arangosearch" });
          await db.waitForPropagation(
            { pathname: `/_api/view/${view.name}` },
            10000,
          );
        }),
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
    const arangoSearchViewNames = range(4).map((i) => `asv_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all(
        arangoSearchViewNames.map(async (name) => {
          const view = db.view(name);
          await view.create({ type: "arangosearch" });
          await db.waitForPropagation(
            { pathname: `/_api/view/${view.name}` },
            10000,
          );
        }),
      );
    });
    after(async () => {
      await Promise.all(
        arangoSearchViewNames.map((name) => db.view(name).drop()),
      );
    });
    it("creates View instances", async () => {
      const views = await db.views();
      const arangoSearchViews = views.filter((v) => v instanceof View).sort();
      expect(arangoSearchViews.length).to.equal(arangoSearchViewNames.length);
      expect(arangoSearchViews.map((v) => v.name).sort()).to.eql(
        arangoSearchViewNames,
      );
    });
  });
});
