import { expect } from "chai";
import type { RequestOptions } from "../connection.js";
import { Database } from "../databases.js";
import type {
  CreateGraphOptions,
  EdgeDefinitionOptions,
  GraphDescription,
} from "../graphs.js";

describe("Graph creation request options", () => {
  for (const entryPoint of ["graph.create", "database.createGraph"] as const) {
    describe(entryPoint, () => {
      let db: Database;
      let requests: RequestOptions[];
      const graphDescription: GraphDescription = {
        _key: "regional",
        _id: "_graphs/regional",
        _rev: "test-revision",
        name: "regional",
        edgeDefinitions: [],
        orphanCollections: [],
        isSmart: true,
        isDisjoint: true,
      };

      beforeEach(() => {
        db = new Database();
        requests = [];
        // Exercise the connection's JSON serialization without a live server.
        (db as any)._connection._hosts = [
          {
            fetch: async (request: RequestOptions) => {
              requests.push(request);
              return new Response(JSON.stringify({ graph: graphDescription }), {
                status: 202,
                headers: { "content-type": "application/json" },
              });
            },
            close: () => {},
          },
        ];
      });

      afterEach(() => db.close());

      async function create(
        options?: CreateGraphOptions,
        edgeDefinitions: EdgeDefinitionOptions[] = [],
      ) {
        const graph = db.graph(graphDescription.name);
        if (entryPoint === "graph.create") {
          expect(await graph.create(edgeDefinitions, options)).to.deep.equal(
            graphDescription,
          );
        } else {
          expect(
            await db.createGraph(graph.name, edgeDefinitions, options),
          ).to.equal(graph);
        }
        expect(requests).to.have.lengthOf(1);
        const request = requests[0];
        expect(request.method).to.equal("POST");
        expect(
          new URL(request.pathname!, "http://localhost/").pathname,
        ).to.equal("/_db/_system/_api/gharial");
        expect(request.body).to.be.a("string");
        const body = JSON.parse(request.body);
        expect(body.name).to.equal(graph.name);
        expect(body).not.to.have.property("isSmart");
        expect(body).not.to.have.property("isDisjoint");
        return { request, body };
      }

      const cases: {
        title: string;
        options?: CreateGraphOptions;
        expected: Record<string, unknown>;
      }[] = [
        {
          title: "nests isSmart without a smartGraphAttribute",
          options: { isSmart: true },
          expected: { isSmart: true },
        },
        {
          title: "preserves explicit false flags",
          options: { isSmart: false, isDisjoint: false },
          expected: { isSmart: false, isDisjoint: false },
        },
        { title: "allows omitted options", expected: {} },
        { title: "allows empty options", options: {}, expected: {} },
        {
          title: "nests both flags alongside the smart attribute",
          options: {
            isSmart: true,
            isDisjoint: true,
            smartGraphAttribute: "region",
          },
          expected: {
            isSmart: true,
            isDisjoint: true,
            smartGraphAttribute: "region",
          },
        },
        {
          title: "forwards a smart attribute without injecting isSmart",
          options: { smartGraphAttribute: "region" },
          expected: { smartGraphAttribute: "region" },
        },
        {
          title: "forwards isDisjoint alone without selecting a graph type",
          options: { isDisjoint: true },
          expected: { isDisjoint: true },
        },
        {
          title: "forwards isSmart with satellite replication",
          options: { isSmart: true, replicationFactor: "satellite" },
          expected: { isSmart: true, replicationFactor: "satellite" },
        },
      ];

      for (const { title, options, expected } of cases) {
        it(title, async () => {
          const { body } = await create(options);
          expect(body).to.deep.equal({
            name: graphDescription.name,
            edgeDefinitions: [],
            options: expected,
          });
        });
      }

      it("preserves mixed options and normalizes collection handles without mutation", async () => {
        const vertex = db.collection("vertices");
        const satellite = db.collection("satellite");
        const orphans = ["orphan", db.collection("other_orphan")];
        const satellites = ["other_satellite", satellite];
        const to = ["other_vertices", vertex];
        const edgeDefinitions = [
          { collection: db.collection("links"), from: vertex, to },
        ];
        const options: CreateGraphOptions = {
          isSmart: true,
          isDisjoint: true,
          smartGraphAttribute: "region",
          numberOfShards: 3,
          replicationFactor: 2,
          writeConcern: 2,
          waitForSync: true,
          orphanCollections: orphans,
          satellites,
        };
        for (const value of [
          options,
          orphans,
          satellites,
          to,
          edgeDefinitions[0],
          edgeDefinitions,
        ]) {
          Object.freeze(value);
        }

        const { request, body } = await create(options, edgeDefinitions);
        expect(body).to.deep.equal({
          name: graphDescription.name,
          edgeDefinitions: [
            {
              collection: "links",
              from: ["vertices"],
              to: ["other_vertices", "vertices"],
            },
          ],
          orphanCollections: ["orphan", "other_orphan"],
          options: {
            isSmart: true,
            isDisjoint: true,
            smartGraphAttribute: "region",
            numberOfShards: 3,
            replicationFactor: 2,
            writeConcern: 2,
            satellites: ["other_satellite", "satellite"],
          },
        });
        expect(new URLSearchParams(request.search).get("waitForSync")).to.equal(
          "true",
        );
      });

      for (const orphanKind of ["name", "handle"] as const) {
        it(`normalizes a scalar orphan collection ${orphanKind}`, async () => {
          const { request, body } = await create({
            orphanCollections:
              orphanKind === "name" ? "orphan" : db.collection("orphan"),
            waitForSync: false,
          });
          expect(body.orphanCollections).to.deep.equal(["orphan"]);
          expect(body.options).to.deep.equal({});
          expect(body).not.to.have.property("waitForSync");
          expect(
            new URLSearchParams(request.search).get("waitForSync"),
          ).to.equal("false");
        });
      }
    });
  }
});
