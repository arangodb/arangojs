import { expect } from "chai";
import { Database } from "../databases.js";
import { DocumentMetadata } from "../documents.js";
import { GraphEdgeCollection } from "../graphs.js";
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

describe("GraphEdgeCollection API", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  const dbName = `testdb_${Date.now()}`;
  let system: Database, db: Database;
  let collection: GraphEdgeCollection;
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
    collection = graph.edgeCollection("knows");
    await graph
      .vertexCollection("person")
      .collection.import([
        { _key: "Alice" },
        { _key: "Bob" },
        { _key: "Charlie" },
        { _key: "Dave" },
        { _key: "Eve" },
      ]);
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
   * Graph edge reads and writes must preserve special characters in collection
   * names without changing the document IDs used by the edge's endpoints.
   * Extended names are opt-in since ArangoDB 3.11.0 (--database.extended-names)
   * and enabled by default since 3.12.0. (DE-1273)
   */
  describe("extended collection names", () => {
    before(async function () {
      if (!(await supportsExtendedNames(db))) this.skip();
    });
    for (const name of extendedCollectionNames) {
      it(`performs graph edge operations in ${name}`, async () => {
        const vertexName = `v_${name}`;
        const graph = db.graph(`extended_${Date.now()}`);
        await graph.create([
          { collection: name, from: [vertexName], to: [vertexName] },
        ]);
        try {
          await waitForExtendedCollection(db, name);
          await waitForExtendedCollection(db, vertexName);
          await db.waitForPropagation(
            { pathname: `/_api/gharial/${graph.name}` },
            propagationForResourceMs,
          );
          const vertices = graph.vertexCollection(vertexName);
          const a = await vertices.save({ _key: "a" });
          const b = await vertices.save({ _key: "b" });
          const edges = graph.edgeCollection(name);
          const endpoints = { _from: a._id, _to: b._id };
          const meta = await edges.save({ _key: "key", ...endpoints, value: 1 });
          expect(meta._id).to.equal(`${name}/key`);
          expect(await edges.edge(meta._id)).to.include(endpoints);
          await edges.update({ _key: "key" }, { value: 2 });
          expect(await edges.edge(meta)).to.have.property("value", 2);
          await edges.replace(meta._id, { ...endpoints, value: 3 });
          expect(await edges.edge("key")).to.include({ ...endpoints, value: 3 });
          await edges.remove(meta);
          expect(await edges.edge("key", true)).to.equal(null);
        } finally {
          await graph.drop(true);
        }
      });
    }
  });
  describe("edgeCollection.edge", () => {
    const data = { _from: "person/Bob", _to: "person/Alice" };
    let meta: DocumentMetadata;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns an edge in the collection", async () => {
      const doc = await collection.edge(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._from).to.equal(data._from);
      expect(doc._to).to.equal(data._to);
    });
    it("does not throw on not found when graceful", async () => {
      const doc = await collection.edge("does-not-exist", true);
      expect(doc).to.equal(null);
    });
  });
  describe("edgeCollection.edge", () => {
    const data = { _from: "person/Bob", _to: "person/Alice" };
    let meta: DocumentMetadata;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns an edge in the collection", async () => {
      const doc = await collection.edge(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._from).to.equal(data._from);
      expect(doc._to).to.equal(data._to);
    });
    it("does not throw on not found when graceful", async () => {
      const doc = await collection.edge("does-not-exist", true);
      expect(doc).to.equal(null);
    });
  });
  describe("edgeCollection.save", () => {
    it("creates an edge in the collection", async () => {
      const data = { _from: "person/Bob", _to: "person/Alice" };
      const meta = await collection.save(data);
      expect(meta).to.be.an("object");
      expect(meta).to.have.property("_id").that.is.a("string");
      expect(meta).to.have.property("_rev").that.is.a("string");
      expect(meta).to.have.property("_key").that.is.a("string");
      const doc = await collection.edge(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._from).to.equal(data._from);
      expect(doc._to).to.equal(data._to);
    });
    it("uses the given _key if provided", async () => {
      const data = { _key: "banana", _from: "person/Bob", _to: "person/Alice" };
      const meta = await collection.save(data);
      expect(meta).to.be.an("object");
      expect(meta).to.have.property("_id").that.is.a("string");
      expect(meta).to.have.property("_rev").that.is.a("string");
      expect(meta).to.have.property("_key").that.equals(data._key);
      const doc = await collection.edge(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
      expect(doc._id).to.equal(meta._id);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._key).to.equal(data._key);
      expect(doc._from).to.equal(data._from);
      expect(doc._to).to.equal(data._to);
    });
  });
  describe("edgeCollection.replace", () => {
    it("replaces the given edge", async () => {
      const data = {
        potato: "tomato",
        _from: "person/Bob",
        _to: "person/Alice",
      };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.replace(doc, {
        sup: "dawg",
        _from: "person/Bob",
        _to: "person/Alice",
      });
      const newData = await collection.edge(doc._key);
      expect(newData).not.to.have.property("potato");
      expect(newData).to.have.property("sup", "dawg");
    });
  });
  describe("edgeCollection.update", () => {
    it("updates the given document", async () => {
      const data = {
        potato: "tomato",
        empty: false,
        _from: "person/Bob",
        _to: "person/Alice",
      };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.update(doc, { sup: "dawg", empty: null });
      const newData = await collection.edge(doc._key);
      expect(newData).to.have.property("potato", doc.potato);
      expect(newData).to.have.property("sup", "dawg");
      expect(newData).to.have.property("empty", null);
    });
    it("removes null values if keepNull is explicitly set to false", async () => {
      const data = {
        potato: "tomato",
        empty: false,
        _from: "person/Bob",
        _to: "person/Alice",
      };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.update(
        doc,
        { sup: "dawg", empty: null },
        { keepNull: false },
      );
      const newData = await collection.edge(doc._key);
      expect(newData).to.have.property("potato", doc.potato);
      expect(newData).to.have.property("sup", "dawg");
      expect(newData).not.to.have.property("empty");
    });
  });
  describe("edgeCollection.remove", () => {
    const key = `d_${Date.now()}`;
    beforeEach(async () => {
      await collection.save({
        _key: key,
        _from: "person/Bob",
        _to: "person/Alice",
      });
    });
    it("deletes the given edge", async () => {
      await collection.remove(key);
      try {
        await collection.edge(key);
      } catch (e: any) {
        return;
      }
      expect.fail();
    });
  });
});
