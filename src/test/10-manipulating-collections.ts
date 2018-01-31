import {Database} from '../arangojs';
import {expect} from 'chai';

const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30000);

describe('Manipulating collections', () => {
  let name = `testdb_${Date.now()}`;
  let db: Database;
  before(done => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || 'http://localhost:8529',
      arangoVersion: ARANGO_VERSION
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
    db.useDatabase('_system');
    db
      .dropDatabase(name)
      .then(() => void done())
      .catch(done);
  });
  describe('collection.create', () => {
    it('create a new document collection', done => {
      const collection = db.collection(`c_${Date.now()}`);
      collection
        .create()
        .then(() => {
          db.collection(collection.name).get().then(bla => {
            expect(bla).to.have.property("name")
          })
        })
        .then(() => void done())
        .catch(done);
    });
  });
  describe('collection.load', () => {
    it('is missing tests');
  });
  describe('collection.unload', () => {
    it('is missing tests');
  });
  describe('collection.setProperties', () => {
    it('is missing tests');
  });
  describe('collection.rename', () => {
    it('is missing tests');
  });
  describe('collection.rotate', () => {
    it('is missing tests');
  });
  describe('collection.truncate', () => {
    it('is missing tests');
  });
  describe('collection.drop', () => {
    it('is missing tests');
  });
});
