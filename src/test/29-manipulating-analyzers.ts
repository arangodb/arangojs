import { expect } from "chai";
import { Analyzer } from "../analyzer";
import { Database } from "../database";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);
const describe35 = ARANGO_VERSION >= 30500 ? describe : describe.skip;

describe35("Manipulating analyzers", function() {
  const name = `testdb_${Date.now()}`;
  let db: Database;
  before(async () => {
    db = new Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
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
      expect(await analyzer.exists()).to.equal(true);
    });
  });
  describe("analyzer.get", () => {
    let analyzer: Analyzer;
    before(async () => {
      analyzer = db.analyzer(`a_${Date.now()}`);
      await analyzer.create({ type: "identity" });
    });
    after(async () => {
      await analyzer.drop();
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
      const data = await analyzer.get();
      expect(data).to.have.property("name", `${name}::${analyzer.name}`);
      expect(data).to.have.property("type", "identity");
    });
  });
  describe("analyzer.drop", () => {
    let analyzer: Analyzer;
    beforeEach(async () => {
      analyzer = db.analyzer(`a_${Date.now()}`);
      await analyzer.create({ type: "identity" });
    });
    it("destroys the analyzer", async () => {
      await analyzer.drop();
      expect(await analyzer.exists()).to.equal(false);
    });
  });
});
