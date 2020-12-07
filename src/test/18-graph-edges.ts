import { expect } from "chai";
import { Database } from "../database";
import { Graph } from "../graph";
import { config } from "./_config";

describe("Manipulating graph edges", function () {
  const dbName = `testdb_${Date.now()}`;
  const graphName = `testgraph_${Date.now()}`;
  let db: Database;
  let graph: Graph;
  before(async () => {
    db = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") await db.acquireHostList();
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
  });
  after(async () => {
    try {
      db.useDatabase("_system");
      await db.dropDatabase(dbName);
    } finally {
      db.close();
    }
  });
  beforeEach(async () => {
    graph = db.graph(graphName);
    await graph.create([
      {
        collection: "knows",
        from: ["person"],
        to: ["person"],
      },
    ]);
    await db.waitForPropagation({ path: `/_api/gharial/${graph.name}` }, 10000);
  });
  afterEach(async () => {
    await graph.drop();
  });
  describe("graph.get", () => {
    it("should return information about the graph", async () => {
      const info = await graph.get();
      expect(info).to.have.property("name", graphName);
      expect(info).to.have.property("edgeDefinitions");
      expect(info.edgeDefinitions).to.be.instanceOf(Array);
      expect(info.edgeDefinitions.map((e: any) => e.collection)).to.contain(
        "knows"
      );
      expect(info.edgeDefinitions.length).to.equal(1);
      const edgeDefinition = info.edgeDefinitions.filter(
        (e: any) => e.collection === "knows"
      );
      expect(
        [].concat.apply(
          [],
          edgeDefinition.map((e: any) => e.from)
        )
      ).to.contain("person");
      expect(
        [].concat.apply(
          [],
          edgeDefinition.map((e: any) => e.to)
        )
      ).to.contain("person");
    });
  });
  describe("graph.edgeCollections", () => {
    it("should contain edge collection", async () => {
      const info = await graph.edgeCollections();
      expect(info).to.be.instanceOf(Array);
      expect(info.map((c: any) => c.name)).to.contain("knows");
      expect(info.length).to.equal(1);
    });
  });
  describe("graph.listEdgeCollections", () => {
    it("should return all edge collection names", async () => {
      const info = await graph.listEdgeCollections();
      expect(info).to.be.instanceOf(Array);
      expect(info).to.contain("knows");
      expect(info.length).to.equal(1);
    });
  });
  describe("graph.listVertexCollections", () => {
    it("should return all vertex collection names", async () => {
      const info = await graph.listVertexCollections();
      expect(info).to.be.instanceOf(Array);
      expect(info).to.contain("person");
      expect(info.length).to.equal(1);
    });
  });
  describe("graph.addEdgeDefinition", () => {
    it("should add an edgeDefinition to the graph", async () => {
      const info = await graph.addEdgeDefinition({
        collection: "works_in",
        from: ["person"],
        to: ["city"],
      });
      expect(info).to.have.property("name", graphName);
      expect(info).to.have.property("edgeDefinitions");
      expect(info.edgeDefinitions).to.be.instanceOf(Array);
      expect(info.edgeDefinitions.map((e: any) => e.collection)).to.contain(
        "works_in"
      );
      expect(info.edgeDefinitions.length).to.equal(2);
      const edgeDefinition = info.edgeDefinitions.filter(
        (e: any) => e.collection === "works_in"
      );
      expect(
        [].concat.apply(
          [],
          edgeDefinition.map((e: any) => e.from)
        )
      ).to.contain("person");
      expect(
        [].concat.apply(
          [],
          edgeDefinition.map((e: any) => e.to)
        )
      ).to.contain("city");
    });
  });
  describe("graph.replaceEdgeDefinition", () => {
    it("should replace an existing edgeDefinition in the graph", async () => {
      const info = await graph.replaceEdgeDefinition("knows", {
        collection: "knows",
        from: ["person"],
        to: ["city"],
      });
      expect(info).to.have.property("name", graphName);
      expect(info).to.have.property("edgeDefinitions");
      expect(info.edgeDefinitions).to.be.instanceOf(Array);
      expect(info.edgeDefinitions.map((e: any) => e.collection)).to.contain(
        "knows"
      );
      expect(info.edgeDefinitions.length).to.equal(1);
      const edgeDefinition = info.edgeDefinitions.filter(
        (e: any) => e.collection === "knows"
      );
      expect(
        [].concat.apply(
          [],
          edgeDefinition.map((e: any) => e.from)
        )
      ).to.contain("person");
      expect(
        [].concat.apply(
          [],
          edgeDefinition.map((e: any) => e.to)
        )
      ).to.contain("city");
    });
  });
  describe("graph.removeEdgeDefinition", () => {
    it("should remove an edgeDefinition from the graph", async () => {
      const info = await graph.removeEdgeDefinition("knows");
      expect(info).to.have.property("name", graphName);
      expect(info).to.have.property("edgeDefinitions");
      expect(info.edgeDefinitions).to.be.instanceOf(Array);
      expect(info.edgeDefinitions.length).to.equal(0);
    });
  });
  describe("graph.traversal", () => {
    beforeEach(async () => {
      const knows = graph.edgeCollection("knows");
      const person = graph.vertexCollection("person");
      await Promise.all([
        person.collection.import([
          { _key: "Alice" },
          { _key: "Bob" },
          { _key: "Charlie" },
          { _key: "Dave" },
          { _key: "Eve" },
        ]),
        knows.collection.import([
          { _from: "person/Alice", _to: "person/Bob" },
          { _from: "person/Bob", _to: "person/Charlie" },
          { _from: "person/Bob", _to: "person/Dave" },
          { _from: "person/Eve", _to: "person/Alice" },
          { _from: "person/Eve", _to: "person/Bob" },
        ]),
      ]);
    });
    it("executes traversal", async () => {
      const result = await graph.traversal("person/Alice", {
        direction: "outbound",
      });
      expect(result).to.have.property("visited");
      const visited = result.visited;
      expect(visited).to.have.property("vertices");
      const vertices = visited.vertices;
      expect(vertices).to.be.instanceOf(Array);
      const names = vertices.map((d: any) => d._key);
      for (const name of ["Alice", "Bob", "Charlie", "Dave"]) {
        expect(names).to.contain(name);
      }
      expect(vertices.length).to.equal(4);
      expect(visited).to.have.property("paths");
      const paths = visited.paths;
      expect(paths).to.be.instanceOf(Array);
      expect(paths.length).to.equal(4);
    });
  });
});
