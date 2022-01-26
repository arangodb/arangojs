import { expect } from "chai";
import { Database } from "../database";
import { config } from "./_config";

describe("Managing functions", function () {
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
  describe("database.listFunctions", () => {
    it("should be empty per default", async () => {
      const result = await db.listFunctions();
      expect(result).to.be.instanceof(Array);
      expect(result).to.be.empty;
    });
    it("should include before created function", async () => {
      const name = "myfunctions::temperature::celsiustofahrenheit";
      const code = "function (celsius) { return celsius * 1.8 + 32; }";
      await db.createFunction(name, code);
      const result = await db.listFunctions();
      expect(result).to.be.instanceof(Array);
      expect(result.length).to.equal(1);
      expect(result[0]).to.eql({
        name,
        code,
        isDeterministic: false,
      });
    });
    describe("database.createFunction", () => {
      it("should create a function", async () => {
        const info = await db.createFunction(
          "myfunctions::temperature::celsiustofahrenheit2",
          "function (celsius) { return celsius * 1.8 + 32; }"
        );
        expect(info).to.have.property("code", 201);
        expect(info).to.have.property("error", false);
      });
    });
    describe("database.dropFunction", () => {
      it("should drop a existing function", async () => {
        const name = "myfunctions::temperature::celsiustofahrenheit";
        await db.createFunction(
          name,
          "function (celsius) { return celsius * 1.8 + 32; }"
        );
        const info = await db.dropFunction(name);
        expect(info).to.have.property("deletedCount", 1);
      });
    });
  });
});
