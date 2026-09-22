import { expect } from "chai";
import { aql } from "../aql.js";
import { Cursor } from "../cursors.js";
import { Database } from "../databases.js";
import { ArangoError } from "../errors.js";
import { Job } from "../jobs.js";
import { config } from "./_config.js";
import {
  clusterIntegrationTimeoutMs,
  waitForNewDatabase,
} from "./_integration-timeouts.js";

// Job results are coordinator-local; ROUND_ROBIN can poll a different host.
const describeNLB =
  config.loadBalancingStrategy === "ROUND_ROBIN" ? describe.skip : describe;

async function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

async function waitUntilJobLoaded<T>(
  job: Job<T>,
  timeoutMs = 30_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await job.load();
    if (job.isLoaded) return result as T;
    await sleep(50);
  }
  throw new Error(`Job ${job.id} did not complete within ${timeoutMs}ms`);
}

async function waitUntilJobFinished(
  job: Job,
  timeoutMs = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await job.getCompleted()) return;
    await sleep(50);
  }
  throw new Error(`Job ${job.id} did not finish within ${timeoutMs}ms`);
}

async function waitUntilJobListed(
  list: () => Promise<string[]>,
  jobId: string,
  timeoutMs = 10_000,
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let snapshot: string[] = [];
  while (Date.now() < deadline) {
    snapshot = await list();
    if (snapshot.includes(jobId)) return snapshot;
    await sleep(50);
  }
  throw new Error(`Job ${jobId} was not listed within ${timeoutMs}ms`);
}

describeNLB("Async Jobs API", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  const dbName = `testdb_${Date.now()}`;
  let system: Database, db: Database;
  let allCursors: Cursor[];
  const pendingJobs: Job[] = [];

  before(async () => {
    allCursors = [];
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") {
      await system.acquireHostList();
    }
    await system.createDatabase(dbName);
    db = system.database(dbName);
    await waitForNewDatabase(db);
  });

  afterEach(async () => {
    while (pendingJobs.length) {
      const job = pendingJobs.pop();
      if (!job) continue;
      await job.cancel().catch(() => undefined);
    }
    await db.deleteAllJobResults().catch(() => undefined);
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

  describe("database.createJob", () => {
    it("runs a request asynchronously and exposes the result on the Job", async () => {
      const job = await db.createJob(() => db.query(aql`RETURN 23`));
      expect(job).to.be.an.instanceof(Job);
      expect(job.id).to.be.a("string").that.is.not.empty;
      expect(job.database).to.equal(db);
      expect(job.isLoaded).to.equal(false);
      expect(job.result).to.equal(undefined);

      const cursor = await waitUntilJobLoaded(job);
      allCursors.push(cursor);
      expect(job.isLoaded).to.equal(true);
      expect(cursor).to.be.an.instanceof(Cursor);
      expect(job.result).to.equal(cursor);
      expect(await cursor.next()).to.equal(23);
    });

    it("propagates a failed async request through job.load", async () => {
      const job = await db.createJob(() => db.query("FOR i IN no RETURN i"));
      await waitUntilJobFinished(job);
      try {
        await job.load();
      } catch (err: any) {
        expect(err).to.be.instanceOf(ArangoError);
        expect(err).to.have.property("code", 404);
        expect(err).to.have.property("errorNum", 1203);
        return;
      }
      expect.fail();
    });
  });

  describe("database.job", () => {
    it("returns a Job instance for the given id", async () => {
      const created = await db.createJob(() => db.version());
      const job = db.job(created.id);
      expect(job).to.be.an.instanceof(Job);
      expect(job.id).to.equal(created.id);
      expect(job.database).to.equal(db);
      expect(job.isLoaded).to.equal(false);

      expect(await job.getCompleted()).to.be.a("boolean");
      const result = await waitUntilJobLoaded(job);
      expect(result).to.have.property("server");
      expect(result).to.have.property("version");
      expect(job.isLoaded).to.equal(true);
    });
  });

  describe("job.getCompleted", () => {
    it("returns false while the job is pending and true when it is done", async () => {
      const job = await db.createJob(() => db.query(aql`RETURN SLEEP(5)`));
      pendingJobs.push(job);
      expect(await job.getCompleted()).to.equal(false);
      await waitUntilJobFinished(job);
      expect(await job.getCompleted()).to.equal(true);
      const cursor = await job.load();
      expect(job.isLoaded).to.equal(true);
      expect(cursor).to.be.an.instanceof(Cursor);
      allCursors.push(cursor!);
    });
  });

  describe("database.listPendingJobs", () => {
    it("includes a still-running job id", async () => {
      const job = await db.createJob(() => db.query(aql`RETURN SLEEP(20)`));
      pendingJobs.push(job);
      const pending = await waitUntilJobListed(
        () => db.listPendingJobs(),
        job.id,
      );
      expect(pending).to.be.an("array").that.includes(job.id);
      await job.cancel();
    });
  });

  describe("database.listCompletedJobs", () => {
    it("includes a finished job until its result is fetched", async () => {
      const job = await db.createJob(() => db.version());
      await waitUntilJobFinished(job);
      const completed = await waitUntilJobListed(
        () => db.listCompletedJobs(),
        job.id,
      );
      expect(completed).to.be.an("array").that.includes(job.id);
      await job.load();
      expect(await db.listCompletedJobs()).to.not.include(job.id);
    });
  });

  describe("job.cancel", () => {
    it("cancels a still-running job", async () => {
      const job = await db.createJob(() => db.query(aql`RETURN SLEEP(30)`));
      pendingJobs.push(job);
      await waitUntilJobListed(() => db.listPendingJobs(), job.id);
      await job.cancel();
      await waitUntilJobFinished(job);
      try {
        await job.load();
      } catch (err: any) {
        expect(err).to.be.instanceOf(ArangoError);
        return;
      }
      // Cancel can lose the race if the query already finished.
      expect(job.isLoaded).to.equal(true);
    });
  });

  describe("job.deleteResult", () => {
    it("removes a completed job result", async () => {
      const job = await db.createJob(() => db.version());
      await waitUntilJobFinished(job);
      await waitUntilJobListed(() => db.listCompletedJobs(), job.id);
      await job.deleteResult();
      const completed = await db.listCompletedJobs();
      expect(completed).to.not.include(job.id);
      try {
        await db.job(job.id).getCompleted();
      } catch (err: any) {
        expect(err).to.be.instanceOf(ArangoError);
        expect(err).to.have.property("code", 404);
        return;
      }
      expect.fail();
    });
  });

  describe("database.deleteExpiredJobResults", () => {
    it("deletes only results older than the threshold", async () => {
      const job = await db.createJob(() => db.version());
      await waitUntilJobFinished(job);
      await waitUntilJobListed(() => db.listCompletedJobs(), job.id);

      await db.deleteExpiredJobResults(Date.now() - 60 * 60 * 1000);
      expect(await db.listCompletedJobs()).to.include(job.id);

      await db.deleteExpiredJobResults(Date.now() + 60 * 1000);
      expect(await db.listCompletedJobs()).to.not.include(job.id);
    });
  });

  describe("database.deleteAllJobResults", () => {
    it("deletes every completed job result", async () => {
      const jobA = await db.createJob(() => db.version());
      const jobB = await db.createJob(() => db.version());
      await waitUntilJobFinished(jobA);
      await waitUntilJobFinished(jobB);
      await waitUntilJobListed(() => db.listCompletedJobs(), jobA.id);
      await waitUntilJobListed(() => db.listCompletedJobs(), jobB.id);

      await db.deleteAllJobResults();
      const completed = await db.listCompletedJobs();
      expect(completed).to.not.include(jobA.id);
      expect(completed).to.not.include(jobB.id);
    });
  });
});
