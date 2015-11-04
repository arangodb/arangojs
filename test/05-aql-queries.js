import {describe, it, before, after} from 'mocha';
import {expect} from 'chai';
import {aqlQuery, Database} from '../src';
import Cursor from '../src/cursor';

describe('AQL queries', () => {
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
    .catch(() => null)
    .then(() => done());
  });
  describe('database.query', () => {
    it('returns a cursor for the query result', done => {
      db.query('RETURN 23')
      .then(cursor => {
        expect(cursor).to.be.an.instanceof(Cursor);
        done();
      })
      .catch(done);
    });
    it('supports bindVars', done => {
      db.query('RETURN @x', {x: 5})
      .then(cursor => cursor.next())
      .then(value => {
        expect(value).to.equal(5);
        done();
      })
      .catch(done);
    });
    it('supports options', done => {
      db.query('FOR x IN 1..10 RETURN x', undefined, {batchSize: 2, count: true})
      .then(cursor => {
        expect(cursor.count).to.equal(10);
        expect(cursor._hasMore).to.be.true;
        done();
      })
      .catch(done);
    });
    it('supports AQB queries', done => {
      db.query({toAQL: () => 'RETURN 42'})
      .then(cursor => cursor.next())
      .then(value => {
        expect(value).to.equal(42);
        done();
      })
      .catch(done);
    });
    it('supports query objects', done => {
      db.query({query: 'RETURN 1337'})
      .then(cursor => cursor.next())
      .then(value => {
        expect(value).to.equal(1337);
        done();
      })
      .catch(done);
    });
    it('supports compact queries', done => {
      db.query({query: 'RETURN @potato', bindVars: {potato: 'tomato'}})
      .then(cursor => cursor.next())
      .then(value => {
        expect(value).to.equal('tomato');
        done();
      })
      .catch(done);
    });
    it('supports compact queries with options', done => {
      let aql = {query: 'FOR x IN RANGE(1, @max) RETURN x', bindVars: {max: 10}};
      db.query(aql, {batchSize: 2, count: true})
      .then(cursor => {
        expect(cursor.count).to.equal(10);
        expect(cursor._hasMore).to.equal(true);
        done();
      })
      .catch(done);
    });
  });
  describe('aqlQuery', () => {
    it('correctly handles simple parameters', () => {
      let values = [0, 42, -1, null, undefined, true, false, '', 'string', [1, 2, 3], {a: 'b'}];
      let aql = aqlQuery`
        A ${values[0]} B ${values[1]} C ${values[2]} D ${values[3]} E ${values[4]} F ${values[5]}
        G ${values[6]} H ${values[7]} I ${values[8]} J ${values[9]} K ${values[10]} EOF
      `;
      expect(aql.query).to.equal(`
        A @value0 B @value1 C @value2 D @value3 E @value4 F @value5
        G @value6 H @value7 I @value8 J @value9 K @value10 EOF
      `);
      let bindVarNames = Object.keys(aql.bindVars).sort((a, b) => +a.substr(5) > +b.substr(5) ? 1 : -1);
      expect(bindVarNames).to.eql([
        'value0', 'value1', 'value2', 'value3', 'value4', 'value5',
        'value6', 'value7', 'value8', 'value9', 'value10'
      ]);
      expect(bindVarNames.map(k => aql.bindVars[k])).to.eql(values);
    });
    it('correctly handles arangojs collection parameters', () => {
      let collection = db.collection('potato');
      let aql = aqlQuery`${collection}`;
      expect(aql.query).to.equal('@@value0');
      expect(Object.keys(aql.bindVars)).to.eql(['@value0']);
      expect(aql.bindVars['@value0']).to.equal('potato');
    });
    it('correctly handles ArangoDB collection parameters', () => {
      class ArangoCollection {
        constructor() {
          this.name = 'tomato';
        }
      }
      let collection = new ArangoCollection();
      let aql = aqlQuery`${collection}`;
      expect(aql.query).to.equal('@@value0');
      expect(Object.keys(aql.bindVars)).to.eql(['@value0']);
      expect(aql.bindVars['@value0']).to.equal('tomato');
    });
  });
});
