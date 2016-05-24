import {describe, it, before, after, beforeEach, afterEach} from 'mocha'
import {expect} from 'chai'
import {Database} from '../src'

const range = (n) => Array.from(Array(n).keys())

function createCollections (db) {
  let vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`)
  let edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`)
  return Promise.all([
    ...vertexCollectionNames.map((name) => db.collection(name).create()),
    ...edgeCollectionNames.map((name) => db.edgeCollection(name).create())
  ])
    .then(() => [
      vertexCollectionNames,
      edgeCollectionNames
    ])
}

function createGraph (graph, vertexCollectionNames, edgeCollectionNames) {
  return graph.create({
    edgeDefinitions: edgeCollectionNames.map((name) => ({
      collection: name,
      from: vertexCollectionNames,
      to: vertexCollectionNames
    }))
  })
}

describe('Graph API', () => {
  let db
  let name = `testdb_${Date.now()}`
  before((done) => {
    db = new Database()
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
  describe('graph.get', () => {
    let graph
    let collectionNames
    before((done) => {
      graph = db.graph(`g_${Date.now()}`)
      createCollections(db)
        .then((names) => {
          collectionNames = names.reduce((a, b) => a.concat(b))
          return createGraph(graph, ...names)
        })
        .then(() => void done())
        .catch(done)
    })
    after((done) => {
      graph.drop()
        .then(() => Promise.all(
          collectionNames.map((name) => db.collection(name).drop())
        ))
        .then(() => void done())
        .catch(done)
    })
    it('fetches information about the graph', (done) => {
      graph.get()
        .then((data) => {
          expect(data).to.have.a.property('name', graph.name)
          done()
        })
        .catch(done)
    })
  })
  describe('graph.create', () => {
    let edgeCollectionNames
    let vertexCollectionNames
    before((done) => {
      createCollections(db)
        .then((names) => {
          [vertexCollectionNames, edgeCollectionNames] = names
          done()
        })
        .catch(done)
    })
    after((done) => {
      Promise.all(
        [...edgeCollectionNames, ...vertexCollectionNames]
          .map((name) => db.collection(name).drop())
      )
        .then(() => void done())
        .catch(done)
    })
    it('creates the graph', (done) => {
      let graph = db.graph(`g_${Date.now()}`)
      graph.create({
        edgeDefinitions: edgeCollectionNames.map((name) => ({
          collection: name,
          from: vertexCollectionNames,
          to: vertexCollectionNames
        }))
      })
        .then(() => graph.get())
        .then((data) => {
          expect(data).to.have.a.property('name', graph.name)
          done()
        })
        .catch(done)
    })
  })
  describe('graph.drop', () => {
    let graph
    let edgeCollectionNames
    let vertexCollectionNames
    beforeEach((done) => {
      graph = db.graph(`g_${Date.now()}`)
      createCollections(db)
        .then((names) => {
          [vertexCollectionNames, edgeCollectionNames] = names
          return createGraph(graph, ...names)
        })
        .then(() => void done())
        .catch(done)
    })
    afterEach((done) => {
      Promise.all(
        [...edgeCollectionNames, ...vertexCollectionNames]
          .map((name) => db.collection(name).drop().catch(() => null))
      )
        .then(() => void done())
        .catch(done)
    })
    it('destroys the graph if not passed true', (done) => {
      graph.drop()
        .then(() => graph.get()
          .then(
            () => Promise.reject(new Error('Should not succeed')),
            () => undefined
        )
      )
        .then(() => db.listCollections())
        .then((collections) => {
          expect(collections.map((c) => c.name)).to.include.members([
            ...edgeCollectionNames,
            ...vertexCollectionNames
          ])
          done()
        })
        .catch(done)
    })
    it('additionally drops all of its collections if passed true', (done) => {
      graph.drop(true)
        .then(() => graph.get()
          .then(
            () => Promise.reject(new Error('Should not succeed')),
            () => undefined
        )
      )
        .then(() => db.listCollections())
        .then((collections) => {
          expect(collections.map((c) => c.name)).not.to.include.members([
            ...edgeCollectionNames,
            ...vertexCollectionNames
          ])
          done()
        })
        .catch(done)
    })
  })
})
