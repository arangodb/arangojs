import { expect } from "chai";
import { Database } from "../databases.js";
import { isArangoError } from "../errors.js";
import { Graph, type CreateGraphOptions } from "../graphs.js";
import { GRAPH_NOT_FOUND } from "../lib/codes.js";
import { versionStringToArangoVersionCode } from "./_arango-server-version.js";
import { config } from "./_config.js";
import {
  clusterIntegrationTimeoutMs,
  propagationForResourceMs,
  waitForNewDatabase,
} from "./_integration-timeouts.js";

const range = (n: number): number[] => Array.from(Array(n).keys());

async function createCollections(db: Database) {
  const vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`);
  const edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`);
  await Promise.all([
    ...vertexCollectionNames.map(async (name) => {
      const collection = await db.createCollection(name);
      await db.waitForPropagation(
        { pathname: `/_api/collection/${collection.name}` },
        propagationForResourceMs,
      );
    }),
    ...edgeCollectionNames.map(async (name) => {
      const collection = await db.createEdgeCollection(name);
      await db.waitForPropagation(
        { pathname: `/_api/collection/${collection.name}` },
        propagationForResourceMs,
      );
    }),
  ] as Promise<void>[]);
  return [vertexCollectionNames, edgeCollectionNames];
}

async function createGraph(
  graph: Graph,
  vertexCollectionNames: string[],
  edgeCollectionNames: string[],
) {
  return await graph.create(
    edgeCollectionNames.map((name) => ({
      collection: name,
      from: vertexCollectionNames,
      to: vertexCollectionNames,
    })),
  );
}

describe("Graph API", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  let system: Database, db: Database;
  const name = `testdb_${Date.now()}`;
  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
    db = await system.createDatabase(name);
    await waitForNewDatabase(db);
  });
  after(async () => {
    try {
      await system.dropDatabase(name);
    } finally {
      system.close();
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
        collectionNames.map((name) => db.collection(name).drop()),
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
    let graph: Graph;
    before(async () => {
      [vertexCollectionNames, edgeCollectionNames] =
        await createCollections(db);
    });
    after(async () => {
      await Promise.all([
        ...edgeCollectionNames.map(async (name) => {
          try {
            await graph.removeEdgeDefinition(name, true);
          } catch {}
        }),
        ...vertexCollectionNames.map(async (name) => {
          try {
            await graph.removeVertexCollection(name, true);
          } catch {}
        }),
      ]);
    });
    it("creates the graph", async () => {
      graph = db.graph(`g_${Date.now()}`);
      await graph.create(
        edgeCollectionNames.map((name) => ({
          collection: name,
          from: vertexCollectionNames,
          to: vertexCollectionNames,
        })),
      );
      await db.waitForPropagation(
        { pathname: `/_api/gharial/${graph.name}` },
        propagationForResourceMs,
      );
      const data = await graph.get();
      expect(data).to.have.property("name", graph.name);
    });
  });
  describe("graph.create advanced graph options", function () {
    let graph: Graph;
    let collectionNames: string[];
    let sequence = 0;

    before(async function () {
      const version = await system.version();
      const { role } = await system.request<{ role: string }>({
        pathname: "/_admin/server/role",
      });
      // Community Edition includes these features from 3.12.5 onward.
      // https://docs.arango.ai/arangodb/3.12/release-notes/version-3.12/whats-new-in-3-12/
      if (
        role !== "COORDINATOR" ||
        (version.license !== "enterprise" &&
          versionStringToArangoVersionCode(version.version) < 31205)
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          `Skipping advanced graph creation: ArangoDB ${version.version}, ${version.license}, role ${role} requires a cluster with smart graph support.`,
        );
        this.skip();
      }
    });

    beforeEach(() => {
      const prefix = `graph_options_${Date.now()}_${sequence++}`;
      graph = db.graph(prefix);
      collectionNames = ["edges", "start", "end", "orphan"].map(
        (suffix) => `${prefix}_${suffix}`,
      );
    });

    afterEach(async () => {
      try {
        await graph.drop(true);
      } catch (error) {
        if (!isArangoError(error) || error.errorNum !== GRAPH_NOT_FOUND) {
          throw error;
        }
      } finally {
        // A failed create can leave collections without a graph definition.
        for (const name of collectionNames) {
          const collection = db.collection(name);
          if (await collection.exists()) await collection.drop();
        }
      }
    });

    const cases: {
      title: string;
      options: CreateGraphOptions;
      expected: Record<string, unknown>;
      satellite?: boolean;
    }[] = [
      {
        title: "creates an EnterpriseGraph without a smart attribute",
        options: { isSmart: true },
        expected: { isSmart: true, isSatellite: false, isDisjoint: false },
      },
      {
        title: "creates a SmartGraph with explicit isSmart",
        options: { isSmart: true, smartGraphAttribute: "region" },
        expected: {
          isSmart: true,
          isSatellite: false,
          smartGraphAttribute: "region",
          isDisjoint: false,
        },
      },
      {
        title: "creates a SmartGraph from the smart attribute alone",
        options: { smartGraphAttribute: "region" },
        expected: {
          isSmart: true,
          isSatellite: false,
          smartGraphAttribute: "region",
          isDisjoint: false,
        },
      },
      {
        title: "creates a Disjoint SmartGraph",
        options: {
          isSmart: true,
          smartGraphAttribute: "region",
          isDisjoint: true,
        },
        expected: {
          isSmart: true,
          isSatellite: false,
          smartGraphAttribute: "region",
          isDisjoint: true,
        },
      },
      {
        title: "creates a SmartGraph with a satellite vertex collection",
        options: { isSmart: true, smartGraphAttribute: "region" },
        expected: {
          isSmart: true,
          isSatellite: false,
          smartGraphAttribute: "region",
        },
        satellite: true,
      },
      {
        title: "creates a SatelliteGraph when isSmart is also true",
        options: { isSmart: true, replicationFactor: "satellite" },
        expected: { isSmart: false, isSatellite: true },
      },
    ];

    for (const { title, options, expected, satellite } of cases) {
      it(title, async () => {
        const [edges, start, end, orphan] = collectionNames;
        const created = await graph.create(
          [{ collection: edges, from: [start], to: [end] }],
          {
            ...(options.replicationFactor === "satellite"
              ? {}
              : { numberOfShards: 2, replicationFactor: 1 }),
            ...options,
            orphanCollections: [orphan],
            ...(satellite ? { satellites: [db.collection(end)] } : {}),
          },
        );
        await db.waitForPropagation(
          { pathname: `/_api/gharial/${graph.name}` },
          propagationForResourceMs,
        );
        for (const data of [created, await graph.get()]) {
          expect(data).to.include({ name: graph.name, ...expected });
          expect(data.orphanCollections).to.include(orphan);
          if (!options.smartGraphAttribute) {
            expect(data.smartGraphAttribute).to.be.undefined;
          }
        }
        if (satellite) {
          await db.waitForPropagation(
            { pathname: `/_api/collection/${end}` },
            propagationForResourceMs,
          );
          const properties = await db.collection(end).properties();
          expect(properties.replicationFactor).to.equal("satellite");
        }
      });
    }
  });
  describe("graph.drop", () => {
    let graph: Graph;
    let edgeCollectionNames: string[];
    let vertexCollectionNames: string[];
    beforeEach(async () => {
      graph = db.graph(`g_${Date.now()}`);
      [vertexCollectionNames, edgeCollectionNames] =
        await createCollections(db);
      await createGraph(graph, vertexCollectionNames, edgeCollectionNames);
    });
    afterEach(async () => {
      await Promise.all(
        [...edgeCollectionNames, ...vertexCollectionNames].map((name) =>
          db
            .collection(name)
            .drop()
            .catch(() => null),
        ),
      );
    });
    it("destroys the graph if not passed true", async () => {
      await graph.drop();
      try {
        await graph.get();
      } catch (e: any) {
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
      } catch (e: any) {
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
