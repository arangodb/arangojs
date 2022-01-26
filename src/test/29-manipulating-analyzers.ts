import { expect } from "chai";
import { Analyzer } from "../analyzer";
import { Database } from "../database";
import { config } from "./_config";

function waitForAnalyzer(db: Database, name: string) {
  return db.waitForPropagation({ path: `/_api/analyzer/${name}` }, 30000);
}

describe("Manipulating analyzers", function () {
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
  describe("analyzer.exists", () => {
    it("indicates whether the analyzer exists", async () => {
      const analyzer = db.analyzer(`a_${Date.now()}`);
      expect(await analyzer.exists()).to.equal(false);
      await analyzer.create({ type: "identity" });
      await waitForAnalyzer(db, analyzer.name);
      expect(await analyzer.exists()).to.equal(true);
    });
  });
  describe("analyzer.get", () => {
    let analyzer: Analyzer;
    before(async () => {
      analyzer = db.analyzer(`a_${Date.now()}`);
      await analyzer.create({ type: "identity" });
      await waitForAnalyzer(db, analyzer.name);
    });
    after(async () => {
      try {
        await analyzer.drop();
      } catch {}
    });
    it("fetches information about the analyzer", async () => {
      const data = await analyzer.get();
      expect(data).to.have.property("name", `${name}::${analyzer.name}`);
    });
  });
  describe("analyzer.create", () => {
    it("creates the analyzer", async () => {
      const analyzer = db.analyzer(`a_${Date.now()}`);
      await analyzer.create({ type: "identity" });
      await waitForAnalyzer(db, analyzer.name);
      const data = await analyzer.get();
      expect(data).to.have.property("name", `${name}::${analyzer.name}`);
      expect(data).to.have.property("type", "identity");
    });
  });
  describe("analyzer.drop", () => {
    it("destroys the analyzer", async () => {
      const analyzer = db.analyzer(`a_${Date.now()}`);
      await analyzer.create({ type: "identity" });
      await waitForAnalyzer(db, analyzer.name);
      await analyzer.drop();
      expect(await analyzer.exists()).to.equal(false);
    });
  });
});
