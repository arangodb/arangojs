import { expect } from "chai";
import { Database } from "../arangojs";
import { ArangoSearchView } from "../view";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);
const describe34 = ARANGO_VERSION >= 30400 ? describe : describe.skip;

describe34("View metadata", function() {
  const dbName = `testdb_${Date.now()}`;
  const viewName = `view-${Date.now()}`;
  let db: Database;
  let view: ArangoSearchView;
  before(async () => {
    db = new Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
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
      expect(info).to.have.property("id");
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
