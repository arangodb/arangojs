import {describe, it, before, after} from 'mocha';
import {expect} from 'chai';
import {Database} from '../src';
import {DocumentCollection, EdgeCollection} from '../src/collection';

const range = n => Array.from(Array(n).keys());

describe('Accessing collections', () => {
  let name = `testdb_${Date.now()}`;
  let db;
  before(done => {
    db = new Database();
    db.createDatabase(name)
    .then(() => {
      db.useDatabase(name);
      done();
    })
    .catch(done);
  });
  after(done => {
    db.useDatabase('_system');
    db.dropDatabase(name)
    .then(() => void done())
    .catch(done);
  });
  describe('database.collection', () => {
    it('returns a DocumentCollection instance for the collection', () => {
      let name = 'potato';
      let collection = db.collection(name);
      expect(collection).to.be.an.instanceof(DocumentCollection);
      expect(collection).to.have.a.property('name').that.equals(name);
    });
  });
  describe('database.edgeCollection', () => {
    it('returns an EdgeCollection instance for the collection', () => {
      let name = 'tomato';
      let collection = db.edgeCollection(name);
      expect(collection).to.be.an.instanceof(EdgeCollection);
      expect(collection).to.have.a.property('name').that.equals(name);
    });
  });
  describe('database.listCollections', () => {
    let nonSystemCollectionNames = range(4).map(i => `c_${Date.now()}_${i}`);
    let systemCollectionNames = range(4).map(i => `_c_${Date.now()}_${i}`);
    before(done => {
      Promise.all([
        ...nonSystemCollectionNames.map(name => db.collection(name).create()),
        ...systemCollectionNames.map(name => db.collection(name).create({isSystem: true}))
      ])
      .then(() => void done())
      .catch(done);
    });
    after(done => {
      Promise.all(nonSystemCollectionNames.concat(systemCollectionNames).map(
        name => db.collection(name).drop()
      ))
      .then(() => void done())
      .catch(done);
    });
    it('fetches information about all non-system collections', done => {
      db.listCollections()
      .then(collections => {
        expect(collections.length).to.equal(nonSystemCollectionNames.length);
        expect(collections.map(c => c.name)).to.include.all.members(nonSystemCollectionNames);
        done();
      })
      .catch(done);
    });
    it('includes system collections if explicitly passed false', done => {
      db.listCollections(false)
      .then(collections => {
        let allCollectionNames = nonSystemCollectionNames.concat(systemCollectionNames);
        expect(collections.length).to.be.at.least(allCollectionNames.length);
        expect(collections.map(c => c.name)).to.include.all.members(allCollectionNames);
        done();
      })
      .catch(done);
    });
  });
  describe('database.collections', () => {
    let documentCollectionNames = range(4).map(i => `dc_${Date.now()}_${i}`);
    let edgeCollectionNames = range(4).map(i => `ec_${Date.now()}_${i}`);
    let systemCollectionNames = range(4).map(i => `_c_${Date.now()}_${i}`);
    before(done => {
      Promise.all([
        ...documentCollectionNames.map(name => db.collection(name).create()),
        ...edgeCollectionNames.map(name => db.edgeCollection(name).create()),
        ...systemCollectionNames.map(name => db.collection(name).create({isSystem: true}))
      ])
      .then(() => void done())
      .catch(done);
    });
    after(done => {
      Promise.all([
        ...documentCollectionNames.map(name => db.collection(name).drop()),
        ...edgeCollectionNames.map(name => db.edgeCollection(name).drop()),
        ...systemCollectionNames.map(name => db.collection(name).drop())
      ])
      .then(() => void done())
      .catch(done);
    });
    it('creates DocumentCollection and EdgeCollection instances', done => {
      db.collections()
      .then(collections => {
        let documentCollections = collections.filter(c => c instanceof DocumentCollection);
        let edgeCollections = collections.filter(c => c instanceof EdgeCollection);
        expect(documentCollections.length).to.equal(documentCollectionNames.length);
        expect(documentCollections.map(c => c.name)).to.include.all.members(documentCollectionNames);
        expect(edgeCollections.length).to.equal(edgeCollectionNames.length);
        expect(edgeCollections.map(c => c.name)).to.include.all.members(edgeCollectionNames);
        done();
      })
      .catch(done);
    });
    it('includes system collections if explicitly passed false', done => {
      db.collections(false)
      .then(collections => {
        let documentCollections = collections.filter(c => c instanceof DocumentCollection);
        let edgeCollections = collections.filter(c => c instanceof EdgeCollection);
        let allDocumentCollectionNames = documentCollectionNames.concat(systemCollectionNames);
        expect(documentCollections.length).to.be.at.least(allDocumentCollectionNames.length);
        expect(documentCollections.map(c => c.name)).to.include.all.members(allDocumentCollectionNames);
        expect(edgeCollections.length).to.be.at.least(edgeCollectionNames.length);
        expect(edgeCollections.map(c => c.name)).to.include.all.members(edgeCollectionNames);
        done();
      })
      .catch(done);
    });
  });
});
