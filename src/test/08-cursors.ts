import { expect } from "chai";
import { LinkedList } from "x3-linkedlist";
import { aql } from "../aql";
import { ArrayCursor, BatchedArrayCursor } from "../cursor";
import { Database } from "../database";
import { config } from "./_config";

const aqlQuery = aql`FOR i IN 0..10 RETURN i`;
const aqlResult = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

async function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

describe("Item-wise Cursor API", () => {
  let db: Database;
  let cursor: ArrayCursor;
  let allCursors: (ArrayCursor | BatchedArrayCursor)[];
  before(async () => {
    allCursors = [];
    db = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await db.acquireHostList();
  });
  after(async () => {
    await Promise.all(
      allCursors.map((cursor) => cursor.kill().catch(() => undefined))
    );
    db.close();
  });
  beforeEach(async () => {
    cursor = await db.query(aqlQuery);
    allCursors.push(cursor);
  });
  describe("for await of cursor", () => {
    it("returns each next result of the Cursor", async () => {
      let i = 0;
      for await (const value of cursor) {
        expect(value).to.equal(aqlResult[i]);
        i += 1;
      }
      expect(i).to.equal(aqlResult.length);
      expect(cursor.hasNext).to.equal(false);
    });
  });
  describe("cursor.all", () => {
    it("returns an Array of all results", async () => {
      const values = await cursor.all();
      expect(values).to.eql(aqlResult);
    });
  });
  describe("cursor.next", () => {
    it("returns the next result of the Cursor", async () => {
      const val1 = await cursor.next();
      expect(val1).to.equal(0);
      const val2 = await cursor.next();
      expect(val2).to.equal(1);
    });
  });
  describe("cursor.hasNext", () => {
    it("returns true if the Cursor has more results", async () => {
      expect(cursor.hasNext).to.equal(true);
      const val = await cursor.next();
      expect(val).to.be.a("number");
    });
    it("returns false if the Cursor is empty", async () => {
      await cursor.all();
      expect(cursor.hasNext).to.equal(false);
    });
    it("returns true after first batch is consumed", async () => {
      const cursor = await db.query(aqlQuery, { batchSize: 1 });
      allCursors.push(cursor);
      expect((cursor.batches as any)._batches.length).to.equal(1);
      cursor.next();
      expect((cursor.batches as any)._batches.length).to.equal(0);
      expect(cursor.hasNext).to.equal(true);
    });
    it("returns false after last batch is consumed", async () => {
      const cursor = await db.query(aql`FOR i IN 0..1 RETURN i`, {
        batchSize: 2,
      });
      allCursors.push(cursor);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor.batches as any)._batches.length).to.equal(1);
      const val1 = await cursor.next();
      expect(val1).to.equal(0);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor.batches as any)._batches.length).to.equal(1);
      const val2 = await cursor.next();
      expect(val2).to.equal(1);
      expect(cursor.hasNext).to.equal(false);
      expect((cursor.batches as any)._batches.length).to.equal(0);
    });
    it("returns false after last result is consumed", async () => {
      const cursor = await db.query(aql`FOR i IN 0..1 RETURN i`, {
        batchSize: 2,
      });
      allCursors.push(cursor);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor.batches as any)._batches.length).to.equal(1);
      const val1 = await cursor.next();
      expect(val1).to.equal(0);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor.batches as any)._batches.length).to.equal(1);
      const val2 = await cursor.next();
      expect(val2).to.equal(1);
      expect(cursor.hasNext).to.equal(false);
      expect((cursor.batches as any)._batches.length).to.equal(0);
    });
    it.skip("returns 404 after timeout", async () => {
      const cursor = await db.query(aql`FOR i IN 0..1 RETURN i`, {
        batchSize: 1,
        ttl: 1,
      });
      allCursors.push(cursor);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._batches.length).to.equal(1);
      const val = await cursor.next();
      expect(val).to.equal(0);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._batches.length).to.equal(0);
      await sleep(3000);
      try {
        await cursor.next();
      } catch (err) {
        expect(err.code).to.equal(404);
        return;
      }
      expect.fail();
    });
    it("returns false after last result is consumed (with large amount of results)", async () => {
      const EXPECTED_LENGTH = 10000;
      async function loadMore(cursor: ArrayCursor, totalLength: number) {
        await cursor.next();
        totalLength++;
        expect(cursor.hasNext).to.equal(totalLength !== EXPECTED_LENGTH);
        if (cursor.hasNext) {
          await loadMore(cursor, totalLength);
        }
      }
      const cursor = await db.query(`FOR i IN 1..${EXPECTED_LENGTH} RETURN i`);
      allCursors.push(cursor);
      await loadMore(cursor, 0);
    });
    it("returns false if there are no results", async () => {
      const cursor = await db.query(aql`FOR i IN [] RETURN i`);
      allCursors.push(cursor);
      expect(cursor.hasNext).to.equal(false);
      expect((cursor.batches as any)._batches.length).to.equal(0);
    });
  });
  describe("cursor.forEach", () => {
    it("invokes the callback for each value", async () => {
      const results: any[] = [];
      await cursor.forEach((value) => {
        results.push(value);
      });
      expect(results).to.eql(aqlResult);
    });
    it("correctly handles empty results", async () => {
      const cursor = await db.query(aql`FOR i IN [] RETURN i`);
      allCursors.push(cursor);
      const results: any[] = [];
      await cursor.forEach((value) => {
        results.push(value);
      });
      expect(results).to.eql([]);
    });
    it("aborts if the callback returns false", async () => {
      const results: any[] = [];
      await cursor.forEach((value) => {
        results.push(value);
        if (value === 5) return false;
        return;
      });
      expect(results).to.eql([0, 1, 2, 3, 4, 5]);
    });
  });
  describe("cursor.map", () => {
    it("maps all result values over the callback", async () => {
      const results = await cursor.map((value) => value * 2);
      expect(results).to.eql(aqlResult.map((value) => value * 2));
    });
  });
  describe("cursor.flatMap", () => {
    it("flat-maps all result values over the callback", async () => {
      const results = await cursor.flatMap((value) => [value, value * 2]);
      expect(results).to.eql(
        aqlResult
          .map((value) => [value, value * 2])
          .reduce((acc, next) => {
            acc.push(...next);
            return acc;
          }, [] as number[])
      );
    });
    it("doesn't choke on non-arrays", async () => {
      const results = await cursor.flatMap((value) => value * 2);
      expect(results).to.eql(aqlResult.map((value) => value * 2));
    });
  });
  describe("cursor.reduce", () => {
    it("reduces the result values with the callback", async () => {
      const result = await cursor.reduce((a, b) => a + b);
      expect(result).to.eql(aqlResult.reduce((a, b) => a + b));
    });
  });
  describe("cursor.kill", () => {
    it("kills the cursor", async () => {
      const cursor = await db.query(aql`FOR i IN 1..5 RETURN i`, {
        batchSize: 2,
      });
      allCursors.push(cursor);
      const { _host: host, _id: id } = cursor as any;
      expect(cursor.batches.hasMore).to.equal(true);
      await cursor.kill();
      expect(cursor.batches.hasMore).to.equal(false);
      try {
        await db.request({
          method: "PUT",
          path: `/_api/cursor/${id}`,
          host: host,
        });
      } catch (e) {
        expect(e).to.have.property("errorNum", 1600);
        return;
      }
      expect.fail("should not be able to fetch additional result set");
    });
  });
});

describe("Batch-wise Cursor API", () => {
  let db: Database;
  let cursor: BatchedArrayCursor;
  let allCursors: (ArrayCursor | BatchedArrayCursor)[];
  before(async () => {
    allCursors = [];
    db = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await db.acquireHostList();
  });
  after(async () => {
    await Promise.all(
      allCursors.map((cursor) => cursor.kill().catch(() => undefined))
    );
    db.close();
  });
  beforeEach(async () => {
    cursor = (await db.query(aqlQuery, { batchSize: 1 })).batches;
    allCursors.push(cursor);
  });
  describe("for await of cursor", () => {
    it("returns each next result of the Cursor", async () => {
      let i = 0;
      for await (const value of cursor) {
        expect(value).to.eql([aqlResult[i]]);
        i += 1;
      }
      expect(i).to.equal(aqlResult.length);
      expect(cursor.hasNext).to.equal(false);
    });
  });
  describe("cursor.all", () => {
    it("returns an Array of all results", async () => {
      const values = await cursor.all();
      expect(values).to.eql(aqlResult.map((v) => [v]));
    });
  });
  describe("cursor.next", () => {
    it("returns the next result of the Cursor", async () => {
      const val1 = await cursor.next();
      expect(val1).to.eql([0]);
      const val2 = await cursor.next();
      expect(val2).to.eql([1]);
    });
  });
  describe("cursor.hasNext", () => {
    it("returns true if the Cursor has more results", async () => {
      expect(cursor.hasNext).to.equal(true);
      const val = await cursor.next();
      expect(val).to.be.an("array");
      expect(val?.[0]).to.be.a("number");
    });
    it("returns false if the Cursor is empty", async () => {
      await cursor.all();
      expect(cursor.hasNext).to.equal(false);
    });
    it("returns true after first batch is consumed", async () => {
      const cursor = (await db.query(aqlQuery, { batchSize: 1 })).batches;
      allCursors.push(cursor);
      expect((cursor as any)._batches.length).to.equal(1);
      cursor.next();
      expect((cursor as any)._batches.length).to.equal(0);
      expect(cursor.hasNext).to.equal(true);
    });
    it("returns false after last batch is consumed", async () => {
      const cursor = (
        await db.query(aql`FOR i IN 0..1 RETURN i`, {
          batchSize: 1,
        })
      ).batches;
      allCursors.push(cursor);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._batches.length).to.equal(1);
      const val1 = await cursor.next();
      expect(val1).to.eql([0]);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._batches.length).to.equal(0);
      const val2 = await cursor.next();
      expect(val2).to.eql([1]);
      expect(cursor.hasNext).to.equal(false);
      expect((cursor as any)._batches.length).to.equal(0);
    });
    it.skip("returns 404 after timeout", async () => {
      const cursor = await db.query(aql`FOR i IN 0..1 RETURN i`, {
        batchSize: 1,
        ttl: 1,
      });
      allCursors.push(cursor);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._batches.length).to.equal(1);
      const val = await cursor.next();
      expect(val).to.equal(0);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._batches.length).to.equal(0);
      await sleep(3000);
      try {
        await cursor.next();
      } catch (err) {
        expect(err.code).to.equal(404);
        return;
      }
      expect.fail();
    });
    it("returns false after last result is consumed (with large amount of results)", async () => {
      const EXPECTED_LENGTH = 10000;
      async function loadMore(cursor: ArrayCursor, totalLength: number) {
        await cursor.next();
        totalLength++;
        expect(cursor.hasNext).to.equal(totalLength !== EXPECTED_LENGTH);
        if (cursor.hasNext) {
          await loadMore(cursor, totalLength);
        }
      }
      const cursor = await db.query(`FOR i IN 1..${EXPECTED_LENGTH} RETURN i`);
      allCursors.push(cursor);
      await loadMore(cursor, 0);
    });
  });
  describe("cursor.forEach", () => {
    it("invokes the callback for each value", async () => {
      const results: any[] = [];
      await cursor.forEach((batch) => {
        results.push(...batch);
      });
      expect(results).to.eql(aqlResult);
    });
    it("aborts if the callback returns false", async () => {
      const results: any[] = [];
      await cursor.forEach((batch) => {
        results.push(...batch);
        if (batch[0] === 5) return false;
        return;
      });
      expect(results).to.eql([0, 1, 2, 3, 4, 5]);
    });
  });
  describe("cursor.map", () => {
    it("maps all result values over the callback", async () => {
      const results = await cursor.map(([value]) => value * 2);
      expect(results).to.eql(aqlResult.map((value) => value * 2));
    });
  });
  describe("cursor.flatMap", () => {
    it("flat-maps all result values over the callback", async () => {
      const results = await cursor.flatMap(([value]) => [value, value * 2]);
      expect(results).to.eql(
        aqlResult
          .map((value) => [value, value * 2])
          .reduce((acc, next) => {
            acc.push(...next);
            return acc;
          }, [] as number[])
      );
    });
    it("doesn't choke on non-arrays", async () => {
      const results = await cursor.flatMap(([value]) => value * 2);
      expect(results).to.eql(aqlResult.map((value) => value * 2));
    });
  });
  describe("cursor.reduce", () => {
    it("reduces the result values with the callback", async () => {
      const result = await cursor.reduce((a, [b]) => a + b, 0);
      expect(result).to.eql(aqlResult.reduce((a, b) => a + b));
    });
  });
  describe("cursor.next", () => {
    beforeEach(async () => {
      cursor = (await db.query(aql`FOR i IN 1..10 RETURN i`, { batchSize: 5 }))
        .batches;
      allCursors.push(cursor);
    });
    it("fetches the next batch when empty", async () => {
      const result: LinkedList<LinkedList<any>> = (cursor as any)._batches;
      expect([...result.first!.value.values()]).to.eql([1, 2, 3, 4, 5]);
      expect(cursor.hasMore).to.equal(true);
      result.clear();
      expect(await cursor.next()).to.eql([6, 7, 8, 9, 10]);
      expect(cursor.hasMore).to.equal(false);
    });
    it("returns all fetched values", async () => {
      expect(await cursor.next()).to.eql([1, 2, 3, 4, 5]);
      expect(await cursor.items.next()).to.equal(6);
      expect(await cursor.next()).to.eql([7, 8, 9, 10]);
    });
  });
  describe("cursor.kill", () => {
    it("kills the cursor", async () => {
      const cursor = await db.query(aql`FOR i IN 1..5 RETURN i`, {
        batchSize: 2,
      });
      allCursors.push(cursor);
      const { _host: host, _id: id } = cursor as any;
      expect(cursor.batches.hasMore).to.equal(true);
      await cursor.kill();
      expect(cursor.batches.hasMore).to.equal(false);
      try {
        await db.request({
          method: "PUT",
          path: `/_api/cursor/${id}`,
          host: host,
        });
      } catch (e) {
        expect(e).to.have.property("errorNum", 1600);
        return;
      }
      expect.fail("should not be able to fetch additional result set");
    });
  });
});
