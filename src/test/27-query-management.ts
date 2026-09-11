import { expect } from "chai";
import { aql } from "../aql.js";
import { DocumentCollection } from "../collections.js";
import { Cursor } from "../cursors.js";
import { Database } from "../databases.js";
import { ArangoError, ResponseTimeoutError } from "../errors.js";
import type { QueryCacheProperties } from "../queries.js";
import { fetchArangoVersionCode } from "./_arango-server-version.js";
import { config } from "./_config.js";
import {
  clusterIntegrationTimeoutMs,
  propagationForResourceMs,
  waitForNewDatabase,
} from "./_integration-timeouts.js";

// NOTE These tests will not reliably work with load balancing.
const describeNLB =
  config.loadBalancingStrategy === "ROUND_ROBIN" ? describe.skip : describe;

async function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

describe("Query Management API", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  const dbName = `testdb_${Date.now()}`;
  let system: Database, db: Database;
  let allCursors: Cursor[];
  let arangoVersionCode: number;
  let serverRole: string;
  before(async () => {
    allCursors = [];
    system = new Database(config);
    if (Array.isArray(config.url)) await system.acquireHostList();
    await system.createDatabase(dbName);
    db = system.database(dbName);
    await waitForNewDatabase(db);
    arangoVersionCode = await fetchArangoVersionCode(db);
    const roleRes = await db.route("/_admin/server/role").get();
    serverRole = roleRes.parsedBody.role;
  });
  after(async () => {
    await Promise.all(
      allCursors.map((cursor) => cursor.kill().catch(() => undefined)),
    );
    try {
      await system.dropDatabase(dbName);
    } finally {
      system.close();
    }
  });

  describe("database.query", () => {
    it("returns a cursor for the query result", async () => {
      const cursor = await db.query("RETURN 23");
      allCursors.push(cursor);
      expect(cursor).to.be.an.instanceof(Cursor);
    });
    it("throws an exception on error", async () => {
      try {
        const cursor = await db.query("FOR i IN no RETURN i");
        allCursors.push(cursor);
      } catch (err: any) {
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
      } catch (err: any) {
        expect(err).is.instanceof(Error);
        expect(err).is.not.instanceof(ArangoError);
        expect(err).is.instanceof(ResponseTimeoutError);
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
      } catch (err: any) {
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
      expect(cursor.batches.hasMore).to.equal(true);
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
      expect(cursor.batches.hasMore).to.equal(true);
    });
  });

  describe("database.explain", () => {
    it("returns an explanation", async () => {
      const result = await db.explain(aql`FOR x IN RANGE(1, ${10}) RETURN x`);
      expect(result.plan).to.have.property("nodes");
    });
    it("supports fullCount option", async () => {
      const result = await db.explain(
        "FOR x IN RANGE(1, 10) LIMIT 5 RETURN x",
        undefined,
        { fullCount: true },
      );
      expect(result.plan).to.have.property("nodes");
    });
    it("supports profile option", async () => {
      const result = await db.explain(
        "FOR x IN RANGE(1, 10) RETURN x",
        undefined,
        { profile: 2 },
      );
      expect(result.stats).to.have.property("rules");
    });
    it("supports maxWarningCount option", async () => {
      const result = await db.explain(
        "FOR i IN 1..10 RETURN 1 / 0",
        undefined,
        { maxWarningCount: 5 },
      );
      expect(result.warnings).to.be.an("array");
      expect(result.warnings.length).to.be.at.most(5);
    });
    it("supports failOnWarning option", async () => {
      try {
        await db.explain(
          "FOR i IN 1..10 RETURN 1 / 0",
          undefined,
          { failOnWarning: true },
        );
      } catch (err: any) {
        expect(err).to.be.an("error");
        return;
      }
      expect.fail("Should have thrown an error");
    });
    it("supports maxNodesPerCallstack option", async () => {
      const result = await db.explain(
        "FOR x IN RANGE(1, 10) RETURN x",
        undefined,
        { maxNodesPerCallstack: 100 },
      );
      expect(result.plan).to.have.property("nodes");
    });
    it("supports all new options together", async () => {
      const result = await db.explain(
        "FOR x IN RANGE(1, 10) LIMIT 5 RETURN x",
        undefined,
        {
          fullCount: true,
          profile: 2,
          maxWarningCount: 3,
          maxNodesPerCallstack: 200,
          failOnWarning: false,
        },
      );
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
      expect(result).to.have.property("slowStreamingQueryThreshold");
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
        slowStreamingQueryThreshold: 10,
        trackBindVars: true,
        trackSlowQueries: true,
      });
      expect(result).to.have.property("enabled", true);
      expect(result).to.have.property("maxQueryStringLength", 64);
      expect(result).to.have.property("maxSlowQueries", 2);
      expect(result).to.have.property("slowQueryThreshold", 5);
      expect(result).to.have.property("slowStreamingQueryThreshold", 10);
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
      let queries: any;
      // query was dispatched in an async way, so now we need to wait for the query
      // to actually start running on the server
      for (let tries = 0; tries < 100; tries++) {
        // must filter the list here, as there could be other (system) queries
        // ongoing at the same time
        queries = (await db.listRunningQueries()).filter(
          (i: any) => i.query === query,
        );
        if (queries.length > 0) {
          break;
        }
        await sleep(100);
      }

      expect(queries).to.have.lengthOf(1);
      expect(queries[0]).to.have.property("bindVars");
      expect(queries[0]).to.have.property("query", query);
      if (arangoVersionCode >= 31200) {
        expect(queries[0]).to.have.property("modificationQuery");
        expect(queries[0].modificationQuery).to.be.a("boolean");
        // exitCode should not be present in running queries (only in slow/finished queries)
        expect(queries[0]).to.not.have.property("exitCode");
      }
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
      const queries = (await db.listSlowQueries()).filter(
        (i: any) => i.query === query,
      );
      expect(queries).to.have.lengthOf(1);
      expect(queries[0]).to.have.property("query", query);
      if (arangoVersionCode >= 31200) {
        expect(queries[0]).to.have.property("modificationQuery");
        expect(queries[0].modificationQuery).to.be.a("boolean");
        expect(queries[0]).to.have.property("exitCode");
        expect(queries[0].exitCode).to.be.a("number");
        // exitCode should be 0 for successful queries
        expect(queries[0].exitCode).to.equal(0);
      }
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
      const queries1 = (await db.listSlowQueries()).filter(
        (i: any) => i.query === query,
      );
      expect(queries1).to.have.lengthOf(1);
      await db.clearSlowQueries();
      const queries2 = (await db.listSlowQueries()).filter(
        (i: any) => i.query === query,
      );
      expect(queries2).to.have.lengthOf(0);
    });
  });

  describe("database.getQueryCacheProperties", () => {
    it("returns the AQL query cache properties", async () => {
      const result = await db.getQueryCacheProperties();
      expect(result).to.have.property("includeSystem");
      expect(result.includeSystem).to.be.a("boolean");
      expect(result).to.have.property("maxEntrySize");
      expect(result.maxEntrySize).to.be.a("number");
      expect(result).to.have.property("maxResults");
      expect(result.maxResults).to.be.a("number");
      expect(result).to.have.property("maxResultsSize");
      expect(result.maxResultsSize).to.be.a("number");
      expect(result).to.have.property("mode");
      expect(result.mode).to.be.oneOf(["off", "on", "demand"]);
      const fromSystem = await system.getQueryCacheProperties();
      expect(fromSystem).to.have.property("mode", result.mode);
      expect(fromSystem).to.have.property("maxResults", result.maxResults);
      expect(fromSystem).to.have.property(
        "maxResultsSize",
        result.maxResultsSize,
      );
      expect(fromSystem).to.have.property("maxEntrySize", result.maxEntrySize);
      expect(fromSystem).to.have.property(
        "includeSystem",
        result.includeSystem,
      );
    });
  });

  describeNLB("database.setQueryCacheProperties", () => {
    let originalProperties: QueryCacheProperties;
    before(async () => {
      originalProperties = await db.getQueryCacheProperties();
    });
    after(async () => {
      if (originalProperties) {
        await system.setQueryCacheProperties(originalProperties);
      }
    });
    it("adjusts the AQL query cache properties", async () => {
      const maxResults = originalProperties.maxResults === 128 ? 64 : 128;
      const maxEntrySize =
        originalProperties.maxEntrySize === 16777216 ? 8388608 : 16777216;
      const maxResultsSize =
        originalProperties.maxResultsSize === 268435456
          ? 134217728
          : 268435456;
      const includeSystem = !originalProperties.includeSystem;
      const result = await system.setQueryCacheProperties({
        mode: "demand",
        maxResults,
        maxEntrySize,
        maxResultsSize,
        includeSystem,
      });
      expect(result).to.have.property("mode", "demand");
      expect(result).to.have.property("maxResults", maxResults);
      expect(result).to.have.property("maxEntrySize", maxEntrySize);
      expect(result).to.have.property("maxResultsSize", maxResultsSize);
      expect(result).to.have.property("includeSystem", includeSystem);
      const fetched = await db.getQueryCacheProperties();
      expect(fetched).to.have.property("mode", "demand");
      expect(fetched).to.have.property("maxResults", maxResults);
      expect(fetched).to.have.property("maxEntrySize", maxEntrySize);
      expect(fetched).to.have.property("maxResultsSize", maxResultsSize);
      expect(fetched).to.have.property("includeSystem", includeSystem);
    });
  });

  describeNLB("database.listQueryCacheEntries", () => {
    let originalProperties: QueryCacheProperties;
    let collection: DocumentCollection;
    let query: string;
    before(async function () {
      // Query results cache is single-server only; the HTTP list API still
      // returns [] on coordinators.
      if (serverRole !== "SINGLE") this.skip();
      originalProperties = await db.getQueryCacheProperties();
      collection = await db.createCollection(`query-cache-${Date.now()}`);
      await db.waitForPropagation(
        { pathname: `/_api/collection/${collection.name}` },
        propagationForResourceMs,
      );
      await collection.save({ value: 1 });
      await collection.save({ value: 2 });
      query = `FOR doc IN \`${collection.name}\` RETURN doc.value`;
      await system.setQueryCacheProperties({ mode: "demand" });
      await db.clearQueryCache();
    });
    after(async () => {
      if (!originalProperties) return;
      try {
        await db.clearQueryCache();
      } finally {
        await system.setQueryCacheProperties(originalProperties);
      }
    });
    it("returns a list of query cache entries", async () => {
      const empty = await db.listQueryCacheEntries();
      expect(empty).to.be.an("array");
      expect(
        empty.filter((entry) => entry.query === query),
      ).to.have.lengthOf(0);

      const cursor1 = await db.query(query, undefined, { cache: true });
      allCursors.push(cursor1);
      expect(await cursor1.all()).to.have.lengthOf(2);
      const cursor2 = await db.query(query, undefined, { cache: true });
      allCursors.push(cursor2);
      expect(await cursor2.all()).to.have.lengthOf(2);

      const entries = (await db.listQueryCacheEntries()).filter(
        (entry) => entry.query === query,
      );
      expect(entries).to.have.lengthOf(1);
      expect(entries[0]).to.have.property("hash");
      expect(entries[0].hash).to.be.a("string");
      expect(entries[0]).to.have.property("query", query);
      expect(entries[0]).to.have.property("size");
      expect(entries[0].size).to.be.a("number");
      expect(entries[0]).to.have.property("results", 2);
      expect(entries[0]).to.have.property("started");
      expect(entries[0].started).to.be.a("string");
      expect(entries[0]).to.have.property("hits");
      expect(entries[0].hits).to.be.a("number");
      expect(entries[0].hits).to.be.at.least(1);
      expect(entries[0]).to.have.property("runTime");
      expect(entries[0].runTime).to.be.a("number");
      expect(entries[0]).to.have.property("dataSources");
      expect(entries[0].dataSources).to.be.an("array").that.includes(
        collection.name,
      );
    });
  });

  describeNLB("database.clearQueryCache", () => {
    let originalProperties: QueryCacheProperties;
    let collection: DocumentCollection;
    let query: string;
    before(async function () {
      // Query results cache is single-server only; there are no entries to
      // clear on coordinators.
      if (serverRole !== "SINGLE") this.skip();
      originalProperties = await db.getQueryCacheProperties();
      collection = await db.createCollection(`query-cache-clear-${Date.now()}`);
      await db.waitForPropagation(
        { pathname: `/_api/collection/${collection.name}` },
        propagationForResourceMs,
      );
      await collection.save({ value: 1 });
      query = `FOR doc IN \`${collection.name}\` SORT doc.value RETURN doc.value`;
      await system.setQueryCacheProperties({ mode: "demand" });
      await db.clearQueryCache();
    });
    after(async () => {
      if (!originalProperties) return;
      try {
        await db.clearQueryCache();
      } finally {
        await system.setQueryCacheProperties(originalProperties);
      }
    });
    it("clears the list of query cache entries", async () => {
      const cursor = await db.query(query, undefined, { cache: true });
      allCursors.push(cursor);
      await cursor.all();
      const entries1 = (await db.listQueryCacheEntries()).filter(
        (entry) => entry.query === query,
      );
      expect(entries1).to.have.lengthOf(1);
      await db.clearQueryCache();
      const entries2 = (await db.listQueryCacheEntries()).filter(
        (entry) => entry.query === query,
      );
      expect(entries2).to.have.lengthOf(0);
    });
  });

  // FIXME rewrite this test to use async mode to eliminate the timing
  // dependence. This test is flakey on Jenkins otherwise.
  describe.skip("database.killQuery", () => {
    it("kills the given query", async () => {
      const query = "RETURN SLEEP(5)";
      const p1 = db.query(query);
      p1.then((cursor) => allCursors.push(cursor));
      const queries = (await db.listSlowQueries()).filter(
        (i: any) => i.query === query,
      );
      expect(queries).to.have.lengthOf(1);
      expect(queries[0]).to.have.property("bindVars");
      expect(queries[0]).to.have.property("query", query);
      await db.killQuery(queries[0].id);
      try {
        await p1;
      } catch (e: any) {
        expect(e).to.be.instanceOf(ArangoError);
        expect(e).to.have.property("errorNum", 1500);
        expect(e).to.have.property("code", 410);
        return;
      }
      expect.fail();
    });
  });
});
