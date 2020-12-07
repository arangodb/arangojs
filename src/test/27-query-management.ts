import { expect } from "chai";
import { aql } from "../aql";
import { ArrayCursor } from "../cursor";
import { Database } from "../database";
import { ArangoError } from "../error";
import { config } from "./_config";

// NOTE These tests will not reliably work with load balancing.
const describeNLB =
  config.loadBalancingStrategy === "ROUND_ROBIN" ? describe.skip : describe;

describe("Query Management API", function () {
  const dbName = `testdb_${Date.now()}`;
  let db: Database;
  let allCursors: ArrayCursor[];
  before(async () => {
    allCursors = [];
    db = new Database(config);
    if (Array.isArray(config.url)) await db.acquireHostList();
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
  });
  after(async () => {
    await Promise.all(
      allCursors.map((cursor) => cursor.kill().catch(() => undefined))
    );
    try {
      db.useDatabase("_system");
      await db.dropDatabase(dbName);
    } finally {
      db.close();
    }
  });

  describe("database.query", () => {
    it("returns a cursor for the query result", async () => {
      const cursor = await db.query("RETURN 23");
      allCursors.push(cursor);
      expect(cursor).to.be.an.instanceof(ArrayCursor);
    });
    it("throws an exception on error", async () => {
      try {
        const cursor = await db.query("FOR i IN no RETURN i");
        allCursors.push(cursor);
      } catch (err) {
        expect(err).is.instanceof(ArangoError);
        expect(err).to.have.property("code", 404);
        expect(err).to.have.property("errorNum", 1203);
        return;
      }
      expect.fail();
    });
    it("times out if a timeout is set and exceeded", async () => {
      try {
        const cursor = await db.query(aql`RETURN SLEEP(0.02)`, { timeout: 10 });
        allCursors.push(cursor);
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
        const cursor = await db.query(aql`RETURN SLEEP(0.01)`, {
          timeout: 1000,
        });
        allCursors.push(cursor);
      } catch (err) {
        expect.fail();
      }
    });
    it("supports bindVars", async () => {
      const cursor = await db.query("RETURN @x", { x: 5 });
      allCursors.push(cursor);
      const value = await cursor.next();
      expect(value).to.equal(5);
    });
    it("supports options", async () => {
      const cursor = await db.query("FOR x IN 1..10 RETURN x", undefined, {
        batchSize: 2,
        count: true,
      });
      allCursors.push(cursor);
      expect(cursor.count).to.equal(10);
      expect((cursor as any).batches.hasMore).to.equal(true);
    });
    it("supports AQB queries", async () => {
      const cursor = await db.query({ toAQL: () => "RETURN 42" });
      allCursors.push(cursor);
      const value = await cursor.next();
      expect(value).to.equal(42);
    });
    it("supports query objects", async () => {
      const cursor = await db.query({ query: "RETURN 1337", bindVars: {} });
      allCursors.push(cursor);
      const value = await cursor.next();
      expect(value).to.equal(1337);
    });
    it("supports compact queries", async () => {
      const cursor = await db.query({
        query: "RETURN @potato",
        bindVars: { potato: "tomato" },
      });
      allCursors.push(cursor);
      const value = await cursor.next();
      expect(value).to.equal("tomato");
    });
    it("supports compact queries with options", async () => {
      const query: any = {
        query: "FOR x IN RANGE(1, @max) RETURN x",
        bindVars: { max: 10 },
      };
      const cursor = await db.query(query, { batchSize: 2, count: true });
      allCursors.push(cursor);
      expect(cursor.count).to.equal(10);
      expect((cursor as any).batches.hasMore).to.equal(true);
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

  describe("database.queryTracking", () => {
    afterEach(async () => {
      await db.queryTracking({
        enabled: true,
        slowQueryThreshold: 5,
      });
      await db.clearSlowQueries();
    });
    it("returns the AQL query tracking properties", async () => {
      const result = await db.queryTracking({
        enabled: true,
        maxQueryStringLength: 64,
        maxSlowQueries: 2,
        slowQueryThreshold: 5,
        trackBindVars: true,
        trackSlowQueries: true,
      });
      expect(result).to.have.property("enabled", true);
      expect(result).to.have.property("maxQueryStringLength", 64);
      expect(result).to.have.property("maxSlowQueries", 2);
      expect(result).to.have.property("slowQueryThreshold", 5);
      expect(result).to.have.property("trackBindVars", true);
      expect(result).to.have.property("trackSlowQueries", true);
    });
  });

  describeNLB("database.listRunningQueries", () => {
    it("returns a list of running queries", async () => {
      // the sleep time here needs to be relatively high, so that in a slow
      // environment it is likely that the query still runs when we retrieve the
      // list of currently running queries
      const query = "RETURN SLEEP(3)";
      const p1 = db.query(query);
      p1.then((cursor) => allCursors.push(cursor));
      // must filter the list here, as there could be other (system) queries
      // ongoing at the same time
      const queries = (await db.listRunningQueries()).filter((i: any) => i.query === query);
      expect(queries).to.have.lengthOf(1);
      expect(queries[0]).to.have.property("bindVars");
      expect(queries[0]).to.have.property("query", query);
      await p1;
    });
  });

  describeNLB("database.listSlowQueries", () => {
    beforeEach(async () => {
      await db.queryTracking({
        enabled: true,
        slowQueryThreshold: 0.1,
        trackSlowQueries: true,
      });
      await db.clearSlowQueries();
    });
    afterEach(async () => {
      await db.queryTracking({
        enabled: true,
        slowQueryThreshold: 5,
      });
      await db.clearSlowQueries();
    });
    it("returns a list of slow queries", async () => {
      const query = "RETURN SLEEP(0.2)";
      const cursor = await db.query(query);
      allCursors.push(cursor);
      // must filter the list here, as there could have been other (system) queries
      const queries = (await db.listSlowQueries()).filter((i: any) => i.query === query);
      expect(queries).to.have.lengthOf(1);
      expect(queries[0]).to.have.property("query", query);
    });
  });

  describeNLB("database.clearSlowQueries", () => {
    beforeEach(async () => {
      await db.queryTracking({
        enabled: true,
        slowQueryThreshold: 0.1,
        trackSlowQueries: true,
      });
      await db.clearSlowQueries();
    });
    afterEach(async () => {
      await db.queryTracking({
        enabled: true,
        slowQueryThreshold: 5,
      });
      await db.clearSlowQueries();
    });
    it("clears the list of slow queries", async () => {
      const query = "RETURN SLEEP(0.2)";
      const cursor = await db.query(query);
      allCursors.push(cursor);
      // must filter the list here, as there could have been other (system) queries
      const queries1 = (await db.listSlowQueries()).filter((i: any) => i.query === query);
      expect(queries1).to.have.lengthOf(1);
      await db.clearSlowQueries();
      const queries2 = (await db.listSlowQueries()).filter((i: any) => i.query === query);
      expect(queries2).to.have.lengthOf(0);
    });
  });

  // FIXME rewrite this test to use async mode to eliminate the timing
  // dependence. This test is flakey on Jenkins otherwise.
  describe.skip("database.killQuery", () => {
    it("kills the given query", async () => {
      const query = "RETURN SLEEP(5)";
      const p1 = db.query(query);
      p1.then((cursor) => allCursors.push(cursor));
      const queries = (await db.listSlowQueries()).filter((i: any) => i.query === query);
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
