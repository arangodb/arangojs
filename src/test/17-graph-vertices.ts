import { Graph, GraphVertexCollection } from "../graph";

import { ArangoError } from "../error";
import { BaseCollection } from "../collection";
import { Database } from "../arangojs";
import { expect } from "chai";

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

describe("Manipulating graph vertices", () => {
  let db: Database;
  let name = `testdb_${Date.now()}`;
  let graph: Graph;
  let collectionNames: string[];
  before(done => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30000)
    });
    db
      .createDatabase(name)
      .then(() => {
        db.useDatabase(name);
        done();
      })
      .catch(done);
  });
  after(done => {
    db.useDatabase("_system");
    db
      .dropDatabase(name)
      .then(() => void done())
      .catch(done);
  });
  beforeEach(done => {
    graph = db.graph(`g_${Date.now()}`);
    createCollections(db)
      .then(names => {
        collectionNames = names.reduce((a, b) => a.concat(b));
        return createGraph(graph, names[0], names[1]);
      })
      .then(() => void done())
      .catch(done);
  });
  afterEach(done => {
    graph
      .drop()
      .then(() =>
        Promise.all(collectionNames.map(name => db.collection(name).drop()))
      )
      .then(() => void done())
      .catch(done);
  });
  describe("graph.vertexCollection", () => {
    it("returns a GraphVertexCollection instance for the collection", () => {
      let name = "potato";
      let collection = graph.vertexCollection(name);
      expect(collection).to.be.an.instanceof(GraphVertexCollection);
      expect(collection)
        .to.have.property("name")
        .that.equals(name);
    });
  });
  describe("graph.addVertexCollection", () => {
    let vertexCollection: BaseCollection;
    beforeEach(done => {
      vertexCollection = db.collection(`xc_${Date.now()}`);
      vertexCollection
        .create()
        .then(() => void done())
        .catch(done);
    });
    afterEach(done => {
      vertexCollection
        .drop()
        .then(() => void done())
        .catch(done);
    });
    it("adds the given vertex collection to the graph", done => {
      graph
        .addVertexCollection(vertexCollection.name)
        .then(data => {
          expect(data.orphanCollections).to.contain(vertexCollection.name);
          done();
        })
        .catch(done);
    });
  });
  describe("graph.removeVertexCollection", () => {
    let vertexCollection: BaseCollection;
    beforeEach(done => {
      vertexCollection = db.collection(`xc_${Date.now()}`);
      vertexCollection
        .create()
        .then(() => graph.addVertexCollection(vertexCollection.name))
        .then(() => void done())
        .catch(done);
    });
    it("removes the given vertex collection from the graph", done => {
      graph
        .removeVertexCollection(vertexCollection.name)
        .then(data => {
          expect(data.orphanCollections).not.to.contain(vertexCollection.name);
          return vertexCollection.get();
        })
        .then(() => done())
        .catch(done);
    });
    it("destroys the collection if explicitly passed true", done => {
      graph
        .removeVertexCollection(vertexCollection.name, true)
        .then(data => {
          expect(data.orphanCollections).not.to.contain(vertexCollection.name);
          return vertexCollection.get();
        })
        .then(
          () => Promise.reject(new Error("Should not succeed")),
          err => {
            expect(err).to.be.an.instanceof(ArangoError);
            done();
          }
        )
        .catch(done);
    });
  });
});
