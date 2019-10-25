import { expect } from "chai";
import {
  ArangoError,
  Database,
  DocumentCollection,
  Graph,
  GraphVertexCollection
} from "../arangojs";
import { ArangoCollection } from "../collection";

const range = (n: number): number[] => Array.from(Array(n).keys());

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);

async function createCollections(db: Database) {
  const vertexCollectionNames = range(2).map(i => `vc_${Date.now()}_${i}`);
  const edgeCollectionNames = range(2).map(i => `ec_${Date.now()}_${i}`);
  await Promise.all([
    ...vertexCollectionNames.map(name => db.createCollection(name)),
    ...edgeCollectionNames.map(name => db.createEdgeCollection(name))
  ] as Promise<ArangoCollection>[]);
  return [vertexCollectionNames, edgeCollectionNames];
}

async function createGraph(
  graph: Graph,
  vertexCollectionNames: string[],
  edgeCollectionNames: string[]
) {
  return await graph.create(
    edgeCollectionNames.map(name => ({
      collection: name,
      from: vertexCollectionNames,
      to: vertexCollectionNames
    }))
  );
}

describe("Manipulating graph vertices", function() {
  const name = `testdb_${Date.now()}`;
  let db: Database;
  let graph: Graph;
  let collectionNames: string[];
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
  beforeEach(async () => {
    graph = db.graph(`g_${Date.now()}`);
    const names = await createCollections(db);
    collectionNames = names.reduce((a, b) => a.concat(b));
    await createGraph(graph, names[0], names[1]);
  });
  afterEach(async () => {
    await graph.drop();
    await Promise.all(collectionNames.map(name => db.collection(name).drop()));
  });
  describe("graph.vertexCollection", () => {
    it("returns a GraphVertexCollection instance for the collection", () => {
      const name = "potato";
      const collection = graph.vertexCollection(name);
      expect(collection).to.be.an.instanceof(GraphVertexCollection);
      expect(collection)
        .to.have.property("name")
        .that.equals(name);
    });
  });
  describe("graph.addVertexCollection", () => {
    let vertexCollection: DocumentCollection;
    beforeEach(async () => {
      vertexCollection = await db.createCollection(`xc_${Date.now()}`);
    });
    afterEach(async () => {
      await vertexCollection.drop();
    });
    it("adds the given vertex collection to the graph", async () => {
      const data = await graph.addVertexCollection(vertexCollection.name);
      expect(data.orphanCollections).to.contain(vertexCollection.name);
    });
  });
  describe("graph.removeVertexCollection", () => {
    let vertexCollection: DocumentCollection;
    beforeEach(async () => {
      vertexCollection = await db.createCollection(`xc_${Date.now()}`);
      await graph.addVertexCollection(vertexCollection.name);
    });
    it("removes the given vertex collection from the graph", async () => {
      const data = await graph.removeVertexCollection(vertexCollection.name);
      expect(data.orphanCollections).not.to.contain(vertexCollection.name);
      await vertexCollection.get();
    });
    it("destroys the collection if explicitly passed true", async () => {
      const data = await graph.removeVertexCollection(
        vertexCollection.name,
        true
      );
      expect(data.orphanCollections).not.to.contain(vertexCollection.name);
      try {
        await vertexCollection.get();
      } catch (err) {
        expect(err).to.be.an.instanceof(ArangoError);
        return;
      }
      expect.fail();
    });
  });
});
