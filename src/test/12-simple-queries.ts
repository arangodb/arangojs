import { expect } from "chai";
import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";
import { ArrayCursor } from "../cursor";

const range = (n: number): number[] => Array.from(Array(n).keys());
const alpha = (i: number): string => String.fromCharCode("a".charCodeAt(0) + i);
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30400);
const describe2x = ARANGO_VERSION < 30000 ? describe : describe.skip;

describe("Simple queries", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let name = `testdb_${Date.now()}`;
  let db: Database;
  let collection: DocumentCollection;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: ARANGO_VERSION
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
  beforeEach(async () => {
    collection = db.collection(`c_${Date.now()}`);
    await collection.create();
    await Promise.all(
      range(10).map(i =>
        collection.save({
          _key: alpha(i),
          value: i + 1,
          group: Math.floor(i / 2) + 1
        })
      )
    );
  });
  afterEach(async () => {
    await collection.drop();
  });
  describe("collection.all", () => {
    it("returns a cursor for all documents in the collection", async () => {
      const cursor = await collection.all();
      expect(cursor).to.be.an.instanceof(ArrayCursor);
      expect(cursor.count).to.equal(10);
      const arr = await cursor.all();
      expect(arr).to.have.length(10);
      arr.forEach((doc: any) => {
        expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
        expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
        expect(doc.group).to.equal(Math.floor((doc.value - 1) / 2) + 1);
      });
      expect(arr.map((d: any) => d.value).sort()).to.eql(
        range(10)
          .map(i => i + 1)
          .sort()
      );
      expect(arr.map((d: any) => d._key).sort()).to.eql(
        range(10)
          .map(alpha)
          .sort()
      );
    });
  });
  describe("collection.any", () => {
    it("returns a random document from the collection", async () => {
      const doc = await collection.any();
      expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
      expect(doc._key).to.equal(alpha(doc.value - 1));
      expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
      expect(doc.value).to.be.within(1, 10);
      expect(doc.group).to.equal(Math.floor((doc.value - 1) / 2) + 1);
    });
  });
  describe2x("collection.first", () => {
    it("returns the first document in the collection", async () => {
      const doc = await collection.first();
      expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
      expect(doc._key).to.equal("a");
      expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
      expect(doc.value).to.equal(1);
      expect(doc.group).to.equal(1);
    });
  });
  describe2x("collection.last", () => {
    it("returns the last document in the collection", async () => {
      const doc = await collection.last();
      expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
      expect(doc._key).to.equal(alpha(9));
      expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
      expect(doc.value).to.equal(10);
      expect(doc.group).to.equal(5);
    });
  });
  describe("collection.byExample", () => {
    it("returns all documents matching the example", async () => {
      const cursor = await collection.byExample({ group: 2 });
      expect(cursor).to.be.an.instanceof(ArrayCursor);
      const arr = await cursor.all();
      expect(arr).to.have.length(2);
      arr.forEach((doc: any) => {
        expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
        expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
        expect(doc.group).to.equal(2);
      });
      expect(arr.map((d: any) => d._key).sort()).to.eql(["c", "d"]);
      expect(arr.map((d: any) => d.value).sort()).to.eql([3, 4]);
    });
  });
  describe("collection.firstExample", () => {
    it("returns the first document matching the example", async () => {
      const doc = await collection.firstExample({ group: 2 });
      expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
      expect(doc._key).to.match(/^[cd]$/);
      expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
      expect(doc.group).to.equal(2);
    });
  });
  describe("collection.lookupByKeys", () => {
    it("returns the documents with the given keys", async () => {
      const arr = await collection.lookupByKeys(["b", "c", "d"]);
      expect(arr).to.have.length(3);
      arr.forEach((doc: any) => {
        expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
        expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
        expect(doc.group).to.equal(Math.floor((doc.value - 1) / 2) + 1);
      });
      expect(arr.map((d: any) => d._key)).to.eql(["b", "c", "d"]);
    });
  });
});
