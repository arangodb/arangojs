import { Database, aql } from "../arangojs";

import { ArrayCursor } from "../cursor";
import { expect } from "chai";

const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30000);
const describe34 = ARANGO_VERSION >= 30400 ? describe : describe.skip;

describe34("AQL Stream queries", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let name = `testdb_${Date.now()}`;
  let db: Database;
  before(done => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
    db
      .createDatabase(name)
      .then(() => {
        db.useDatabase(name);
        done();
      })
      .catch(done);
  });
  after(done => {
    db.useDatabase("_system");
    db
      .dropDatabase(name)
      .then(() => void done())
      .catch(done);
  });
  describe("database.query", () => {
    it("returns a cursor for the query result", done => {
      db
        .query("RETURN 23", {}, { options: { stream: true } })
        .then(cursor => {
          expect(cursor).to.be.an.instanceof(ArrayCursor);
          done();
        })
        .catch(done);
    });
    it("supports bindVars", done => {
      db
        .query("RETURN @x", { x: 5 }, { options: { stream: true } })
        .then(cursor => cursor.next())
        .then(value => {
          expect(value).to.equal(5);
          done();
        })
        .catch(done);
    });
    it("supports options", done => {
      db
        .query("FOR x IN 1..10 RETURN x", undefined, {
          batchSize: 2,
          count: true, // should be ignored
          options: { stream: true }
        })
        .then(cursor => {
          expect(cursor.count).to.equal(undefined);
          expect((cursor as any)._hasMore).to.equal(true);
          done();
        })
        .catch(done);
    });
    it("supports compact queries with options", done => {
      let query: any = {
        query: "FOR x IN RANGE(1, @max) RETURN x",
        bindVars: { max: 10 }
      };
      db
        .query(query, { batchSize: 2, count: true, options: { stream: true } })
        .then(cursor => {
          expect(cursor.count).to.equal(undefined); // count will be ignored
          expect((cursor as any)._hasMore).to.equal(true);
          done();
        })
        .catch(done);
    });
  });
  describe("with some data", () => {
    let cname = "MyTestCollection"
    before(done => {
      let collection = db.collection(cname);
      collection.create()
        .then(() => {
          return Promise.all(Array.apply(null, { length: 1000 })
            .map(Number.call, Number)
            .map((i: Number) => collection.save({ hallo: i })));
        }).then(() => void done()).catch(done);
    });
    /*after(done => {
      db.collection(cname).drop().then(() => done()).catch(done);
    });*/
    it("can access large collection in parallel", (done) => {
      let collection = db.collection(cname);
      let query = aql`FOR doc in ${collection} RETURN doc`;
      const opts = { batchSize: 250, options: { stream: true } };

      let count = 0;
      Promise.all(Array.apply(null, { length: 25 }).map(() => db.query(query, opts)))
        .then(cursors => {
          return Promise.all(cursors.map(c => (c as ArrayCursor).each(() => { count++ })))
        }).then(() => {
          expect(count).to.equal(25 * 1000);
          done();
        }).catch(done);
    });
    it("can do writes and reads", (done) => {
      let collection = db.collection(cname);
      let readQ = aql`FOR doc in ${collection} RETURN doc`;
      let writeQ = aql`FOR i in 1..1000 LET y = SLEEP(1) INSERT {forbidden: i} INTO ${collection}`;
      const opts = { batchSize: 500, ttl: 5, options: { stream: true } };

      // 900s lock timeout + 5s ttl 
      let readCursor = db.query(readQ, opts);
      let writeCursor = db.query(writeQ, opts);

      // the read cursor should always win
      Promise.race([readCursor, writeCursor]).then(c => {
        // therefore no document should have been written here
        return c.every((d: any) => !(d.hasOwnProperty("forbidden")))
      }).then(isOk => {
        expect(isOk).to.equal(true);
        done();
      }).catch(done);
    });
  });
});
