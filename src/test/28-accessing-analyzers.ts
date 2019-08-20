import { expect } from "chai";
import { ArangoAnalyzer } from "../analyzer";
import { Database } from "../arangojs";

const range = (n: number): number[] => Array.from(Array(n).keys());
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30500);
const describe35 = ARANGO_VERSION >= 30500 ? describe : describe.skip;

describe35("Accessing analyzers", function() {
  const builtins: string[] = [];
  const name = `testdb_${Date.now()}`;
  let db: Database;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: ARANGO_VERSION
    });
    await db.createDatabase(name);
    db.useDatabase(name);
    builtins.push(...(await db.listAnalyzers()).map(a => a.name));
    expect(builtins).not.to.have.length(0);
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
    const analyzerNames = range(4).map(i => `${name}::a_${Date.now()}_${i}`);
    let allNames: string[];
    before(async () => {
      allNames = [...builtins, ...analyzerNames].sort();
      await Promise.all(
        analyzerNames.map(name =>
          db.analyzer(name.replace(/^[^:]+::/, "")).create({ type: "identity" })
        )
      );
    });
    after(async () => {
      await Promise.all(
        analyzerNames.map(name =>
          db.analyzer(name.replace(/^[^:]+::/, "")).drop()
        )
      );
    });
    it("fetches information about all analyzers", async () => {
      const analyzers = await db.listAnalyzers();
      expect(analyzers.map(a => a.name).sort()).to.eql(allNames);
    });
  });
  describe("database.analyzers", () => {
    const analyzerNames = range(4).map(i => `${name}::a_${Date.now()}_${i}`);
    let allNames: string[];
    before(async () => {
      allNames = [...builtins, ...analyzerNames].sort();
      await Promise.all(
        analyzerNames.map(name =>
          db.analyzer(name.replace(/^[^:]+::/, "")).create({ type: "identity" })
        )
      );
    });
    after(async () => {
      await Promise.all(
        analyzerNames.map(name =>
          db.analyzer(name.replace(/^[^:]+::/, "")).drop()
        )
      );
    });
    it("creates ArangoAnalyzer instances", async () => {
      const analyzers = await db.analyzers();
      for (const analyzer of analyzers) {
        expect(analyzer).to.be.instanceOf(ArangoAnalyzer);
      }
      expect(analyzers.map(a => a.name).sort()).to.eql(allNames);
    });
  });
});
