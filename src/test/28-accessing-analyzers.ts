import { expect } from "chai";
import { Analyzer } from "../analyzers.js";
import { Database } from "../databases.js";
import { isArangoError } from "../errors.js";
import { ERROR_ARANGO_CONFLICT } from "../lib/codes.js";
import { config, isClusterRuntime } from "./_config.js";
import {
  clusterIntegrationTimeoutMs,
  isIgnorableNotFoundError,
  propagationAnalyzerPathMs,
  waitForNewDatabase,
  waitUntilAnalyzerNamesInList,
} from "./_integration-timeouts.js";

const range = (n: number): number[] => Array.from(Array(n).keys());

/** Fewer parallel analyzer DDL ops on cluster (agency + lock contention). */
const nTestAnalyzers = isClusterRuntime ? 2 : 4;

/** Serial drops with retries — parallel `drop()` often hits lock timeouts on cluster. */
async function dropAnalyzersSerial(
  database: Database,
  analyzerShortNames: string[],
): Promise<void> {
  for (const short of analyzerShortNames) {
    const analyzer = database.analyzer(short);
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        await analyzer.drop();
        break;
      } catch (e: unknown) {
        if (isIgnorableNotFoundError(e)) break;
        if (!isArangoError(e)) throw e;
        const msg = e.message ?? "";
        const transient =
          e.code === 500 ||
          e.code === 503 ||
          e.errorNum === ERROR_ARANGO_CONFLICT ||
          /timeout waiting to lock|dangling analyzers|Operation timed out/i.test(
            msg,
          );
        if (transient && attempt < 7) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }
  }
}

describe("Accessing analyzers", function () {
  this.timeout(clusterIntegrationTimeoutMs);

  const builtins: string[] = [];
  const name = `testdb_${Date.now()}`;
  let system: Database, db: Database;
  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
    db = await system.createDatabase(name);
    await waitForNewDatabase(db);
    builtins.push(...(await db.listAnalyzers()).map((a) => a.name));
    expect(builtins).not.to.have.length(0);
  });
  after(async () => {
    try {
      await system.dropDatabase(name);
    } finally {
      system.close();
    }
  });
  describe("database.analyzer", () => {
    it("returns a Analyzer instance for the analyzer", () => {
      const name = "potato";
      const analyzer = db.analyzer(name);
      expect(analyzer).to.be.an.instanceof(Analyzer);
      expect(analyzer).to.have.property("name").that.equals(name);
    });
  });
  describe("database.listAnalyzers", () => {
    const analyzerNames = range(nTestAnalyzers).map(
      (i) => `${name}::a_${Date.now()}_${i}`,
    );
    let allNames: string[];
    before(async () => {
      allNames = [...builtins, ...analyzerNames].sort();
      for (const fullName of analyzerNames) {
        const analyzer = db.analyzer(fullName.replace(/^[^:]+::/, ""));
        await analyzer.create({ type: "identity" });
      }
      await waitUntilAnalyzerNamesInList(db, allNames, propagationAnalyzerPathMs);
    });
    after(async () => {
      await dropAnalyzersSerial(
        db,
        analyzerNames.map((n) => n.replace(/^[^:]+::/, "")),
      );
    });
    it("fetches information about all analyzers", async () => {
      const analyzers = await db.listAnalyzers();
      expect(analyzers.map((a) => a.name).sort()).to.eql(allNames);
    });
  });
  describe("database.analyzers", () => {
    const analyzerNames = range(nTestAnalyzers).map(
      (i) => `${name}::a_${Date.now()}_${i}`,
    );
    let allNames: string[];
    before(async () => {
      allNames = [...builtins, ...analyzerNames].sort();
      for (const fullName of analyzerNames) {
        const analyzer = db.analyzer(fullName.replace(/^[^:]+::/, ""));
        await analyzer.create({ type: "identity" });
      }
      await waitUntilAnalyzerNamesInList(db, allNames, propagationAnalyzerPathMs);
    });
    after(async () => {
      await dropAnalyzersSerial(
        db,
        analyzerNames.map((n) => n.replace(/^[^:]+::/, "")),
      );
    });
    it("creates Analyzer instances", async () => {
      const analyzers = await db.analyzers();
      for (const analyzer of analyzers) {
        expect(analyzer).to.be.instanceOf(Analyzer);
      }
      expect(analyzers.map((a) => a.name).sort()).to.eql(allNames);
    });
  });
});
