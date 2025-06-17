import { expect } from "chai";
import { Database } from "../databases.js";
import { config } from "./_config.js";

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
  describe("database.listUserFunctions", () => {
    it("should be empty per default", async () => {
      const result = await db.listUserFunctions();
      expect(result).to.be.instanceof(Array);
      expect(result).to.be.empty;
    });
    it("should include before created function", async () => {
      const name = "myfunctions::temperature::celsiustofahrenheit";
      const code = "function (celsius) { return celsius * 1.8 + 32; }";
      await db.createUserFunction(name, code);
      const result = await db.listUserFunctions();
      expect(result).to.be.instanceof(Array);
      expect(result.length).to.equal(1);
      expect(result[0]).to.eql({
        name,
        code,
        isDeterministic: false,
      });
    });
    describe("database.createUserFunction", () => {
      it("should create a function", async () => {
        const info = await db.createUserFunction(
          "myfunctions::temperature::celsiustofahrenheit2",
          "function (celsius) { return celsius * 1.8 + 32; }",
        );
        expect(info).to.have.property("code", 201);
        expect(info).to.have.property("error", false);
      });
    });
    describe("database.dropUserFunction", () => {
      it("should drop a existing function", async () => {
        const name = "myfunctions::temperature::celsiustofahrenheit";
        await db.createUserFunction(
          name,
          "function (celsius) { return celsius * 1.8 + 32; }",
        );
        const info = await db.dropUserFunction(name);
        expect(info).to.have.property("deletedCount", 1);
      });
    });
  });
});
