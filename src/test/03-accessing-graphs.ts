import { expect } from "chai";
import { Database } from "../database";
import { Graph } from "../graph";
import { config } from "./_config";

const range = (n: number): number[] => Array.from(Array(n).keys());

describe("Accessing graphs", function () {
  const name = `testdb_${Date.now()}`;
  let db: Database;
  before(async () => {
    db = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") await db.acquireHostList();
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
  describe("database.graph", () => {
    it("returns a Graph instance", () => {
      const name = "potato";
      const graph = db.graph(name);
      expect(graph).to.be.an.instanceof(Graph);
      expect(graph).to.have.property("name").that.equals(name);
    });
  });
  describe("database.listGraphs", () => {
    const vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`);
    const edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`);
    const graphNames = range(4).map((i) => `g_${Date.now()}_${i}`);
    before(async () => {
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
      await Promise.all([
        ...graphNames.map(async (name) => {
          const graph = db.graph(name);
          await graph.create(
            edgeCollectionNames.map((name) => ({
              collection: name,
              from: vertexCollectionNames,
              to: vertexCollectionNames,
            }))
          );
          await db.waitForPropagation(
            { path: `/_api/gharial/${graph.name}` },
            10000
          );
        }),
      ]);
    });
    after(async () => {
      await Promise.all(graphNames.map((name) => db.graph(name).drop()));
      await Promise.all(
        vertexCollectionNames
          .concat(edgeCollectionNames)
          .map((name) => db.collection(name).drop())
      );
    });
    it("fetches information about all graphs", async () => {
      const graphs = await db.listGraphs();
      expect(graphs.length).to.equal(graphNames.length);
      expect(graphs.map((g: any) => g._key).sort()).to.eql(graphNames);
    });
  });
  describe("database.graphs", () => {
    const vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`);
    const edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`);
    const graphNames = range(4).map((i) => `g_${Date.now()}_${i}`);
    before(async () => {
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
      await Promise.all([
        ...graphNames.map(async (name) => {
          const graph = db.graph(name);
          await graph.create(
            edgeCollectionNames.map((name) => ({
              collection: name,
              from: vertexCollectionNames,
              to: vertexCollectionNames,
            }))
          );
          await db.waitForPropagation(
            { path: `/_api/gharial/${graph.name}` },
            10000
          );
        }),
      ]);
    });
    after(async () => {
      await Promise.all(graphNames.map((name) => db.graph(name).drop()));
      await Promise.all(
        vertexCollectionNames
          .concat(edgeCollectionNames)
          .map((name) => db.collection(name).drop())
      );
    });
    it("creates Graph instances", async () => {
      const graphs = await db.graphs();
      expect(graphs.length).to.equal(graphNames.length);
      expect(graphs.map((g: any) => g.name).sort()).to.eql(graphNames);
      graphs.forEach((graph: any) => expect(graph).to.be.an.instanceof(Graph));
    });
  });
});
