import { expect } from "chai";
import { DocumentCollection } from "../collection";
import { Database } from "../database";
import { config } from "./_config";

const range = (n: number): number[] => Array.from(Array(n).keys());

const describe39 = config.arangoVersion! >= 30900 ? describe : describe.skip;

describe39("Queue time metrics", function () {
  const dbName = `testdb_${Date.now()}`;
  let system: Database, db: Database;
  let collection: DocumentCollection;
  before(async () => {
    system = new Database(config);
    system.setResponseQueueTimeSamples(10);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
    await system.createDatabase(dbName);
    db = system.database(dbName);
    collection = await db.createCollection(`c_${Date.now()}`);
    await db.waitForPropagation(
      { path: `/_api/collection/${collection.name}` },
      10000
    );
  });
  after(async () => {
    await system.dropDatabase(dbName);
  });
  beforeEach(async () => {
    (system as any)._connection._queueTimes.clear();
  });
  describe("db.setResponseQueueTimeSamples", () => {
    afterEach(() => {
      system.setResponseQueueTimeSamples(10);
    });
    it("should trim existing queue times when set to a lower value", async () => {
      await Promise.all(
        range(10).map(() => collection.save({ value: Math.random() }))
      );
      expect(db.queueTime.getValues().length).to.equal(10);
      db.setResponseQueueTimeSamples(5);
      expect(db.queueTime.getValues().length).to.equal(5);
    });
    it("should allow more values when set to a higher value", async () => {
      await Promise.all(
        range(10).map(() => collection.save({ value: Math.random() }))
      );
      expect(db.queueTime.getValues().length).to.equal(10);
      db.setResponseQueueTimeSamples(20);
      await Promise.all(
        range(10).map(() => collection.save({ value: Math.random() }))
      );
      expect(db.queueTime.getValues().length).to.equal(20);
    });
    it("should allow fewer values when set to a lower value", async () => {
      await Promise.all(
        range(10).map(() => collection.save({ value: Math.random() }))
      );
      expect(db.queueTime.getValues().length).to.equal(10);
      db.setResponseQueueTimeSamples(5);
      await Promise.all(
        range(10).map(() => collection.save({ value: Math.random() }))
      );
      expect(db.queueTime.getValues().length).to.equal(5);
    });
  });
  describe("db.queueTime.getLatest", () => {
    it("should return the latest value", async () => {
      expect(db.queueTime.getLatest()).to.equal(undefined);
      await Promise.all(
        range(10).map(() => collection.save({ value: Math.random() }))
      );
      const values = db.queueTime.getValues();
      expect(values.length).to.be.greaterThan(0);
      expect(db.queueTime.getLatest()).to.equal(values[values.length - 1][1]);
    });
  });
  describe("db.queueTime.getValues", () => {
    it("should return all values by received timestamp", async () => {
      const min = Date.now();
      expect(db.queueTime.getValues()).to.eql([]);
      await Promise.all(
        range(10).map(() => collection.save({ value: Math.random() }))
      );
      const max = Date.now();
      const values = db.queueTime.getValues();
      expect(values.length).to.be.greaterThanOrEqual(10);
      for (const entry of values) {
        expect(entry[0]).to.be.greaterThanOrEqual(min);
        expect(entry[0]).to.be.lessThanOrEqual(max);
        expect(entry[1]).to.be.a("number");
        expect(entry[1]).to.be.finite;
      }
    });
  });
  describe("db.queueTime.getAvg", () => {
    it("should return the arithmetic average of all current values", async () => {
      expect(db.queueTime.getAvg()).to.equal(0);
      await Promise.all(
        range(10).map(() => collection.save({ value: Math.random() }))
      );
      const values = db.queueTime.getValues();
      expect(values.length).to.be.greaterThan(0);
      const avg = values.reduce((acc, [, v]) => acc + v / values.length, 0);
      expect(db.queueTime.getAvg()).to.equal(avg);
    });
  });
});
