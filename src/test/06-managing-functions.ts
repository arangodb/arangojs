import { Database } from "../arangojs";
import { expect } from "chai";

describe("Managing functions", () => {
  let name = `testdb_${Date.now()}`;
  let db: Database;
  before(done => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30000)
    });
    db
      .createDatabase(name)
      .then(() => {
        db.useDatabase(name);
        done();
      })
      .catch(done);
  });
  after(done => {
    db.useDatabase("_system");
    db
      .dropDatabase(name)
      .then(() => void done())
      .catch(done);
  });
  describe("database.listFunctions", () => {
    it("should be empty per default", done => {
      db
        .listFunctions()
        .then(info => {
          expect(info).to.have.property("result");
          expect(info.result).to.be.instanceof(Array);
          expect(info.result).to.be.empty;
        })
        .then(() => done())
        .catch(done);
    });
    it("should include before created function", done => {
      const name = "myfunctions::temperature::celsiustofahrenheit";
      const code = "function (celsius) { return celsius * 1.8 + 32; }";
      db
        .createFunction(name, code)
        .then(() => {
          return db.listFunctions().then(info => {
            expect(info).to.have.property("result");
            expect(info.result).to.be.instanceof(Array);
            expect(info.result.length).to.equal(1);
            expect(info.result[0]).to.eql({
              name,
              code,
              isDeterministic: false
            });
          });
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("database.createFunction", () => {
    it("should create a function", done => {
      db
        .createFunction(
          "myfunctions::temperature::celsiustofahrenheit",
          "function (celsius) { return celsius * 1.8 + 32; }"
        )
        .then(info => {
          expect(info).to.eql({
            code: 200,
            error: false
          });
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("database.dropFunction", () => {
    it("should drop a existing function", done => {
      const name = "myfunctions::temperature::celsiustofahrenheit";
      db
        .createFunction(
          name,
          "function (celsius) { return celsius * 1.8 + 32; }"
        )
        .then(() => {
          return db.dropFunction(name).then(info => {
            expect(info).to.have.property("deletedCount", 1);
          });
        })
        .then(() => done())
        .catch(done);
    });
  });
});
