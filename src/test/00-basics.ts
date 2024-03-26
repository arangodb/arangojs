import { expect } from "chai";
import arangojs, { Database } from "..";
import { config } from "./_config";

describe("Creating a Database", () => {
  describe("using the factory", () => {
    const db = arangojs({ arangoVersion: 54321 });
    it("returns a Database instance", () => {
      expect(db).to.be.an.instanceof(Database);
    });
    it("passes any configs to the connection", () => {
      expect((db as any)._connection).to.have.property("_arangoVersion", 54321);
    });
  });
  describe("using the constructor", () => {
    const db = new Database({ arangoVersion: 43210 });
    it("returns a Database instance", () => {
      expect(db).to.be.an.instanceof(Database);
    });
    it("passes any configs to the connection", () => {
      expect((db as any)._connection).to.have.property("_arangoVersion", 43210);
    });
  });
});

describe("Configuring the driver", () => {
  describe.skip("with a string", () => {
    it("sets the url", () => {
      const url = "https://example.com:9000";
      const db = new Database(url);
      expect((db as any)._connection._url).to.eql([url]);
    });
  });
  describe("with headers", () => {
    it("applies the headers", (done) => {
      const db = new Database({
        headers: {
          "x-one": "1",
          "x-two": "2",
        },
      });
      (db as any)._connection._hosts = [
        ({ headers }: any) => {
          expect(headers.get("x-one")).to.equal("1");
          expect(headers.get("x-two")).to.equal("2");
          done();
        },
      ];
      db.request({ headers: {} }, () => {});
    });
  });
  describe("with an arangoVersion", () => {
    it("sets the x-arango-version header", (done) => {
      const db = new Database({ arangoVersion: 99999 });
      (db as any)._connection._hosts = [
        ({ headers }: any) => {
          expect(headers.get("x-arango-version")).to.equal("99999");
          done();
        },
      ];
      db.request({ headers: {} }, () => {});
    });
  });
});

describe("JSON serialization", () => {
  describe("for ArangoError", () => {
    const name = `testdb_${Date.now()}`;
    let system: Database, db: Database;
    before(async () => {
      system = new Database(config);
      if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
        await system.acquireHostList();
      await system.createDatabase(name);
      db = system.database(name);
    });
    after(async () => {
      try {
        await system.dropDatabase(name);
      } finally {
        system.close();
      }
    });
    it("should be serializable to JSON", async () => {
      try {
        await db.collection("does-not-exist").get();
      } catch (e: any) {
        JSON.stringify(e);
        return;
      }
      expect.fail("Should have raised an exception");
    });
  });
  describe("for SystemError", () => {
    it("should be serializable to JSON", async () => {
      const db = new Database({ url: "http://does.not.exist.example:9999" });
      try {
        await db.collection("does-not-exist").get();
      } catch (e: any) {
        JSON.stringify(e);
        return;
      }
      expect.fail("Should have raised an exception");
    });
  });
});
