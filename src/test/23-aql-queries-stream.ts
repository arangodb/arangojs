import { expect } from "chai";
import { aql } from "../aql";
import { ArrayCursor } from "../cursor";
import { Database, QueryOptions } from "../database";
import { config } from "./_config";

const describe34 = config.arangoVersion! >= 30400 ? describe : describe.skip;
const itRdb = process.env.ARANGO_STORAGE_ENGINE !== "mmfiles" ? it : it.skip;

describe34("AQL Stream queries", function () {
  let name = `testdb_${Date.now()}`;
  let db: Database;
  let allCursors: ArrayCursor[];
  before(async () => {
    allCursors = [];
    db = new Database(config);
    if (Array.isArray(config.url)) await db.acquireHostList();
    await db.createDatabase(name);
    db.useDatabase(name);
  });
  after(async () => {
    await Promise.all(
      allCursors.map((cursor) => cursor.kill().catch(() => undefined))
    );
    try {
      db.useDatabase("_system");
      await db.dropDatabase(name);
    } finally {
      db.close();
    }
  });
  describe("database.query", () => {
    it("returns a cursor for the query result", async () => {
      const cursor = await db.query("RETURN 23", {}, { stream: true });
      allCursors.push(cursor);
      expect(cursor).to.be.an.instanceof(ArrayCursor);
    });
    it("supports bindVars", async () => {
      const cursor = await db.query("RETURN @x", { x: 5 }, { stream: true });
      allCursors.push(cursor);
      const value = await cursor.next();
      expect(value).to.equal(5);
    });
    it("supports options", async () => {
      const cursor = await db.query("FOR x IN 1..10 RETURN x", undefined, {
        batchSize: 2,
        count: true, // should be ignored
        stream: true,
      });
      allCursors.push(cursor);
      expect(cursor.count).to.equal(undefined);
      expect((cursor as any).batches.hasMore).to.equal(true);
    });
    it("supports compact queries with options", async () => {
      let query: any = {
        query: "FOR x IN RANGE(1, @max) RETURN x",
        bindVars: { max: 10 },
      };
      const cursor = await db.query(query, {
        batchSize: 2,
        count: true,
        stream: true,
      });
      allCursors.push(cursor);
      expect(cursor.count).to.equal(undefined); // count will be ignored
      expect((cursor as any).batches.hasMore).to.equal(true);
    });
  });
  describe("with some data", () => {
    let cname = "MyTestCollection";
    before(async () => {
      let collection = await db.createCollection(cname);
      await Promise.all(
        Array.from(Array(1000).keys()).map((i: number) =>
          collection.save({ hallo: i })
        )
      );
    });
    /*after(async () => {
      await db.collection(cname).drop()
    });*/
    it("can access large collection in parallel", async () => {
      let collection = db.collection(cname);
      let query = aql`FOR doc in ${collection} RETURN doc`;
      const options = { batchSize: 250, stream: true };

      let count = 0;
      const cursors = await Promise.all(
        Array.from(Array(25)).map(() => db.query(query, options))
      );
      allCursors.push(...cursors);
      await Promise.all(
        cursors.map((c) =>
          (c as ArrayCursor).forEach(() => {
            count++;
          })
        )
      );
      expect(count).to.equal(25 * 1000);
    });
    itRdb("can do writes and reads", async () => {
      let collection = db.collection(cname);
      let readQ = aql`FOR doc in ${collection} RETURN doc`;
      let writeQ = aql`FOR i in 1..10000 LET y = SLEEP(1) INSERT {forbidden: i} INTO ${collection}`;
      const options: QueryOptions = {
        batchSize: 500,
        ttl: 5,
        maxRuntime: 5,
        stream: true,
      };

      let readCursor = db.query(readQ, options);
      let writeCursor = db.query(writeQ, options);

      // the read cursor should always win
      const c = await Promise.race([readCursor, writeCursor]);
      allCursors.push(c);
      // therefore no document should have been written here
      for await (const d of c) {
        expect(d).not.to.haveOwnProperty("forbidden");
      }
    });
  });
});
