import { expect } from "chai";
import { ArangoAnalyzer } from "../analyzer";
import { Database } from "../arangojs";

const range = (n: number): number[] => Array.from(Array(n).keys());
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30500);
const describe35 = ARANGO_VERSION >= 30500 ? describe : describe.skip;

describe35("Accessing analyzers", function() {
  let name = `testdb_${Date.now()}`;
  let db: Database;
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
  describe("database.arangoAnalyzer", () => {
    it("returns a ArangoAnalyzer instance for the analyzer", () => {
      let name = "potato";
      let analyzer = db.analyzer(name);
      expect(analyzer).to.be.an.instanceof(ArangoAnalyzer);
      expect(analyzer)
        .to.have.property("name")
        .that.equals(name);
    });
  });
  describe("database.listAnalyzers", () => {
    let analyzerNames = range(4).map(i => `a_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all(
        analyzerNames.map(name =>
          db.analyzer(name).create({ type: "identity" })
        )
      );
    });
    after(async () => {
      await Promise.all(analyzerNames.map(name => db.analyzer(name).drop()));
    });
    it("fetches information about all analyzers", async () => {
      const analyzers = await db.listAnalyzers();
      expect(analyzers.length).to.equal(analyzerNames.length);
      expect(analyzers.map(a => a.name).sort()).to.eql(analyzerNames);
    });
  });
  describe("database.analyzers", () => {
    let analyzerNames = range(4).map(i => `a_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all(
        analyzerNames.map(name =>
          db.analyzer(name).create({ type: "identity" })
        )
      );
    });
    after(async () => {
      await Promise.all(analyzerNames.map(name => db.analyzer(name).drop()));
    });
    it("creates ArangoAnalyzer instances", async () => {
      const analyzers = await db.analyzers();
      let arangoAnalyzers = analyzers
        .filter(a => a instanceof ArangoAnalyzer)
        .sort();
      expect(arangoAnalyzers.length).to.equal(analyzerNames.length);
      expect(arangoAnalyzers.map(a => a.name).sort()).to.eql(analyzerNames);
    });
  });
});
