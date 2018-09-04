import { expect } from "chai";
import { aql, Database } from "../arangojs";
import { ArrayCursor } from "../cursor";
import { ArangoError } from "../error";

describe("AQL queries", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  const name = `testdb_${Date.now()}`;
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
      const cursor = await db.query("RETURN 23");
      expect(cursor).to.be.an.instanceof(ArrayCursor);
    });
    it("throws an exception on error", async () => {
      try {
        await db.query("FOR i IN no RETURN i");
      } catch (err) {
        expect(err).is.instanceof(ArangoError);
        expect(err).to.have.property("statusCode", 404);
        expect(err).to.have.property("errorNum", 1203);
        return;
      }
      expect.fail();
    });
    it("throws an exception on error (async await)", async () => {
      try {
        await db.query("FOR i IN no RETURN i");
      } catch (err) {
        expect(err).is.instanceof(ArangoError);
        expect(err).to.have.property("statusCode", 404);
        expect(err).to.have.property("errorNum", 1203);
        return;
      }
      expect.fail();
    });
    it("supports bindVars", async () => {
      const cursor = await db.query("RETURN @x", { x: 5 });
      const value = await cursor.next();
      expect(value).to.equal(5);
    });
    it("supports options", async () => {
      const cursor = await db.query("FOR x IN 1..10 RETURN x", undefined, {
        batchSize: 2,
        count: true
      });
      expect(cursor.count).to.equal(10);
      expect((cursor as any)._hasMore).to.equal(true);
    });
    it("supports AQB queries", async () => {
      const cursor = await db.query({ toAQL: () => "RETURN 42" });
      const value = await cursor.next();
      expect(value).to.equal(42);
    });
    it("supports query objects", async () => {
      const cursor = await db.query({ query: "RETURN 1337", bindVars: {} });
      const value = await cursor.next();
      expect(value).to.equal(1337);
    });
    it("supports compact queries", async () => {
      const cursor = await db.query({
        query: "RETURN @potato",
        bindVars: { potato: "tomato" }
      });
      const value = await cursor.next();
      expect(value).to.equal("tomato");
    });
    it("supports compact queries with options", async () => {
      const query: any = {
        query: "FOR x IN RANGE(1, @max) RETURN x",
        bindVars: { max: 10 }
      };
      const cursor = await db.query(query, { batchSize: 2, count: true });
      expect(cursor.count).to.equal(10);
      expect((cursor as any)._hasMore).to.equal(true);
    });
  });
  describe("aql", () => {
    it("correctly handles simple parameters", () => {
      const values: any[] = [
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
      const query = aql`
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
      const bindVarNames = Object.keys(query.bindVars).sort(
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
      const collection = db.collection("potato");
      const query = aql`${collection}`;
      expect(query.query).to.equal("@@value0");
      expect(Object.keys(query.bindVars)).to.eql(["@value0"]);
      expect(query.bindVars["@value0"]).to.equal("potato");
    });
    it("correctly handles ArangoDB collection parameters", () => {
      class ArangoCollection {
        isArangoCollection = true;
        name = "tomato";
      }
      const collection = new ArangoCollection();
      const query = aql`${collection as any}`;
      expect(query.query).to.equal("@@value0");
      expect(Object.keys(query.bindVars)).to.eql(["@value0"]);
      expect(query.bindVars["@value0"]).to.equal("tomato");
    });
  });
});
