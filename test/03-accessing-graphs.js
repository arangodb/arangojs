import {describe, it, before, after} from 'mocha'
import {expect} from 'chai'
import {Database} from '../src'
import Graph from '../src/graph'

const range = (n) => Array.from(Array(n).keys())

describe('Accessing graphs', () => {
  let name = `testdb_${Date.now()}`
  let db
  before((done) => {
    db = new Database({
      url: 'http://root:@localhost:8529',
      arangoVersion: Number(process.env.ARANGO_VERSION || 30000)
    })
    db.createDatabase(name)
      .then(() => {
        db.useDatabase(name)
        done()
      })
      .catch(done)
  })
  after((done) => {
    db.useDatabase('_system')
    db.dropDatabase(name)
      .then(() => void done())
      .catch(done)
  })
  describe('database.graph', () => {
    it('returns a Graph instance', () => {
      let name = 'potato'
      let graph = db.graph(name)
      expect(graph).to.be.an.instanceof(Graph)
      expect(graph).to.have.a.property('name').that.equals(name)
    })
  })
  describe('database.listGraphs', () => {
    let vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`)
    let edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`)
    let graphNames = range(4).map((i) => `g_${Date.now()}_${i}`)
    before((done) => {
      Promise.all([
        ...vertexCollectionNames.map((name) => db.collection(name).create()),
        ...edgeCollectionNames.map((name) => db.edgeCollection(name).create())
      ])
        .then(() => Promise.all([
          ...graphNames.map((name) => db.graph(name).create({
            edgeDefinitions: edgeCollectionNames.map((name) => ({
              collection: name,
              from: vertexCollectionNames,
              to: vertexCollectionNames
            }))
          }))
        ]))
        .then(() => void done())
        .catch(done)
    })
    after((done) => {
      Promise.all(graphNames.map((name) => db.graph(name).drop()))
        .then(() => Promise.all(vertexCollectionNames.concat(edgeCollectionNames).map(
          (name) => db.collection(name).drop()
        )))
        .then(() => void done())
        .catch(done)
    })
    it('fetches information about all graphs', (done) => {
      db.listGraphs()
        .then((graphs) => {
          expect(graphs.length).to.equal(graphNames.length)
          expect(graphs.map((g) => g._key)).to.include.all.members(graphNames)
          done()
        })
        .catch(done)
    })
  })
  describe('database.graphs', () => {
    let vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`)
    let edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`)
    let graphNames = range(4).map((i) => `g_${Date.now()}_${i}`)
    before((done) => {
      Promise.all([
        ...vertexCollectionNames.map((name) => db.collection(name).create()),
        ...edgeCollectionNames.map((name) => db.edgeCollection(name).create())
      ])
        .then(() => Promise.all([
          ...graphNames.map((name) => db.graph(name).create({
            edgeDefinitions: edgeCollectionNames.map((name) => ({
              collection: name,
              from: vertexCollectionNames,
              to: vertexCollectionNames
            }))
          }))
        ]))
        .then(() => void done())
        .catch(done)
    })
    after((done) => {
      Promise.all(graphNames.map((name) => db.graph(name).drop()))
        .then(() => Promise.all(vertexCollectionNames.concat(edgeCollectionNames).map(
          (name) => db.collection(name).drop()
        )))
        .then(() => void done())
        .catch(done)
    })
    it('creates Graph instances', (done) => {
      db.graphs()
        .then((graphs) => {
          expect(graphs.length).to.equal(graphNames.length)
          expect(graphs.map((g) => g.name)).to.include.all.members(graphNames)
          graphs.forEach((graph) => expect(graph).to.be.an.instanceof(Graph))
          done()
        })
        .catch(done)
    })
  })
})
