import 'core-js/shim';
import {describe, it, beforeEach, afterEach} from 'mocha';
import {expect} from 'chai';
import {Database} from '../src';
import ArangoError from '../src/error';

describe('database', () => {
  let db;
  beforeEach(() => {
    db = new Database();
  });
  describe('useDatabase', () => {
    it('updates the database name', () => {
      const name = 'example';
      expect(db.name).to.equal('_system'); // default
      db.useDatabase(name);
      expect(db._connection.config).to.have.a.property('databaseName', name);
      expect(db.name).to.equal(name);
    });
    it('returns itself', () => {
      const db2 = db.useDatabase('nope');
      expect(db).to.equal(db2);
    });
  });
  describe('get', () => {
    it('fetches the database description if the database exists', done => {
      db.get()
      .then(info => {
        expect(info.name).to.equal(db.name);
        expect(db.name).to.equal('_system');
        done();
      })
      .catch(done);
    });
    it('fails if the database does not exist', done => {
      db.useDatabase('__does_not_exist__');
      db.get()
      .then(
        () => Promise.reject(new Error('Should not succeed')),
        err => {
          expect(err).to.be.an.instanceof(ArangoError);
          done();
        }
      )
      .catch(done);
    });
  });
  describe('listDatabases', () => {
    it('returns a list of all databases', done => {
      db.listDatabases()
      .then(databases => {
        expect(databases).to.be.an.instanceof(Array);
        expect(databases.indexOf('_system')).to.be.greaterThan(-1);
        done();
      })
      .catch(done);
    });
  });
  describe('createDatabase', () => {
    let name = 'testdb_' + Date.now();
    afterEach(done => {
      db.useDatabase('_system');
      db.dropDatabase(name)
      .catch(() => null)
      .then(() => done());
    });
    it('creates a database with the given name', done => {
      db.createDatabase(name)
      .then(() => {
        db.useDatabase(name);
        return db.get();
      })
      .then(info => {
        expect(info.name).to.equal(name);
        done();
      })
      .catch(done);
    });
    it('adds the given users to the database');
  });
  describe('listUserDatabases', () => {
    it('returns a list of databases accessible to the active user');
  });
  describe('truncate', () => {
    let name = 'testdb_' + Date.now();
    let collections = Array.from(Array(8).keys()).map(i => `c_${Date.now()}_${i}`);
    beforeEach(done => {
      db.createDatabase(name)
      .then(() => {
        db.useDatabase(name);
        return Promise.all(collections.map(
          name => db.collection(name).create()
        ));
      })
      .then(() => {
        return Promise.all(collections.map(
          name => db.collection(name).save({_key: 'example'})
        ));
      })
      .then(() => done())
      .catch(done);
    });
    afterEach(done => {
      db.useDatabase('_system');
      db.dropDatabase(name)
      .catch(() => null)
      .then(() => done());
    });
    it('removes all documents from all non-system collections in the database', done => {
      db.truncate()
      .then(() => {
        return Promise.all(collections.map(
          name => db.collection(name).document('example')
          .then(
            doc => Promise.reject(new Error(`Expected document to be destroyed: ${doc._id}`)),
            err => expect(err).to.be.an.instanceof(ArangoError)
          )
        ));
      })
      .then(() => done())
      .catch(done);
    });
    it('additionally truncates system collections if explicitly passed false');
  });
});
