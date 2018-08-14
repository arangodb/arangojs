import { expect } from "chai";
import { Database } from "../arangojs";
import { ArangoSearchView } from "../view";

const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30400);
const describe34 = ARANGO_VERSION >= 30400 ? describe : describe.skip;

describe34("Manipulating views", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let name = `testdb_${Date.now()}`;
  let db: Database;
  let view: ArangoSearchView;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: ARANGO_VERSION
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
  beforeEach(async () => {
    view = db.arangoSearchView(`v-${Date.now()}`);
    await view.create();
  });
  afterEach(async () => {
    try {
      await view.get();
    } catch (e) {
      return;
    }
    await view.drop();
  });
  describe("view.create", () => {
    it("creates a new arangosearch view", async () => {
      const view = db.arangoSearchView(`asv-${Date.now()}`);
      await view.create();
      const info = await view.get();
      expect(info).to.have.property("name", view.name);
      expect(info).to.have.property("type", "arangosearch");
    });
  });
  describe("view.setProperties", () => {
    it("should change properties", async () => {
      const properties = await view.setProperties({
        commit: { consolidate: { count: { segmentThreshold: 123 } } }
      });
      expect(properties).to.have.property("name", view.name);
      expect(properties).to.have.property("locale", "C");
      expect(properties).to.have.property("links");
      expect(properties).to.have.property("commit");
      expect(properties.commit).to.have.property("consolidate");
      expect(properties.commit.consolidate).to.have.property("count");
      expect(properties.commit.consolidate.count).to.have.property(
        "segmentThreshold",
        123
      );
    });
  });
  describe("view.replaceProperties", () => {
    it("should change properties", async () => {
      const initial = await view.properties();
      expect(initial.commit.consolidate.bytes).to.have.property(
        "segmentThreshold"
      );
      const oldProps = await view.replaceProperties({
        commit: {
          consolidate: {
            count: { segmentThreshold: 123 },
            bytes: { segmentThreshold: 234 }
          }
        }
      });
      expect(oldProps.commit.consolidate.count).to.have.property(
        "segmentThreshold",
        123
      );
      expect(oldProps.commit.consolidate.bytes).to.have.property(
        "segmentThreshold",
        234
      );
      const properties = await view.replaceProperties({
        commit: { consolidate: { count: { segmentThreshold: 567 } } }
      });
      expect(properties).to.have.property("name", view.name);
      expect(properties).to.have.property("locale", "C");
      expect(properties).to.have.property("links");
      expect(properties).to.have.property("commit");
      expect(properties.commit).to.have.property("consolidate");
      expect(properties.commit.consolidate).to.have.property("count");
      expect(properties.commit.consolidate.count).to.have.property(
        "segmentThreshold",
        567
      );
      expect(properties.commit.consolidate).not.to.have.property("bytes");
    });
  });
  describe("view.rename", () => {
    it("should rename a view", async () => {
      const res = await db.route("/_admin/server/role").get();
      if (res.body.role !== "SINGLE") {
        console.warn("Skipping rename view test in cluster");
        return;
      }
      const name = `v2-${Date.now()}`;
      const info = await view.rename(name);
      expect(info).to.have.property("name", name);
    });
  });
  describe("view.drop", () => {
    it("should drop a view", async () => {
      await view.drop();
      try {
        await view.get();
      } catch (e) {
        expect(e).to.have.property("errorNum", 1203);
        return;
      }
      expect.fail("should throw");
    });
  });
});
