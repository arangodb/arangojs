import { expect } from "chai";
import { Database } from "../databases.js";
import { ArangoSearchViewProperties, View } from "../views.js";
import { config } from "./_config.js";

// NOTE These tests will not reliably work in a cluster.
const describeNLB =
  config.loadBalancingStrategy === "ROUND_ROBIN" ? describe.skip : describe;
const it312 = config.arangoVersion! >= 31200 ? it : it.skip;

describe("Manipulating views", function () {
  const name = `testdb_${Date.now()}`;
  let system: Database, db: Database;
  let view: View;
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
  beforeEach(async () => {
    view = db.view(`v-${Date.now()}`);
    await view.create({ type: "arangosearch" });
    await db.waitForPropagation({ pathname: `/_api/view/${view.name}` }, 10000);
  });
  afterEach(async () => {
    try {
      await view.get();
    } catch (e: any) {
      return;
    }
    await view.drop();
  });
  describe("view.create", () => {
    it("creates a new arangosearch view", async () => {
      const view = db.view(`asv-${Date.now()}`);
      await view.create({ type: "arangosearch" });
      await db.waitForPropagation(
        { pathname: `/_api/view/${view.name}` },
        10000,
      );
      const info = await view.get();
      expect(info).to.have.property("name", view.name);
      expect(info).to.have.property("type", "arangosearch");
    });
  });
  describe("view.updateProperties", () => {
    it("should not overwrite properties", async () => {
      const initial = (await view.properties()) as ArangoSearchViewProperties;
      expect(initial.consolidationIntervalMsec).not.to.equal(45000);
      const oldProps = await view.updateProperties({
        consolidationIntervalMsec: 45000,
        commitIntervalMsec: 45000,
      });
      expect(oldProps.consolidationIntervalMsec).to.equal(45000);
      const properties = await view.updateProperties({
        commitIntervalMsec: 30000,
      });
      expect(properties.consolidationIntervalMsec).to.equal(45000);
      expect(properties.commitIntervalMsec).to.equal(30000);
    });
    it312(
      "should support new consolidation policy options (maxSkewThreshold, minDeletionRatio)",
      async () => {
        const properties = (await view.updateProperties({
          consolidationPolicy: {
            type: "tier",
            maxSkewThreshold: 0.5,
            minDeletionRatio: 0.6,
          },
        })) as ArangoSearchViewProperties;
        expect(properties.consolidationPolicy).to.have.property("type", "tier");
        if (properties.consolidationPolicy.type === "tier") {
          expect(properties.consolidationPolicy).to.have.property(
            "maxSkewThreshold",
            0.5,
          );
          expect(properties.consolidationPolicy).to.have.property(
            "minDeletionRatio",
            0.6,
          );
        }
      },
    );
  });
  describe("view.replaceProperties", () => {
    it("should overwrite properties", async () => {
      const initial = (await view.properties()) as ArangoSearchViewProperties;
      expect(initial.consolidationIntervalMsec).not.to.equal(45000);
      const oldProps = await view.replaceProperties({
        consolidationIntervalMsec: 45000,
        commitIntervalMsec: 45000,
      });
      expect(oldProps.consolidationIntervalMsec).to.equal(45000);
      const properties = await view.replaceProperties({
        commitIntervalMsec: 30000,
      });
      expect(properties.consolidationIntervalMsec).to.equal(
        initial.consolidationIntervalMsec,
      );
      expect(properties.commitIntervalMsec).to.equal(30000);
    });
  });
  describeNLB("view.rename", () => {
    it("should rename a view", async () => {
      const name = `v2-${Date.now()}`;
      const res = await db.route("/_admin/server/role").get();
      if (res.parsedBody.role === "SINGLE") {
        // view renaming is only implemented for single servers
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const info = await view.rename(name);
        expect(info).to.have.property("name", name);
      } else {
        try {
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          await view.rename(name);
        } catch (e: any) {
          // "unsupported operation" in cluster
          expect(e).to.have.property("errorNum", 1470);
          return;
        }
        expect.fail("should throw");
      }
    });
  });
  describe("view.drop", () => {
    it("should drop a view", async () => {
      await view.drop();
      try {
        await view.get();
      } catch (e: any) {
        expect(e).to.have.property("errorNum", 1203);
        return;
      }
      expect.fail("should throw");
    });
  });
});
