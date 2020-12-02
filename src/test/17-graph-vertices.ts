import { expect } from "chai";
import { DocumentCollection } from "../collection";
import { Database } from "../database";
import { ArangoError } from "../error";
import { Graph, GraphVertexCollection } from "../graph";
import { config } from "./_config";

const range = (n: number): number[] => Array.from(Array(n).keys());

async function createCollections(db: Database) {
  const vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`);
  const edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`);
  await Promise.all([
    ...vertexCollectionNames.map(async (name) => {
      const collection = await db.createCollection(name);
      await db.waitForPropagation(
        { path: `/_api/collection/${collection.name}` },
        10000
      );
    }),
    ...edgeCollectionNames.map(async (name) => {
      const collection = await db.createEdgeCollection(name);
      await db.waitForPropagation(
        { path: `/_api/collection/${collection.name}` },
        10000
      );
    }),
  ] as Promise<void>[]);
  return [vertexCollectionNames, edgeCollectionNames];
}

async function createGraph(
  graph: Graph,
  vertexCollectionNames: string[],
  edgeCollectionNames: string[]
) {
  const result = await graph.create(
    edgeCollectionNames.map((name) => ({
      collection: name,
      from: vertexCollectionNames,
      to: vertexCollectionNames,
    }))
  );
  await (graph as any)._db.waitForPropagation(
    { path: `/_api/gharial/${graph.name}` },
    10000
  );
  return result;
}

describe("Manipulating graph vertices", function () {
  const name = `testdb_${Date.now()}`;
  let db: Database;
  let graph: Graph;
  let collectionNames: string[];
  before(async () => {
    db = new Database(config);
    if (Array.isArray(config.url)) await db.acquireHostList();
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
    await Promise.all(
      collectionNames.map((name) => db.collection(name).drop())
    );
  });
  describe("graph.vertexCollection", () => {
    it("returns a GraphVertexCollection instance for the collection", () => {
      const name = "potato";
      const collection = graph.vertexCollection(name);
      expect(collection).to.be.an.instanceof(GraphVertexCollection);
      expect(collection).to.have.property("name").that.equals(name);
    });
  });
  describe("graph.addVertexCollection", () => {
    let vertexCollection: DocumentCollection;
    beforeEach(async () => {
      vertexCollection = await db.createCollection(`xc_${Date.now()}`);
      await db.waitForPropagation(
        { path: `/_api/collection/${vertexCollection.name}` },
        10000
      );
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
      await db.waitForPropagation(
        { path: `/_api/collection/${vertexCollection.name}` },
        10000
      );
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
