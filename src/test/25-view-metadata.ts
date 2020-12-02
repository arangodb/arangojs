import { expect } from "chai";
import { Database } from "../database";
import { ArangoSearchView } from "../view";
import { config } from "./_config";

const describe34 = config.arangoVersion! >= 30400 ? describe : describe.skip;

describe34("View metadata", function () {
  const dbName = `testdb_${Date.now()}`;
  const viewName = `view-${Date.now()}`;
  let db: Database;
  let view: ArangoSearchView;
  before(async () => {
    db = new Database(config);
    if (Array.isArray(config.url)) await db.acquireHostList();
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
    view = db.view(viewName);
    await view.create();
    await db.waitForPropagation({ path: `/_api/view/${view.name}` }, 30000);
  });
  after(async () => {
    db.useDatabase("_system");
    await db.dropDatabase(dbName);
  });
  describe("view.get", () => {
    it("should return information about a view", async () => {
      const info = await view.get();
      expect(info).to.have.property("name", viewName);
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "arangosearch");
    });
    it("should throw if view does not exists", async () => {
      try {
        await db.view("no").get();
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
      expect(properties).to.have.property("id");
      expect(properties).to.have.property("type", "arangosearch");
      expect(properties).to.have.property("links");
      expect(properties).to.have.property("cleanupIntervalStep");
      expect(properties).to.have.property("consolidationPolicy");
      expect(properties).to.have.property("consolidationIntervalMsec");
      expect(properties.consolidationPolicy).to.have.property("type");
    });
  });
});
