import { expect } from "chai";
import { Database } from "../arangojs";
import { ArangoSearchView } from "../view";

const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30400);
const describe34 = ARANGO_VERSION >= 30400 ? describe : describe.skip;

describe34("Manipulating views", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  const name = `testdb_${Date.now()}`;
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
      const initial = await view.properties();
      expect(initial.consolidationIntervalMsec).to.equal(60000);
      expect(initial.consolidationPolicy).to.have.property(
        "type",
        "bytes_accum"
      );
      const oldProps = await view.setProperties({
        consolidationIntervalMsec: 45000,
        consolidationPolicy: { type: "tier" }
      });
      expect(oldProps.consolidationIntervalMsec).to.equal(45000);
      expect(oldProps.consolidationPolicy).to.have.property("type", "tier");
      const properties = await view.setProperties({
        consolidationPolicy: { type: "bytes_accum" }
      });
      expect(properties.consolidationIntervalMsec).to.equal(45000);
      expect(properties.consolidationPolicy).to.have.property(
        "type",
        "bytes_accum"
      );
    });
  });
  describe("view.replaceProperties", () => {
    it("should change properties", async () => {
      const initial = await view.properties();
      expect(initial.consolidationIntervalMsec).to.equal(60000);
      expect(initial.consolidationPolicy).to.have.property(
        "type",
        "bytes_accum"
      );
      const oldProps = await view.replaceProperties({
        consolidationIntervalMsec: 45000,
        consolidationPolicy: { type: "tier" }
      });
      expect(oldProps.consolidationIntervalMsec).to.equal(45000);
      expect(oldProps.consolidationPolicy).to.have.property("type", "tier");
      const properties = await view.replaceProperties({
        consolidationPolicy: { type: "bytes_accum" }
      });
      expect(properties.consolidationIntervalMsec).to.equal(60000);
      expect(properties.consolidationPolicy).to.have.property(
        "type",
        "bytes_accum"
      );
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
