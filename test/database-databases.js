/*jshint node: true */
/*globals describe, it, beforeEach */
'use strict';
var expect = require('expect.js');
var Database = require('../');
var ArangoError = require('../lib/error');
var db = new Database();

var testDbName = 'test__database_0';

describe('database', function () {
  beforeEach(function (done) {
    db.dropDatabase(testDbName, function () {
      done();
    });
  });
  describe('createDatabase', function () {
    it('returns a new database object with the given name', function (done) {
      db.createDatabase(testDbName, function (err, database) {
        expect(err).not.to.be.ok();
        expect(database).to.be.a(Database);
        expect(database.name).to.equal(testDbName);
        done();
      });
    });
    it('creates a new database with the given name', function (done) {
      db.createDatabase(testDbName, function (err) {
        expect(err).not.to.be.ok();
        db.database(testDbName, false, function (err2, database) {
          expect(err2).not.to.be.ok();
          expect(database.name).to.equal(testDbName);
          done();
        });
      });
    });
    it('returns an ArangoError if the db already exists', function (done) {
      db.createDatabase(testDbName, function (err) {
        expect(err).not.to.be.ok();
        db.createDatabase(testDbName, function (err2, database) {
          expect(err2).to.be.an(ArangoError);
          expect(database).not.to.be.ok();
          done();
        });
      });
    });
  });
  describe('database', function () {
    describe('with autoCreate:false', function () {
      it('returns the database if it exists', function (done) {
        db.createDatabase(testDbName, function (err) {
          expect(err).not.to.be.ok();
          db.database(testDbName, false, function (err2, database) {
            expect(err2).not.to.be.ok();
            expect(database.name).to.equal(testDbName);
            done();
          });
        });
      });
      it('returns an ArangoError if the db does not exist', function (done) {
        db.database('this_db_does_not_exist', false, function (err, database) {
          expect(err).to.be.an(ArangoError);
          expect(database).not.to.be.ok();
          done();
        });
      });
    });
    describe('with autoCreate:true', function () {
      it('returns the database if it exists', function (done) {
        db.createDatabase(testDbName, function (err) {
          expect(err).not.to.be.ok();
          db.database(testDbName, false, function (err2, database) {
            expect(err2).not.to.be.ok();
            expect(database.name).to.equal(testDbName);
            done();
          });
        });
      });
      it('creates the database if it does not exist', function (done) {
        db.database(testDbName, true, function (err, database) {
          expect(err).not.to.be.ok();
          expect(database.name).to.equal(testDbName);
          done();
        });
      });
    });
  });
  describe('databases', function () {
    it('returns all the databases', function (done) {
      db.databases(function (err, dbs) {
        expect(err).not.to.be.ok();
        expect(dbs).to.be.an(Array);
        expect(dbs).to.have.property('length', 1);
        expect(dbs[0]).to.be.a(Database);
        expect(dbs[0].name).to.equal('_system');
        db.createDatabase(testDbName, function (err2) {
          expect(err2).not.to.be.ok();
          db.databases(function (err3, dbs2) {
            expect(err3).not.to.be.ok();
            var dbNames = dbs2.map(function (db) {
              return db.name;
            });
            expect(dbNames.sort()).to.eql(['_system', testDbName]);
            done();
          });
        });
      });
    });
  });
  describe('dropDatabase', function () {
    it('drops the database if it exists', function (done) {
      db.createDatabase(testDbName, function (err) {
        expect(err).not.to.be.ok();
        db.dropDatabase(testDbName, function (err1) {
          expect(err1).not.to.be.ok();
          db.database(testDbName, false, function (err2, database) {
            expect(err2).to.be.an(ArangoError);
            expect(database).not.to.be.ok();
            done();
          });
        });
      });
    });
    it('returns an ArangoError if the db does not exist', function (done) {
      db.dropDatabase('this_db_does_not_exist', function (err) {
        expect(err).to.be.an(ArangoError);
        done();
      });
    });
  });
});