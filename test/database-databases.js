/*jshint node: true */
/*globals describe, it, beforeEach */
'use strict';
var expect = require('expect.js');
var Database = require('../');
var db = new Database();

var testDbName = 'test__database_0';

describe('database', function () {
  describe('createDatabase', function () {
    beforeEach(function (done) {
      db.dropDatabase(testDbName, function () {
        done();
      });
    });
    it('returns a new database object with the given name', function (done) {
      db.createDatabase(testDbName, function (err, database) {
        expect(err).to.eql(null);
        expect(database).to.be.a(Database);
        expect(database.name).to.equal(testDbName);
        done();
      });
    });
    it('creates a new database with the given name', function (done) {
      db.createDatabase(testDbName, function (err) {
        expect(err).to.eql(null);
        db.database(testDbName, false, function (err2, database) {
          expect(err2).to.eql(null);
          expect(database.name).to.equal(testDbName);
          done();
        });
      });
    });
  });
  describe('database', function () {
    it('is missing tests');
  });
  describe('databases', function () {
    it('is missing tests');
  });
  describe('dropDatabase', function () {
    it('is missing tests');
  });
});