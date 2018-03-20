import { Database } from "../arangojs";
import { expect } from "chai";

describe("Transactions", () => {
  let db: Database;
  before(done => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30000)
    });
    done();
  });
  describe("database.transaction", () => {
    it("should execute a transaction and return the result", done => {
      db
        .transaction([], "function (params) {return params;}", "test")
        .then(result => {
          expect(result).to.equal("test");
        })
        .then(() => done())
        .catch(done);
    });
  });
});
