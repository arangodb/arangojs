import { expect } from "chai";
import { Database } from "../arangojs";

describe("Transactions", () => {
  let db: Database;
  before(() => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
  });
  after(() => {
    db.close();
  });
  describe("database.transaction", () => {
    it("should execute a transaction and return the result", async () => {
      const result = await db.transaction(
        [],
        "function (params) {return params;}",
        "test"
      );
      expect(result).to.equal("test");
    });
  });
});
