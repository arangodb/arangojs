import { expect } from "chai";
import { aql, Database } from "../arangojs";
import { ArrayCursor } from "../cursor";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);
const describe34 = ARANGO_VERSION >= 30400 ? describe : describe.skip;
const itRdb = process.env.ARANGO_STORAGE_ENGINE !== "mmfiles" ? it : it.skip;

describe34("AQL Stream queries", function() {
  let name = `testdb_${Date.now()}`;
  let db: Database;
  before(async () => {
    db = new Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
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
        Array.from(Array(1000).keys())
          .map(i => Number(i))
          .map((i: number) => collection.save({ hallo: i }))
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
        Array.from(Array(25)).map(() => db.query(query, opts))
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
    itRdb("can do writes and reads", async () => {
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
