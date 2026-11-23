/*
 * DE-1274: AQL execution plan cache support (ArangoDB 3.12.4 and later).
 *
 * Database-free Fetch tests cover query/explain option forwarding (true, false,
 * and omission), overloads, optional explain metadata, and exact cursor-key
 * retention across batches, exhaustion, and disposal. They also verify plan-cache
 * listing/clearing, separation from the results-cache APIs, and error propagation.
 *
 * Integration tests cover cold versus cached plans, single/multiple/streaming
 * batches, changed value bind parameters, explain keys, ineligible queries
 * (including allPlans), cache-entry metadata, clearing, and database isolation.
 * Plan-cache integration tests use the live server version: they run on
 * ArangoDB 3.12.4 and newer and skip on older servers. Database-free tests and
 * ordinary query/explain compatibility tests run regardless of server version.
 *
 * A dedicated file keeps the Fetch tests independent of server setup and gives
 * integration cases their own disposable database and single-Coordinator
 * connection. Coordinator affinity is required because plan caches are local
 * to each Coordinator. Both suites also run through the browser test runner.
 */
import { expect } from "chai";
import { aql, literal } from "../aql.js";
import type { Cursor } from "../cursors.js";
import { Database } from "../databases.js";
import { ArangoError } from "../errors.js";
import type { QueryOptions, QueryPlanCacheEntry } from "../queries.js";
import { fetchArangoVersionCode } from "./_arango-server-version.js";
import { config } from "./_config.js";
import {
  clusterIntegrationTimeoutMs,
  waitForNewDatabase,
} from "./_integration-timeouts.js";

const planCacheKey = "18446744073709551614";

describe("AQL query plan cache request/response mapping", () => {
  let db: Database;
  let originalFetch: typeof globalThis.fetch;
  let requests: Request[];
  let responses: { body: unknown; status?: number }[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    requests = [];
    responses = [];
    globalThis.fetch = async (input) => {
      requests.push(input as Request);
      const response = responses.shift() ?? {
        body: { result: [1], hasMore: false, extra: { warnings: [] } },
      };
      return new Response(JSON.stringify(response.body), {
        status: response.status ?? 200,
        headers: { "content-type": "application/json" },
      });
    };
    db = new Database({
      url: "http://localhost:8529",
      databaseName: "plans ?#",
      maxRetries: false,
    });
  });
  afterEach(() => {
    db.close();
    globalThis.fetch = originalFetch;
  });

  for (const usePlanCache of [true, false, undefined]) {
    it(`serializes usePlanCache=${usePlanCache} through query and explain overloads`, async () => {
      const options: { usePlanCache?: boolean } =
        usePlanCache === undefined ? {} : { usePlanCache };
      await db.query("RETURN @value", { value: 1 }, options);
      await db.query(aql`RETURN ${1}`, options);
      await db.query(literal("RETURN @value"), { value: 1 }, options);
      await db.explain("RETURN @value", { value: 1 }, options);
      await db.explain(aql`RETURN ${1}`, options);
      await db.explain(literal("RETURN @value"), { value: 1 }, options);

      expect(requests).to.have.lengthOf(6);
      for (const request of requests) {
        const body = (await request.json()) as {
          options: { usePlanCache?: boolean };
          bindVars: Record<string, unknown>;
        };
        expect(request.method).to.equal("POST");
        expect(body).not.to.have.property("usePlanCache");
        if (usePlanCache === undefined) {
          expect(body.options).not.to.have.property("usePlanCache");
        } else {
          expect(body.options).to.have.property("usePlanCache", usePlanCache);
        }
        expect(Object.values(body.bindVars)).to.deep.equal([1]);
        expect(new URL(request.url).pathname).to.equal(
          "/_db/plans%20%3F%23/_api/" +
            (requests.indexOf(request) < 3 ? "cursor" : "explain"),
        );
      }
    });
  }

  it("retains the exact cursor key across batches that omit it and exhaustion", async () => {
    responses.push(
      {
        body: {
          result: [1],
          id: "cursor",
          nextBatchId: "2",
          hasMore: true,
          count: 3,
          extra: { warnings: [] },
          planCacheKey,
        },
      },
      { body: { result: [2, 3], hasMore: false } },
    );
    const cursor = await db.query<number>("FOR i IN 1..3 RETURN i");
    expect(cursor.planCacheKey).to.equal(planCacheKey);
    expect(cursor.batches.planCacheKey).to.equal(planCacheKey);
    expect(cursor.count).to.equal(3);
    expect(cursor.extra.warnings).to.deep.equal([]);
    expect(await cursor.all()).to.deep.equal([1, 2, 3]);
    expect(cursor.planCacheKey).to.equal(planCacheKey);
    expect(cursor.batches.planCacheKey).to.equal(planCacheKey);
    expect(requests[1].url).to.equal(
      "http://localhost:8529/_db/plans%20%3F%23/_api/cursor/cursor/2",
    );
    await cursor.kill();
    expect(cursor.planCacheKey).to.equal(planCacheKey);
  });

  it("retains the cursor key after explicit disposal", async () => {
    responses.push(
      { body: { result: [1], id: "cursor", hasMore: true, planCacheKey } },
      { body: { error: false, code: 202 } },
    );
    const cursor = await db.query("FOR i IN 1..3 RETURN i");
    await cursor.kill();
    expect(cursor.hasNext).to.equal(false);
    expect(cursor.planCacheKey).to.equal(planCacheKey);
    expect(cursor.batches.planCacheKey).to.equal(planCacheKey);
    expect(requests[1].method).to.equal("DELETE");
  });

  it("supports cursor responses without a plan-cache key", async () => {
    const cursor = await db.query("RETURN 1");
    expect(cursor.planCacheKey).to.equal(undefined);
    expect(cursor.batches.planCacheKey).to.equal(undefined);
    expect(await cursor.all()).to.deep.equal([1]);
  });

  it("exposes optional explain metadata in both result types", async () => {
    responses.push(
      { body: { plan: {}, planCacheKey } },
      { body: { plans: [] } },
      { body: { plan: {} } },
    );
    const single = await db.explain("RETURN 1", {}, { usePlanCache: true });
    expect(single.planCacheKey).to.equal(planCacheKey);
    const multi = await db.explain("RETURN 1", {}, { allPlans: true });
    expect(multi.planCacheKey).to.equal(undefined);
    expect((await db.explain("RETURN 1")).planCacheKey).to.equal(undefined);
  });

  it("lists and clears execution plans separately from cached results", async () => {
    const entry: QueryPlanCacheEntry = {
      hash: planCacheKey,
      query: "RETURN 1",
      queryHash: 1,
      bindVars: {},
      fullCount: false,
      dataSources: [],
      created: "2026-01-01T00:00:00Z",
      hits: 2,
      memoryUsage: 1024,
    };
    responses.push(
      { body: [entry] },
      { body: { error: false, code: 200 } },
      { body: [] },
      { body: { error: false, code: 200 } },
      { body: {} },
      { body: {} },
    );
    const entries: QueryPlanCacheEntry[] = await db.listQueryPlanCacheEntries();
    expect(entries).to.deep.equal([entry]);
    const cleared: void = await db.clearQueryPlanCache();
    expect(cleared).to.equal(undefined);
    await db.listQueryCacheEntries();
    await db.clearQueryCache();
    await db.getQueryCacheProperties();
    await db.setQueryCacheProperties({ mode: "off" });
    expect(
      requests.map((r) => [r.method, new URL(r.url).pathname]),
    ).to.deep.equal([
      ["GET", "/_db/plans%20%3F%23/_api/query-plan-cache"],
      ["DELETE", "/_db/plans%20%3F%23/_api/query-plan-cache"],
      ["GET", "/_db/plans%20%3F%23/_api/query-cache/entries"],
      ["DELETE", "/_db/plans%20%3F%23/_api/query-cache"],
      ["GET", "/_db/plans%20%3F%23/_api/query-cache/properties"],
      ["PUT", "/_db/plans%20%3F%23/_api/query-cache/properties"],
    ]);
    expect(await requests[0].text()).to.equal("");
    expect(await requests[1].text()).to.equal("");
  });

  for (const [status, errorNum] of [
    [400, 1584],
    [500, 1584],
    [403, 11],
    [404, 404],
  ]) {
    it(`preserves server errors (${status}/${errorNum})`, async () => {
      const operations =
        errorNum === 1584
          ? [
              () => db.query("RETURN 1", {}, { usePlanCache: true }),
              () => db.explain("RETURN 1", {}, { usePlanCache: true }),
            ]
          : [
              () => db.listQueryPlanCacheEntries(),
              () => db.clearQueryPlanCache(),
            ];
      for (const operation of operations) {
        responses.push({
          status,
          body: {
            error: true,
            code: status,
            errorNum,
            errorMessage: "server message",
          },
        });
        try {
          await operation();
          expect.fail("Expected the server error");
        } catch (error: any) {
          expect(error).to.be.instanceOf(ArangoError);
          expect(error.code).to.equal(status);
          expect(error.errorNum).to.equal(errorNum);
          expect(error.message).to.contain("server message");
        }
      }
      expect(requests).to.have.lengthOf(2);
    });
  }
});

describe("AQL query plan cache integration", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  const dbName = `testdb_plans_${Date.now()}`;
  const query = "FOR i IN 1..5 RETURN i";
  let system: Database, db: Database;
  let created = false;
  let version: number;
  let cursors: Cursor[] = [];

  before(async () => {
    // Each Coordinator has its own cache. Use a fresh connection to exactly one
    // endpoint, without host discovery or a shared round-robin connection.
    system = new Database({
      ...config,
      url: Array.isArray(config.url) ? config.url[0] : config.url,
      loadBalancingStrategy: "NONE",
      maxRetries: false,
    });
    await system.createDatabase(dbName);
    created = true;
    db = system.database(dbName);
    await waitForNewDatabase(db);
    version = await fetchArangoVersionCode(db);
  });
  afterEach(async () => {
    await Promise.all(
      cursors.map((cursor) => cursor.kill().catch(() => undefined)),
    );
    cursors = [];
  });
  after(async () => {
    try {
      if (created) await system.dropDatabase(dbName);
    } finally {
      system?.close();
    }
  });

  async function execute(options: QueryOptions = {}) {
    const cursor = await db.query<number>(
      query,
      {},
      {
        cache: false,
        usePlanCache: true,
        ...options,
      },
    );
    cursors.push(cursor);
    return cursor;
  }

  it("supports ordinary queries and explains without plan-cache metadata", async () => {
    const cursor = await db.query<number>(query, {}, { cache: false });
    cursors.push(cursor);
    expect(await cursor.all()).to.deep.equal([1, 2, 3, 4, 5]);
    expect(cursor.planCacheKey).to.equal(undefined);
    expect(cursor.batches.planCacheKey).to.equal(undefined);
    expect((await db.explain(query)).planCacheKey).to.equal(undefined);
  });

  describe("ArangoDB 3.12.4+", () => {
    before(function () {
      if (version < 31204) this.skip();
    });
    beforeEach(async () => {
      await db.clearQueryPlanCache();
    });

    for (const [mode, options] of [
      ["single batch", {}],
      ["multiple batches", { batchSize: 2 }],
      ["streaming", { batchSize: 2, stream: true }],
    ] as const) {
      it(`exposes cache-hit metadata for ${mode}`, async () => {
        const cold = await execute(options);
        expect(cold.planCacheKey).to.equal(undefined);
        await cold.all();
        const warm = await execute(options);
        const key: string | undefined = warm.planCacheKey;
        expect(key).to.be.a("string").and.not.equal("");
        expect(warm.batches.planCacheKey).to.equal(key);
        expect(await warm.all()).to.deep.equal([1, 2, 3, 4, 5]);
        expect(warm.planCacheKey).to.equal(key);
        expect(warm.batches.planCacheKey).to.equal(key);
        expect(
          (await db.listQueryPlanCacheEntries()).some((e) => e.hash === key),
        ).to.equal(true);
      });
    }

    it("reuses a plan with different value bind parameters", async () => {
      const cold = await db.query(
        "RETURN @value",
        { value: 1 },
        { cache: false, usePlanCache: true },
      );
      cursors.push(cold);
      expect(await cold.all()).to.deep.equal([1]);
      const warm = await db.query(
        "RETURN @value",
        { value: 2 },
        { cache: false, usePlanCache: true },
      );
      cursors.push(warm);
      expect(await warm.all()).to.deep.equal([2]);
      expect(warm.planCacheKey).to.be.a("string");
    });

    it("returns the cached plan key from explain", async () => {
      await (await execute()).all();
      const warm = await execute();
      await warm.all();
      const explained = await db.explain(query, {}, { usePlanCache: true });
      expect(explained.planCacheKey).to.equal(warm.planCacheKey);
    });

    for (const operation of ["query", "explain"] as const) {
      it(`propagates error 1584 for an ineligible ${operation}`, async () => {
        try {
          const ineligible = "RETURN { value: 1 }.@attribute";
          const bindVars = { attribute: "value" };
          if (operation === "query") {
            cursors.push(
              await db.query(ineligible, bindVars, { usePlanCache: true }),
            );
          } else {
            await db.explain(ineligible, bindVars, { usePlanCache: true });
          }
          expect.fail("Expected an ineligible query error");
        } catch (error: any) {
          expect(error).to.be.instanceOf(ArangoError);
          expect(error.errorNum).to.equal(1584);
          expect(error.response.status).to.be.at.least(400);
          expect(error.code).to.equal(error.response.parsedBody.code);
        }
      });
    }

    it("preserves the server rejection of allPlans with plan caching", async () => {
      try {
        await db.explain(query, {}, { allPlans: true, usePlanCache: true });
        expect.fail("Expected an ineligible query error");
      } catch (error: any) {
        expect(error).to.be.instanceOf(ArangoError);
        expect(error.errorNum).to.equal(1584);
      }
    });

    it("lists typed cache entries and clears them", async () => {
      await (await execute()).all();
      const warm = await execute();
      await warm.all();
      const entries: QueryPlanCacheEntry[] =
        await db.listQueryPlanCacheEntries();
      const entry = entries.find((e) => e.hash === warm.planCacheKey)!;
      expect(entry).not.to.equal(undefined);
      expect(entry.query).to.equal(query);
      expect(entry.queryHash).to.be.a("number");
      expect(entry.bindVars).to.deep.equal({});
      expect(entry.fullCount).to.equal(false);
      expect(entry.dataSources).to.deep.equal([]);
      expect(Number.isFinite(Date.parse(entry.created))).to.equal(true);
      expect(entry.hits).to.be.at.least(1);
      expect(entry.memoryUsage).to.be.greaterThan(0);
      expect(await db.clearQueryPlanCache()).to.equal(undefined);
      expect(await db.listQueryPlanCacheEntries()).to.deep.equal([]);
    });

    it("clears only the selected database's cache", async () => {
      const otherName = `${dbName}_other`;
      const other = await system.createDatabase(otherName);
      try {
        await waitForNewDatabase(other);
        await (await execute()).all();
        const cursor = await other.query(
          query,
          {},
          { cache: false, usePlanCache: true },
        );
        cursors.push(cursor);
        await cursor.all();
        await db.clearQueryPlanCache();
        expect(await db.listQueryPlanCacheEntries()).to.deep.equal([]);
        expect(
          (await other.listQueryPlanCacheEntries()).some(
            (e) => e.query === query,
          ),
        ).to.equal(true);
      } finally {
        await system.dropDatabase(otherName);
      }
    });
  });
});
