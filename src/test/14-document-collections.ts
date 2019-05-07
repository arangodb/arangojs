import { expect } from "chai";
import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";

const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30400);
const it3x = ARANGO_VERSION >= 30000 ? it : it.skip;

describe("DocumentCollection API", function() {
  const name = `testdb_${Date.now()}`;
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
  });
  afterEach(async () => {
    await collection.drop();
  });
  describe("documentCollection.document", () => {
    const data = { foo: "bar" };
    let meta: any;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns a document in the collection", async () => {
      const doc = await collection.document(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc.foo).to.equal(data.foo);
    });
    it("does not throw on not found when graceful", async () => {
      const doc = await collection.document("does-not-exist", true);
      expect(doc).to.equal(null);
    });
  });
  describe("documentCollection.documentExists", () => {
    let data = { foo: "bar" };
    let meta: any;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns true if the document exists", async () => {
      const exists = await collection.documentExists(meta._id);
      expect(exists).to.equal(true);
    });
    it("returns false if the document does not exist", async () => {
      const exists = await collection.documentExists("does-not-exist");
      expect(exists).to.equal(false);
    });
    it("returns false if the collection does not exist", async () => {
      const exists = await db
        .collection("does-not-exist")
        .documentExists("lol");
      expect(exists).to.equal(false);
    });
  });
  describe("documentCollection.save", () => {
    it("creates a document in the collection", async () => {
      const data = { foo: "bar" };
      const meta = await collection.save(data);
      expect(meta).to.be.an("object");
      expect(meta)
        .to.have.property("_id")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_rev")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_key")
        .that.is.a("string");
      const doc = await collection.document(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc.foo).to.equal(data.foo);
    });
    it("uses the given _key if provided", async () => {
      const data = { potato: "tomato", _key: "banana" };
      const meta = await collection.save(data);
      expect(meta).to.be.an("object");
      expect(meta)
        .to.have.property("_id")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_rev")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_key")
        .that.equals(data._key);
      const doc = await collection.document(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "potato");
      expect(doc._id).to.equal(meta._id);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._key).to.equal(data._key);
      expect(doc.potato).to.equal(data.potato);
    });
    it3x("returns the document if opts.returnNew is set", async () => {
      const data = { potato: "tomato" };
      const opts = { returnNew: true };
      const meta = await collection.save(data, opts);
      expect(meta).to.be.an("object");
      expect(meta)
        .to.have.property("_id")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_rev")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_key")
        .that.is.a("string");
      expect(meta.new).to.be.an("object");
      expect(meta.new)
        .to.have.property("_id")
        .that.is.a("string");
      expect(meta.new)
        .to.have.property("_rev")
        .that.is.a("string");
      expect(meta.new)
        .to.have.property("_key")
        .that.is.a("string");
      expect(meta.new.potato).to.equal(data.potato);
    });
    it3x("interprets opts as returnNew if it is a boolean", async () => {
      const data = { potato: "tomato" };
      const opts = true;
      const meta = await collection.save(data, opts);
      expect(meta).to.be.an("object");
      expect(meta)
        .to.have.property("_id")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_rev")
        .that.is.a("string");
      expect(meta)
        .to.have.property("_key")
        .that.is.a("string");
      expect(meta.new).to.be.an("object");
      expect(meta.new)
        .to.have.property("_id")
        .that.is.a("string");
      expect(meta.new)
        .to.have.property("_rev")
        .that.is.a("string");
      expect(meta.new)
        .to.have.property("_key")
        .that.is.a("string");
      expect(meta.new.potato).to.equal(data.potato);
    });
  });
  describe("documentCollection.replace", () => {
    it("replaces the given document", async () => {
      const doc = { potato: "tomato" };
      const meta = await collection.save(doc);
      delete meta.error;
      Object.assign(doc, meta);
      await collection.replace(doc as any, { sup: "dawg" });
      const data = await collection.document((doc as any)._key);
      expect(data).not.to.have.property("potato");
      expect(data)
        .to.have.property("sup")
        .that.equals("dawg");
    });
  });
  describe("documentCollection.update", () => {
    it("updates the given document", async () => {
      const doc = { potato: "tomato", empty: false };
      const meta = await collection.save(doc);
      delete meta.error;
      Object.assign(doc, meta);
      await collection.update(doc as any, { sup: "dawg", empty: null });
      const data = await collection.document((doc as any)._key);
      expect(data)
        .to.have.property("potato")
        .that.equals(doc.potato);
      expect(data)
        .to.have.property("sup")
        .that.equals("dawg");
      expect(data)
        .to.have.property("empty")
        .that.equals(null);
    });
    it("removes null values if keepNull is explicitly set to false", async () => {
      const doc = { potato: "tomato", empty: false };
      const meta = await collection.save(doc);
      delete meta.error;
      Object.assign(doc, meta);
      await collection.update(
        doc as any,
        { sup: "dawg", empty: null },
        { keepNull: false }
      );
      const data = await collection.document((doc as any)._key);
      expect(data)
        .to.have.property("potato")
        .that.equals(doc.potato);
      expect(data)
        .to.have.property("sup")
        .that.equals("dawg");
      expect(data).not.to.have.property("empty");
    });
  });
  describe("documentCollection.remove", () => {
    const key = `d_${Date.now()}`;
    beforeEach(async () => {
      await collection.save({ _key: key });
    });
    it("deletes the given document", async () => {
      await collection.remove(key);
      try {
        await collection.document(key);
      } catch (e) {
        return;
      }
      expect.fail();
    });
  });
});
