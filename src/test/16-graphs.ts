import { expect } from "chai";
import { Database } from "../arangojs";
import { Graph } from "../graph";

const range = (n: number): number[] => Array.from(Array(n).keys());

function createCollections(db: Database) {
  let vertexCollectionNames = range(2).map(i => `vc_${Date.now()}_${i}`);
  let edgeCollectionNames = range(2).map(i => `ec_${Date.now()}_${i}`);
  return Promise.all([
    ...vertexCollectionNames.map(name => db.collection(name).create()),
    ...edgeCollectionNames.map(name => db.edgeCollection(name).create())
  ]).then(() => [vertexCollectionNames, edgeCollectionNames]);
}

function createGraph(
  graph: Graph,
  vertexCollectionNames: string[],
  edgeCollectionNames: string[]
) {
  return graph.create({
    edgeDefinitions: edgeCollectionNames.map(name => ({
      collection: name,
      from: vertexCollectionNames,
      to: vertexCollectionNames
    }))
  });
}

describe("Graph API", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let db: Database;
  let name = `testdb_${Date.now()}`;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
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
  describe("graph.get", () => {
    let graph: Graph;
    let collectionNames: string[];
    before(done => {
      graph = db.graph(`g_${Date.now()}`);
      createCollections(db)
        .then(names => {
          collectionNames = names.reduce((a, b) => a.concat(b));
          return createGraph(graph, names[0], names[1]);
        })
        .then(() => void done())
        .catch(done);
    });
    after(done => {
      graph
        .drop()
        .then(() =>
          Promise.all(collectionNames.map(name => db.collection(name).drop()))
        )
        .then(() => void done())
        .catch(done);
    });
    it("fetches information about the graph", done => {
      graph
        .get()
        .then(data => {
          expect(data).to.have.property("name", graph.name);
          done();
        })
        .catch(done);
    });
  });
  describe("graph.create", () => {
    let edgeCollectionNames: string[];
    let vertexCollectionNames: string[];
    before(done => {
      createCollections(db)
        .then(names => {
          [vertexCollectionNames, edgeCollectionNames] = names;
          done();
        })
        .catch(done);
    });
    after(done => {
      Promise.all(
        [...edgeCollectionNames, ...vertexCollectionNames].map(name =>
          db.collection(name).drop()
        )
      )
        .then(() => void done())
        .catch(done);
    });
    it("creates the graph", done => {
      let graph = db.graph(`g_${Date.now()}`);
      graph
        .create({
          edgeDefinitions: edgeCollectionNames.map(name => ({
            collection: name,
            from: vertexCollectionNames,
            to: vertexCollectionNames
          }))
        })
        .then(() => graph.get())
        .then(data => {
          expect(data).to.have.property("name", graph.name);
          done();
        })
        .catch(done);
    });
  });
  describe("graph.drop", () => {
    let graph: Graph;
    let edgeCollectionNames: string[];
    let vertexCollectionNames: string[];
    beforeEach(done => {
      graph = db.graph(`g_${Date.now()}`);
      createCollections(db)
        .then(names => {
          [vertexCollectionNames, edgeCollectionNames] = names;
          return createGraph(graph, names[0], names[1]);
        })
        .then(() => void done())
        .catch(done);
    });
    afterEach(done => {
      Promise.all(
        [...edgeCollectionNames, ...vertexCollectionNames].map(name =>
          db
            .collection(name)
            .drop()
            .catch(() => null)
        )
      )
        .then(() => void done())
        .catch(done);
    });
    it("destroys the graph if not passed true", done => {
      graph
        .drop()
        .then(() =>
          graph
            .get()
            .then(
              () => Promise.reject(new Error("Should not succeed")),
              () => undefined
            )
        )
        .then(() => db.listCollections())
        .then(collections => {
          expect(collections.map((c: any) => c.name)).to.include.members([
            ...edgeCollectionNames,
            ...vertexCollectionNames
          ]);
          done();
        })
        .catch(done);
    });
    it("additionally drops all of its collections if passed true", done => {
      graph
        .drop(true)
        .then(() =>
          graph
            .get()
            .then(
              () => Promise.reject(new Error("Should not succeed")),
              () => undefined
            )
        )
        .then(() => db.listCollections())
        .then(collections => {
          expect(collections.map((c: any) => c.name)).not.to.include.members([
            ...edgeCollectionNames,
            ...vertexCollectionNames
          ]);
          done();
        })
        .catch(done);
    });
  });
});
