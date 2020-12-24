import { expect } from "chai";
import { Analyzer } from "../analyzer";
import { Database } from "../database";
import { config } from "./_config";

const describe35 = config.arangoVersion! >= 30500 ? describe : describe.skip;

function waitForAnalyzer(db: Database, name: string) {
  if (config.arangoVersion >= 30700) {
    // analyzer propagation in the cluster has an up-to 60 seconds
    // delay in 3.6. this is changed in 3.7, and analyzer changes
    // are replicated near-instantaneously via the agency in 3.7+
    return db.waitForPropagation(
      { path: `/_api/analyzer/${name}` },
      30000
    );
  } else {
    // make a call only to /_api/version in the target database, as
    // we can't be sure analyzers will be propagated in time
    return db.waitForPropagation(
      { path: `/_api/version` },
      10000
    );
  }
}

describe35("Manipulating analyzers", function () {
  const name = `testdb_${Date.now()}`;
  let db: Database;
  before(async () => {
    db = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") await db.acquireHostList();
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
