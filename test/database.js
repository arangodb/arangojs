'use strict';
var expect = require('expect.js');
var Database = require('../');
var Connection = require('../lib/connection');

describe('Database', function () {
  it('is a constructor', function () {
    expect(Database).to.be.a('function');
    expect(new Database()).to.be.a(Database);
  });
  it('can be called without "new"', function () {
    var createDatabase = Database;
    expect(createDatabase()).to.be.a(Database);
  });
  it('creates a connection using the configuration', function () {
    var db = new Database({lol: 'wat'});
    expect(db._connection).to.be.a(Connection);
    expect(db._connection.config).to.have.property('lol', 'wat');
  });
  it('sets its name based on the connection object', function () {
    expect(new Database().name).to.equal('_system');
    var name = 'lolwut';
    expect(new Database({databaseName: name}).name).to.equal(name);
  });
});
