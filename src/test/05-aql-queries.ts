import { expect } from "chai";
import { aql, Database } from "../arangojs";
import { ArrayCursor } from "../cursor";
import { ArangoError } from "../error";

describe("AQL queries", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let name = `testdb_${Date.now()}`;
  let db: Database;
  before(done => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30000)
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
        .query("RETURN 23")
        .then(cursor => {
          expect(cursor).to.be.an.instanceof(ArrayCursor);
          done();
        })
        .catch(done);
    });
    it("throws an exception on error", done => {
      db
        .query("FOR i IN no RETURN i")
        .then(() => {
          expect.fail();
          done();
        })
        .catch(err => {
          expect(err).is.instanceof(ArangoError);
          expect(err).to.have.property("statusCode", 404);
          expect(err).to.have.property("errorNum", 1203);
          done();
        });
    });
    it("throws an exception on error (async await)", async () => {
      try {
        await db.query("FOR i IN no RETURN i");
        expect.fail();
      } catch (err) {
        expect(err).is.instanceof(ArangoError);
        expect(err).to.have.property("statusCode", 404);
        expect(err).to.have.property("errorNum", 1203);
      }
    });
    it("supports bindVars", done => {
      db
        .query("RETURN @x", { x: 5 })
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
          count: true
        })
        .then(cursor => {
          expect(cursor.count).to.equal(10);
          expect((cursor as any)._hasMore).to.equal(true);
          done();
        })
        .catch(done);
    });
    it("supports AQB queries", done => {
      db
        .query({ toAQL: () => "RETURN 42" })
        .then(cursor => cursor.next())
        .then(value => {
          expect(value).to.equal(42);
          done();
        })
        .catch(done);
    });
    it("supports query objects", done => {
      db
        .query({ query: "RETURN 1337", bindVars: {} })
        .then(cursor => cursor.next())
        .then(value => {
          expect(value).to.equal(1337);
          done();
        })
        .catch(done);
    });
    it("supports compact queries", done => {
      db
        .query({ query: "RETURN @potato", bindVars: { potato: "tomato" } })
        .then(cursor => cursor.next())
        .then(value => {
          expect(value).to.equal("tomato");
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
        .query(query, { batchSize: 2, count: true })
        .then(cursor => {
          expect(cursor.count).to.equal(10);
          expect((cursor as any)._hasMore).to.equal(true);
          done();
        })
        .catch(done);
    });
  });
  describe("aql", () => {
    it("correctly handles simple parameters", () => {
      let values: any[] = [
        0,
        42,
        -1,
        null,
        undefined,
        true,
        false,
        "",
        "string",
        [1, 2, 3],
        { a: "b" }
      ];
      let query = aql`
        A ${values[0]} B ${values[1]} C ${values[2]} D ${values[3]} E ${
        values[4]
      } F ${values[5]}
        G ${values[6]} H ${values[7]} I ${values[8]} J ${values[9]} K ${
        values[10]
      } EOF
      `;
      expect(query.query).to.equal(`
        A @value0 B @value1 C @value2 D @value3 E @value4 F @value5
        G @value6 H @value7 I @value8 J @value9 K @value10 EOF
      `);
      let bindVarNames = Object.keys(query.bindVars).sort(
        (a, b) => (+a.substr(5) > +b.substr(5) ? 1 : -1)
      );
      expect(bindVarNames).to.eql([
        "value0",
        "value1",
        "value2",
        "value3",
        "value4",
        "value5",
        "value6",
        "value7",
        "value8",
        "value9",
        "value10"
      ]);
      expect(bindVarNames.map(k => query.bindVars[k])).to.eql(values);
    });
    it("correctly handles arangojs collection parameters", () => {
      let collection = db.collection("potato");
      let query = aql`${collection}`;
      expect(query.query).to.equal("@@value0");
      expect(Object.keys(query.bindVars)).to.eql(["@value0"]);
      expect(query.bindVars["@value0"]).to.equal("potato");
    });
    it("correctly handles ArangoDB collection parameters", () => {
      class ArangoCollection {
        isArangoCollection = true;
        name = "tomato";
      }
      let collection = new ArangoCollection();
      let query = aql`${collection as any}`;
      expect(query.query).to.equal("@@value0");
      expect(Object.keys(query.bindVars)).to.eql(["@value0"]);
      expect(query.bindVars["@value0"]).to.equal("tomato");
    });
  });
});
