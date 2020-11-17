import { expect } from "chai";
import { ArangoCollection } from "../collection";
import { Database } from "../database";
import { Graph } from "../graph";
import { config } from "./_config";

const range = (n: number): number[] => Array.from(Array(n).keys());

async function createCollections(db: Database) {
  const vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`);
  const edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`);
  await Promise.all([
    ...vertexCollectionNames.map((name) => db.createCollection(name)),
    ...edgeCollectionNames.map((name) => db.createEdgeCollection(name)),
  ] as Promise<ArangoCollection>[]);
  return [vertexCollectionNames, edgeCollectionNames];
}

async function createGraph(
  graph: Graph,
  vertexCollectionNames: string[],
  edgeCollectionNames: string[]
) {
  return await graph.create(
    edgeCollectionNames.map((name) => ({
      collection: name,
      from: vertexCollectionNames,
      to: vertexCollectionNames,
    }))
  );
}

describe("Graph API", function () {
  let db: Database;
  const name = `testdb_${Date.now()}`;
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
  describe("graph.get", () => {
    let graph: Graph;
    let collectionNames: string[];
    before(async () => {
      graph = db.graph(`g_${Date.now()}`);
      const names = await createCollections(db);
      collectionNames = names.reduce((a, b) => a.concat(b));
      await createGraph(graph, names[0], names[1]);
    });
    after(async () => {
      await graph.drop();
      await Promise.all(
        collectionNames.map((name) => db.collection(name).drop())
      );
    });
    it("fetches information about the graph", async () => {
      const data = await graph.get();
      expect(data).to.have.property("name", graph.name);
    });
  });
  describe("graph.create", () => {
    let edgeCollectionNames: string[];
    let vertexCollectionNames: string[];
    before(async () => {
      [vertexCollectionNames, edgeCollectionNames] = await createCollections(
        db
      );
    });
    after(async () => {
      await Promise.all(
        [...edgeCollectionNames, ...vertexCollectionNames].map((name) =>
          db.collection(name).drop()
        )
      );
    });
    it("creates the graph", async () => {
      const graph = db.graph(`g_${Date.now()}`);
      await graph.create(
        edgeCollectionNames.map((name) => ({
          collection: name,
          from: vertexCollectionNames,
          to: vertexCollectionNames,
        }))
      );
      const data = await graph.get();
      expect(data).to.have.property("name", graph.name);
    });
  });
  describe("graph.drop", () => {
    let graph: Graph;
    let edgeCollectionNames: string[];
    let vertexCollectionNames: string[];
    beforeEach(async () => {
      graph = db.graph(`g_${Date.now()}`);
      [vertexCollectionNames, edgeCollectionNames] = await createCollections(
        db
      );
      await createGraph(graph, vertexCollectionNames, edgeCollectionNames);
    });
    afterEach(async () => {
      await Promise.all(
        [...edgeCollectionNames, ...vertexCollectionNames].map((name) =>
          db
            .collection(name)
            .drop()
            .catch(() => null)
        )
      );
    });
    it("destroys the graph if not passed true", async () => {
      await graph.drop();
      try {
        await graph.get();
      } catch (e) {
        const collections = await db.listCollections();
        expect(collections.map((c: any) => c.name)).to.include.members([
          ...edgeCollectionNames,
          ...vertexCollectionNames,
        ]);
        return;
      }
      expect.fail();
    });
    it("additionally drops all of its collections if passed true", async () => {
      await graph.drop(true);
      try {
        await graph.get();
      } catch (e) {
        const collections = await db.listCollections();
        expect(collections.map((c: any) => c.name)).not.to.include.members([
          ...edgeCollectionNames,
          ...vertexCollectionNames,
        ]);
        return;
      }
      expect.fail();
    });
  });
});
