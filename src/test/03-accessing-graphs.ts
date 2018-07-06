import { expect } from "chai";
import { Database } from "../arangojs";
import { Graph } from "../graph";

const range = (n: number): number[] => Array.from(Array(n).keys());

describe("Accessing graphs", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  let name = `testdb_${Date.now()}`;
  let db: Database;
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
  describe("database.graph", () => {
    it("returns a Graph instance", () => {
      let name = "potato";
      let graph = db.graph(name);
      expect(graph).to.be.an.instanceof(Graph);
      expect(graph)
        .to.have.property("name")
        .that.equals(name);
    });
  });
  describe("database.listGraphs", () => {
    let vertexCollectionNames = range(2).map(i => `vc_${Date.now()}_${i}`);
    let edgeCollectionNames = range(2).map(i => `ec_${Date.now()}_${i}`);
    let graphNames = range(4).map(i => `g_${Date.now()}_${i}`);
    before(done => {
      Promise.all([
        ...vertexCollectionNames.map(name => db.collection(name).create()),
        ...edgeCollectionNames.map(name => db.edgeCollection(name).create())
      ])
        .then(() =>
          Promise.all([
            ...graphNames.map(name =>
              db.graph(name).create({
                edgeDefinitions: edgeCollectionNames.map(name => ({
                  collection: name,
                  from: vertexCollectionNames,
                  to: vertexCollectionNames
                }))
              })
            )
          ])
        )
        .then(() => void done())
        .catch(done);
    });
    after(done => {
      Promise.all(graphNames.map(name => db.graph(name).drop()))
        .then(() =>
          Promise.all(
            vertexCollectionNames
              .concat(edgeCollectionNames)
              .map(name => db.collection(name).drop())
          )
        )
        .then(() => void done())
        .catch(done);
    });
    it("fetches information about all graphs", done => {
      db.listGraphs()
        .then(graphs => {
          expect(graphs.length).to.equal(graphNames.length);
          expect(graphs.map((g: any) => g._key).sort()).to.eql(graphNames);
          done();
        })
        .catch(done);
    });
  });
  describe("database.graphs", () => {
    let vertexCollectionNames = range(2).map(i => `vc_${Date.now()}_${i}`);
    let edgeCollectionNames = range(2).map(i => `ec_${Date.now()}_${i}`);
    let graphNames = range(4).map(i => `g_${Date.now()}_${i}`);
    before(done => {
      Promise.all([
        ...vertexCollectionNames.map(name => db.collection(name).create()),
        ...edgeCollectionNames.map(name => db.edgeCollection(name).create())
      ])
        .then(() =>
          Promise.all([
            ...graphNames.map(name =>
              db.graph(name).create({
                edgeDefinitions: edgeCollectionNames.map(name => ({
                  collection: name,
                  from: vertexCollectionNames,
                  to: vertexCollectionNames
                }))
              })
            )
          ])
        )
        .then(() => void done())
        .catch(done);
    });
    after(done => {
      Promise.all(graphNames.map(name => db.graph(name).drop()))
        .then(() =>
          Promise.all(
            vertexCollectionNames
              .concat(edgeCollectionNames)
              .map(name => db.collection(name).drop())
          )
        )
        .then(() => void done())
        .catch(done);
    });
    it("creates Graph instances", done => {
      db.graphs()
        .then(graphs => {
          expect(graphs.length).to.equal(graphNames.length);
          expect(graphs.map((g: any) => g.name).sort()).to.eql(graphNames);
          graphs.forEach((graph: any) =>
            expect(graph).to.be.an.instanceof(Graph)
          );
          done();
        })
        .catch(done);
    });
  });
});
