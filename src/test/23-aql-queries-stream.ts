import { expect } from "chai";
import { aql, Database } from "../arangojs";
import { ArrayCursor } from "../cursor";

const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30400);
const describe34 = ARANGO_VERSION >= 30400 ? describe : describe.skip;

describe34("AQL Stream queries", function() {
  // create database takes 11s in a standard cluster and sometimes even more
  this.timeout(30000);

  let name = `testdb_${Date.now()}`;
  let db: Database;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
    await db.createDatabase(name);
    db.useDatabase(name);
  });
  after(async () => {
    try {
      db.useDatabase("_system");
      await db.dropDatabase(name);
    } finally {
      db.close();
    }
  });
  describe("database.query", () => {
    it("returns a cursor for the query result", async () => {
      const cursor = await db.query(
        "RETURN 23",
        {},
        { options: { stream: true } }
      );
      expect(cursor).to.be.an.instanceof(ArrayCursor);
    });
    it("supports bindVars", async () => {
      const cursor = await db.query(
        "RETURN @x",
        { x: 5 },
        { options: { stream: true } }
      );
      const value = await cursor.next();
      expect(value).to.equal(5);
    });
    it("supports options", async () => {
      const cursor = await db.query("FOR x IN 1..10 RETURN x", undefined, {
        batchSize: 2,
        count: true, // should be ignored
        options: { stream: true }
      });
      expect(cursor.count).to.equal(undefined);
      expect((cursor as any)._hasMore).to.equal(true);
    });
    it("supports compact queries with options", async () => {
      let query: any = {
        query: "FOR x IN RANGE(1, @max) RETURN x",
        bindVars: { max: 10 }
      };
      const cursor = await db.query(query, {
        batchSize: 2,
        count: true,
        options: { stream: true }
      });
      expect(cursor.count).to.equal(undefined); // count will be ignored
      expect((cursor as any)._hasMore).to.equal(true);
    });
  });
  describe("with some data", () => {
    let cname = "MyTestCollection";
    before(async () => {
      let collection = db.collection(cname);
      await collection.create();
      await Promise.all(
        Array.apply(null, { length: 1000 })
          .map(Number.call, Number)
          .map((i: Number) => collection.save({ hallo: i }))
      );
    });
    /*after(async () => {
      await db.collection(cname).drop()
    });*/
    it("can access large collection in parallel", async () => {
      let collection = db.collection(cname);
      let query = aql`FOR doc in ${collection} RETURN doc`;
      const opts = { batchSize: 250, options: { stream: true } };

      let count = 0;
      const cursors = await Promise.all(
        Array.apply(null, { length: 25 }).map(() => db.query(query, opts))
      );
      await Promise.all(
        cursors.map(c =>
          (c as ArrayCursor).each(() => {
            count++;
          })
        )
      );
      expect(count).to.equal(25 * 1000);
    });
    it("can do writes and reads", async () => {
      let collection = db.collection(cname);
      let readQ = aql`FOR doc in ${collection} RETURN doc`;
      let writeQ = aql`FOR i in 1..1000 LET y = SLEEP(1) INSERT {forbidden: i} INTO ${collection}`;
      const opts = { batchSize: 500, ttl: 5, options: { stream: true } };

      // 900s lock timeout + 5s ttl
      let readCursor = db.query(readQ, opts);
      let writeCursor = db.query(writeQ, opts);

      // the read cursor should always win
      const c = await Promise.race([readCursor, writeCursor]);
      // therefore no document should have been written here
      const isOk = await c.every((d: any) => !d.hasOwnProperty("forbidden"));
      expect(isOk).to.equal(true);
    });
  });
});
