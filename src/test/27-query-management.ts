import { expect } from "chai";
import { aql, Database } from "../arangojs";
import { ArrayCursor } from "../cursor";
import { ArangoError } from "../error";

describe("Query Management API", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  const dbName = `testdb_${Date.now()}`;
  let db: Database;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
  });
  after(async () => {
    try {
      db.useDatabase("_system");
      await db.dropDatabase(dbName);
    } finally {
      db.close();
    }
  });

  describe("database.query", () => {
    it("returns a cursor for the query result", done => {
      db.query("RETURN 23")
        .then(cursor => {
          expect(cursor).to.be.an.instanceof(ArrayCursor);
          done();
        })
        .catch(done);
    });
    it("throws an exception on error", async () => {
      try {
        await db.query("FOR i IN no RETURN i");
      } catch (err) {
        expect(err).is.instanceof(ArangoError);
        expect(err).to.have.property("statusCode", 404);
        expect(err).to.have.property("errorNum", 1203);
        return;
      }
      expect.fail();
    });
    it("times out if a timeout is set and exceeded", async () => {
      try {
        await db.query(aql`RETURN SLEEP(0.02)`, { timeout: 10 });
      } catch (err) {
        expect(err).is.instanceof(Error);
        expect(err).is.not.instanceof(ArangoError);
        expect(err).to.have.property("code", "ECONNRESET");
        return;
      }
      expect.fail();
    });
    it("does not time out if a timeout is set and not exceeded", async () => {
      try {
        await db.query(aql`RETURN SLEEP(0.01)`, { timeout: 1000 });
      } catch (err) {
        expect.fail();
      }
    });
    it("supports bindVars", async () => {
      const cursor = await db.query("RETURN @x", { x: 5 });
      const value = await cursor.next();
      expect(value).to.equal(5);
    });
    it("supports options", async () => {
      const cursor = await db.query("FOR x IN 1..10 RETURN x", undefined, {
        batchSize: 2,
        count: true
      });
      expect(cursor.count).to.equal(10);
      expect((cursor as any)._hasMore).to.equal(true);
    });
    it("supports AQB queries", async () => {
      const cursor = await db.query({ toAQL: () => "RETURN 42" });
      const value = await cursor.next();
      expect(value).to.equal(42);
    });
    it("supports query objects", async () => {
      const cursor = await db.query({ query: "RETURN 1337", bindVars: {} });
      const value = await cursor.next();
      expect(value).to.equal(1337);
    });
    it("supports compact queries", async () => {
      const cursor = await db.query({
        query: "RETURN @potato",
        bindVars: { potato: "tomato" }
      });
      const value = await cursor.next();
      expect(value).to.equal("tomato");
    });
    it("supports compact queries with options", async () => {
      const query: any = {
        query: "FOR x IN RANGE(1, @max) RETURN x",
        bindVars: { max: 10 }
      };
      const cursor = await db.query(query, { batchSize: 2, count: true });
      expect(cursor.count).to.equal(10);
      expect((cursor as any)._hasMore).to.equal(true);
    });
  });

  describe("database.explain", () => {
    it("returns an explanation", async () => {
      const result = await db.explain(aql`FOR x IN RANGE(1, ${10}) RETURN x`);
      expect(result.plan).to.have.property("nodes");
    });
  });

  describe("database.parse", () => {
    it("returns a parse result", async () => {
      const result = await db.parse(aql`FOR x IN _users RETURN x`);
      expect(result).to.have.property("parsed", true);
      expect(result).to.have.property("collections");
      expect(result).to.have.property("bindVars");
      expect(result).to.have.property("ast");
    });
  });

  describe("database.queryTracking", () => {
    it("returns the AQL query tracking properties", async () => {
      const result = await db.queryTracking();
      expect(result).to.have.property("enabled");
      expect(result).to.have.property("maxQueryStringLength");
      expect(result).to.have.property("maxSlowQueries");
      expect(result).to.have.property("slowQueryThreshold");
      expect(result).to.have.property("trackBindVars");
      expect(result).to.have.property("trackSlowQueries");
    });
  });

  describe("database.setQueryTracking", () => {
    afterEach(async () => {
      await db.setQueryTracking({
        enabled: true,
        slowQueryThreshold: 5
      });
      await db.clearSlowQueries();
    });
    it("returns the AQL query tracking properties", async () => {
      const result = await db.setQueryTracking({
        enabled: true,
        maxQueryStringLength: 64,
        maxSlowQueries: 2,
        slowQueryThreshold: 5,
        trackBindVars: true,
        trackSlowQueries: true
      });
      expect(result).to.have.property("enabled", true);
      expect(result).to.have.property("maxQueryStringLength", 64);
      expect(result).to.have.property("maxSlowQueries", 2);
      expect(result).to.have.property("slowQueryThreshold", 5);
      expect(result).to.have.property("trackBindVars", true);
      expect(result).to.have.property("trackSlowQueries", true);
    });
  });

  describe("database.listRunningQueries", () => {
    it("returns a list of running queries", async () => {
      const query = "RETURN SLEEP(0.5)";
      const p1 = db.query(query);
      const p2 = db.listRunningQueries();
      const [, queries] = await Promise.all([p1, p2]);
      expect(queries).to.have.lengthOf(1);
      expect(queries[0]).to.have.property("bindVars");
      expect(queries[0]).to.have.property("query", query);
    });
  });

  describe("database.listSlowQueries", () => {
    beforeEach(async () => {
      await db.setQueryTracking({
        enabled: true,
        slowQueryThreshold: 0.1,
        trackSlowQueries: true
      });
      await db.clearSlowQueries();
    });
    afterEach(async () => {
      await db.setQueryTracking({
        enabled: true,
        slowQueryThreshold: 5
      });
      await db.clearSlowQueries();
    });
    it("returns a list of slow queries", async () => {
      const query = "RETURN SLEEP(0.2)";
      await db.query(query);
      const queries = await db.listSlowQueries();
      expect(queries).to.have.lengthOf(1);
      expect(queries[0]).to.have.property("query", query);
    });
  });

  describe("database.clearSlowQueries", () => {
    beforeEach(async () => {
      await db.setQueryTracking({
        enabled: true,
        slowQueryThreshold: 0.1,
        trackSlowQueries: true
      });
      await db.clearSlowQueries();
    });
    afterEach(async () => {
      await db.setQueryTracking({
        enabled: true,
        slowQueryThreshold: 5
      });
      await db.clearSlowQueries();
    });
    it("clears the list of slow queries", async () => {
      await db.query("RETURN SLEEP(0.2)");
      const queries1 = await db.listSlowQueries();
      expect(queries1).to.have.lengthOf(1);
      await db.clearSlowQueries();
      const queries2 = await db.listSlowQueries();
      expect(queries2).to.have.lengthOf(0);
    });
  });

  describe("database.killQuery", () => {
    it("kills the given query", async () => {
      const query = "RETURN SLEEP(0.5)";
      const p1 = db.query(query);
      const queries = await db.listRunningQueries();
      expect(queries).to.have.lengthOf(1);
      expect(queries[0]).to.have.property("bindVars");
      expect(queries[0]).to.have.property("query", query);
      await db.killQuery(queries[0].id);
      try {
        await p1;
      } catch (e) {
        expect(e).to.be.instanceOf(ArangoError);
        expect(e).to.have.property("errorNum", 1500);
        expect(e).to.have.property("code", 410);
        return;
      }
      expect.fail();
    });
  });
});
