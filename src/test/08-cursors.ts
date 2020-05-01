import { expect } from "chai";
import { LinkedList } from "x3-linkedlist";
import { aql } from "../aql";
import { ArrayCursor } from "../cursor";
import { Database } from "../database";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);

const aqlQuery = aql`FOR i In 0..10 RETURN i`;
const aqlResult = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

describe("Cursor API", () => {
  let db: Database;
  let cursor: ArrayCursor;
  before(() => {
    db = new Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
  });
  after(() => {
    db.close();
  });
  beforeEach(async () => {
    cursor = await db.query(aqlQuery);
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
      expect((cursor as any)._result.length).to.equal(1);
      cursor.next();
      expect((cursor as any)._result.length).to.equal(0);
      expect(cursor.hasNext).to.equal(true);
    });
    it("returns false after last batch is consumed", async () => {
      const cursor = await db.query(aql`FOR i In 0..1 RETURN i`, {
        batchSize: 1,
      });
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._result.length).to.equal(1);
      const val1 = await cursor.next();
      expect(val1).to.equal(0);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._result.length).to.equal(0);
      const val2 = await cursor.next();
      expect(val2).to.equal(1);
      expect(cursor.hasNext).to.equal(false);
      expect((cursor as any)._result.length).to.equal(0);
    });
    it("returns false after last result is consumed", async () => {
      const cursor = await db.query("FOR i In 0..1 RETURN i");
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._result.length).to.equal(2);
      const val1 = await cursor.next();
      expect(val1).to.equal(0);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._result.length).to.equal(1);
      const val2 = await cursor.next();
      expect(val2).to.equal(1);
      expect(cursor.hasNext).to.equal(false);
      expect((cursor as any)._result.length).to.equal(0);
    });
    it.skip("returns 404 after timeout", async () => {
      const cursor = await db.query(aql`FOR i In 0..1 RETURN i`, {
        batchSize: 1,
        ttl: 1,
      });
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._result.length).to.equal(1);
      const val = await cursor.next();
      expect(val).to.equal(0);
      expect(cursor.hasNext).to.equal(true);
      expect((cursor as any)._result.length).to.equal(0);
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
      const EXPECTED_LENGTH = 100000;
      async function loadMore(cursor: ArrayCursor, totalLength: number) {
        await cursor.next();
        totalLength++;
        expect(cursor.hasNext).to.equal(totalLength !== EXPECTED_LENGTH);
        if (cursor.hasNext) {
          await loadMore(cursor, totalLength);
        }
      }
      const cursor = await db.query(`FOR i In 1..${EXPECTED_LENGTH} RETURN i`);
      await loadMore(cursor, 0);
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
    it("aborts if the callback returns false", async () => {
      const results: any[] = [];
      await cursor.forEach((value: any) => {
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
  describe("cursor.reduce", () => {
    it("reduces the result values with the callback", async () => {
      const result = await cursor.reduce((a, b) => a + b);
      expect(result).to.eql(aqlResult.reduce((a, b) => a + b));
    });
  });
  describe("cursor.nextBatch", () => {
    beforeEach(async () => {
      cursor = await db.query(aql`FOR i IN 1..10 RETURN i`, { batchSize: 5 });
    });
    it("fetches the next batch when empty", async () => {
      const result: LinkedList<any> = (cursor as any)._result;
      expect([...result.values()]).to.eql([1, 2, 3, 4, 5]);
      expect(cursor).to.have.property("_hasMore", true);
      result.first = undefined;
      result.last = undefined;
      result.length = 0;
      expect(await cursor.nextBatch()).to.eql([6, 7, 8, 9, 10]);
      expect(cursor).to.have.property("_hasMore", false);
    });
    it("returns all fetched values", async () => {
      expect(await cursor.nextBatch()).to.eql([1, 2, 3, 4, 5]);
      expect(await cursor.next()).to.equal(6);
      expect(await cursor.nextBatch()).to.eql([7, 8, 9, 10]);
    });
  });
  describe("cursor.kill", () => {
    it("kills the cursor", async () => {
      const cursor = await db.query(aql`FOR i IN 1..5 RETURN i`, {
        batchSize: 2,
      });
      const { _host: host, _id: id } = cursor as any;
      expect(cursor).to.have.property("_hasMore", true);
      await cursor.kill();
      expect(cursor).to.have.property("_hasMore", false);
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
