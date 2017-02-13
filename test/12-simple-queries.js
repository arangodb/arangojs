import {describe, it, before, after, beforeEach, afterEach} from 'mocha'
import {expect} from 'chai'
import {Database} from '../src'
import Cursor from '../src/cursor'

const range = (n) => Array.from(Array(n).keys())
const alpha = (i) => String.fromCharCode('a'.charCodeAt(0) + i)
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30000)
const describe2x = ARANGO_VERSION < 30000 ? describe : describe.skip

describe('Simple queries', () => {
  let name = `testdb_${Date.now()}`
  let db
  let collection
  before((done) => {
    db = new Database({
      url: (process.env.TEST_ARANGODB_URL || 'http://root:@localhost:8529'),
      arangoVersion: ARANGO_VERSION
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
  beforeEach((done) => {
    collection = db.collection(`c_${Date.now()}`)
    collection.create()
      .then(() => range(10).reduce((p, v) => p.then(() => collection.save({
        _key: alpha(v),
        value: v + 1,
        group: Math.floor(v / 2) + 1
      })), Promise.resolve()))
      .then(() => void done())
      .catch(done)
  })
  afterEach(function (done) {
    this.timeout(10000)
    collection.drop()
      .then(() => void done())
      .catch(done)
  })
  describe('collection.all', () => {
    it('returns a cursor for all documents in the collection', (done) => {
      collection.all()
        .then((cursor) => {
          expect(cursor).to.be.an.instanceof(Cursor)
          expect(cursor.count).to.equal(10)
          return cursor.all()
        })
        .then((arr) => {
          expect(arr).to.have.length(10)
          arr.forEach((doc) => {
            expect(doc).to.have.keys('_key', '_id', '_rev', 'value', 'group')
            expect(doc._id).to.equal(`${collection.name}/${doc._key}`)
            expect(doc.group).to.equal(Math.floor((doc.value - 1) / 2) + 1)
          })
          expect(arr.map((d) => d.value).sort()).to.eql(range(10).map((i) => i + 1).sort())
          expect(arr.map((d) => d._key).sort()).to.eql(range(10).map(alpha).sort())
          done()
        })
        .catch(done)
    })
  })
  describe('collection.any', () => {
    it('returns a random document from the collection', (done) => {
      collection.any()
        .then((doc) => {
          expect(doc).to.have.keys('_key', '_id', '_rev', 'value', 'group')
          expect(doc._key).to.equal(alpha(doc.value - 1))
          expect(doc._id).to.equal(`${collection.name}/${doc._key}`)
          expect(doc.value).to.be.within(1, 10)
          expect(doc.group).to.equal(Math.floor((doc.value - 1) / 2) + 1)
          done()
        })
        .catch(done)
    })
  })
  describe2x('collection.first', () => {
    it('returns the first document in the collection', (done) => {
      collection.first()
        .then((doc) => {
          expect(doc).to.have.keys('_key', '_id', '_rev', 'value', 'group')
          expect(doc._key).to.equal('a')
          expect(doc._id).to.equal(`${collection.name}/${doc._key}`)
          expect(doc.value).to.equal(1)
          expect(doc.group).to.equal(1)
          done()
        })
        .catch(done)
    })
  })
  describe2x('collection.last', () => {
    it('returns the last document in the collection', (done) => {
      collection.last()
        .then((doc) => {
          expect(doc).to.have.keys('_key', '_id', '_rev', 'value', 'group')
          expect(doc._key).to.equal(alpha(9))
          expect(doc._id).to.equal(`${collection.name}/${doc._key}`)
          expect(doc.value).to.equal(10)
          expect(doc.group).to.equal(5)
          done()
        })
        .catch(done)
    })
  })
  describe('collection.byExample', () => {
    it('returns all documents matching the example', (done) => {
      collection.byExample({group: 2})
        .then((cursor) => {
          expect(cursor).to.be.an.instanceof(Cursor)
          return cursor.all()
        })
        .then((arr) => {
          expect(arr).to.have.length(2)
          arr.forEach((doc) => {
            expect(doc).to.have.keys('_key', '_id', '_rev', 'value', 'group')
            expect(doc._id).to.equal(`${collection.name}/${doc._key}`)
            expect(doc.group).to.equal(2)
          })
          expect(arr.map((d) => d._key).sort()).to.eql(['c', 'd'])
          expect(arr.map((d) => d.value).sort()).to.eql([3, 4])
          done()
        })
        .catch(done)
    })
  })
  describe('collection.firstExample', () => {
    it('returns the first document matching the example', (done) => {
      collection.firstExample({group: 2})
        .then((doc) => {
          expect(doc).to.have.keys('_key', '_id', '_rev', 'value', 'group')
          expect(doc._key).to.equal('c')
          expect(doc._id).to.equal(`${collection.name}/${doc._key}`)
          expect(doc.value).to.equal(3)
          expect(doc.group).to.equal(2)
          done()
        })
        .catch(done)
    })
  })
  describe('collection.removeByExample', () => {
    it('is missing tests')
  })
  describe('collection.replaceByExample', () => {
    it('is missing tests')
  })
  describe('collection.updateByExample', () => {
    it('is missing tests')
  })
  if (ARANGO_VERSION >= 20600) {
    describe2x('collection.lookupByKeys', () => {
      it('returns the documents with the given keys', (done) => {
        collection.lookupByKeys(['b', 'c', 'd'])
          .then((arr) => {
            expect(arr).to.have.length(3)
            arr.forEach((doc) => {
              expect(doc).to.have.keys('_key', '_id', '_rev', 'value', 'group')
              expect(doc._id).to.equal(`${collection.name}/${doc._key}`)
              expect(doc.group).to.equal(Math.floor((doc.value - 1) / 2) + 1)
            })
            expect(arr.map((d) => d._key)).to.eql(['b', 'c', 'd'])
            done()
          })
          .catch(done)
      })
    })
  }
  describe('collection.removeByKeys', () => {
    it('is missing tests')
  })
})
