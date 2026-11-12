import { expect } from "chai";
import { Database } from "../databases.js";
import { DocumentMetadata } from "../documents.js";
import { GraphVertexCollection } from "../graphs.js";
import { config } from "./_config.js";
import {
  extendedCollectionNames,
  supportsExtendedNames,
  waitForExtendedCollection,
} from "./_extended-names.js";
import {
  clusterIntegrationTimeoutMs,
  propagationForResourceMs,
  waitForNewDatabase,
} from "./_integration-timeouts.js";

describe("GraphVertexCollection API", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  const dbName = `testdb_${Date.now()}`;
  let system: Database, db: Database;
  let collection: GraphVertexCollection;
  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
    await system.createDatabase(dbName);
    db = system.database(dbName);
    await waitForNewDatabase(db);
    const graph = db.graph(`testgraph_${Date.now()}`);
    await graph.create([
      {
        collection: "knows",
        from: ["person"],
        to: ["person"],
      },
    ]);
    await db.waitForPropagation(
      { pathname: `/_api/gharial/${graph.name}` },
      propagationForResourceMs,
    );
    collection = graph.vertexCollection("person");
  });
  after(async () => {
    try {
      await system.dropDatabase(dbName);
    } finally {
      system.close();
    }
  });
  beforeEach(async () => {
    await collection.collection.truncate();
  });
  /*
   * Graph vertex reads and writes must keep special characters in the
   * collection path component so they reach the intended vertex.
   * Extended names are opt-in since ArangoDB 3.11.0 (--database.extended-names)
   * and enabled by default since 3.12.0. (DE-1273)
   */
  describe("extended collection names", () => {
    before(async function () {
      if (!(await supportsExtendedNames(db))) this.skip();
    });
    for (const name of extendedCollectionNames) {
      it(`performs vertex operations in ${name}`, async () => {
        const graph = db.graph(`extended_${Date.now()}`);
        await graph.create([], { orphanCollections: [name] });
        try {
          await waitForExtendedCollection(db, name);
          await db.waitForPropagation(
            { pathname: `/_api/gharial/${graph.name}` },
            propagationForResourceMs,
          );
          const vertices = graph.vertexCollection(name);
          const meta = await vertices.save({ _key: "key", value: 1 });
          expect(meta._id).to.equal(`${name}/key`);
          expect(await vertices.vertex({ _key: "key" })).to.have.property(
            "value",
            1,
          );
          await vertices.update(meta, { value: 2 });
          expect(await vertices.vertex(meta._id)).to.have.property("value", 2);
          await vertices.replace(meta._id, { value: 3 });
          expect(await vertices.vertex("key")).to.have.property("value", 3);
          await vertices.remove({ _id: meta._id });
          expect(await vertices.vertex("key", true)).to.equal(null);
          // Gharial HEAD is not supported by the tested servers; URL coverage is in 40.
        } finally {
          await graph.drop(true);
        }
      });
    }
  });
  describe("graphVertexCollection.vertex", () => {
    const data = { foo: "bar" };
    let meta: DocumentMetadata;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns a vertex in the collection", async () => {
      const doc = await collection.vertex(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc.foo).to.equal(data.foo);
    });
    it("does not throw on not found when graceful", async () => {
      const doc = await collection.vertex("does-not-exist", true);
      expect(doc).to.equal(null);
    });
  });
  describe("graphVertexCollection.vertex", () => {
    const data = { foo: "bar" };
    let meta: DocumentMetadata;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns a vertex in the collection", async () => {
      const doc = await collection.vertex(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc.foo).to.equal(data.foo);
    });
    it("does not throw on not found when graceful", async () => {
      const doc = await collection.vertex("does-not-exist", true);
      expect(doc).to.equal(null);
    });
  });
  describe("graphVertexCollection.save", () => {
    it("creates a vertex in the collection", async () => {
      const data = { foo: "bar" };
      const meta = await collection.save(data);
      expect(meta).to.be.an("object");
      expect(meta).to.have.property("_id").that.is.a("string");
      expect(meta).to.have.property("_rev").that.is.a("string");
      expect(meta).to.have.property("_key").that.is.a("string");
      const doc = await collection.vertex(meta._id);
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
      expect(meta).to.have.property("_id").that.is.a("string");
      expect(meta).to.have.property("_rev").that.is.a("string");
      expect(meta).to.have.property("_key").that.equals(data._key);
      const doc = await collection.vertex(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "potato");
      expect(doc._id).to.equal(meta._id);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._key).to.equal(data._key);
      expect(doc.potato).to.equal(data.potato);
    });
  });
  describe("graphVertexCollection.replace", () => {
    it("replaces the given vertex", async () => {
      const data = { potato: "tomato" };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.replace(doc, { sup: "dawg" });
      const newData = await collection.vertex(doc._key);
      expect(newData).not.to.have.property("potato");
      expect(newData).to.have.property("sup").that.equals("dawg");
    });
  });
  describe("graphVertexCollection.update", () => {
    it("updates the given vertex", async () => {
      const data = { potato: "tomato", empty: false };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.update(doc, { sup: "dawg", empty: null });
      const newData = await collection.vertex(doc._key);
      expect(newData).to.have.property("potato").that.equals(doc.potato);
      expect(newData).to.have.property("sup").that.equals("dawg");
      expect(newData).to.have.property("empty").that.equals(null);
    });
    it("removes null values if keepNull is explicitly set to false", async () => {
      const data = { potato: "tomato", empty: false };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.update(
        doc,
        { sup: "dawg", empty: null },
        { keepNull: false },
      );
      const newData = await collection.vertex(doc._key);
      expect(newData).to.have.property("potato").that.equals(doc.potato);
      expect(newData).to.have.property("sup").that.equals("dawg");
      expect(newData).not.to.have.property("empty");
    });
  });
  describe("graphVertexCollection.remove", () => {
    const key = `d_${Date.now()}`;
    beforeEach(async () => {
      await collection.save({ _key: key });
    });
    it("deletes the given vertex", async () => {
      await collection.remove(key);
      try {
        await collection.vertex(key);
      } catch (e: any) {
        return;
      }
      expect.fail();
    });
  });
});
