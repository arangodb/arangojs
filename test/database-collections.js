/*jshint node: true */
/*globals describe, it, before, after, beforeEach */
'use strict';
var expect = require('expect.js');
var ArangoError = require('../lib/error');
var Collection = require('../lib/collection')._BaseCollection;
var EdgeCollection = require('../lib/collection').EdgeCollection;
var Database = require('../');
var db = new Database();
var testCollectionName = 'test__collection_1';
var testDbName = 'test__database_1';

describe('database', function () {
  var _db;
  before(function (done) {
    db.database(testDbName, true, function (err, database) {
      _db = db;
      db = database;
      done(err);
    });
  });
  after(function (done) {
    _db.dropDatabase(testDbName, function (err) {
      db = _db;
      done(err);
    });
  });
  beforeEach(function (done) {
    db.dropCollection(testCollectionName, function () {
      done();
    });
  });
  describe('createCollection', function () {
    it('returns a new collection object with the given name', function (done) {
      db.createCollection(testCollectionName, function (err, collection) {
        expect(err).not.to.be.ok();
        expect(collection).to.be.a(Collection);
        expect(collection.name).to.equal(testCollectionName);
        done();
      });
    });
    it('creates a new collection with the given name', function (done) {
      db.createCollection(testCollectionName, function (err) {
        expect(err).not.to.be.ok();
        db.collection(testCollectionName, false, function (err2, collection) {
          expect(err2).not.to.be.ok();
          expect(collection.name).to.equal(testCollectionName);
          done();
        });
      });
    });
    it('returns an ArangoError if the db already exists', function (done) {
      db.createCollection(testCollectionName, function (err) {
        expect(err).not.to.be.ok();
        db.createCollection(testCollectionName, function (err2, collection) {
          expect(err2).to.be.an(ArangoError);
          expect(collection).not.to.be.ok();
          done();
        });
      });
    });
  });
  describe('createEdgeCollection', function () {
    it('returns a new edge collection object with the given name', function (done) {
      db.createEdgeCollection(testCollectionName, function (err, collection) {
        expect(err).not.to.be.ok();
        expect(collection).to.be.an(EdgeCollection);
        expect(collection.name).to.equal(testCollectionName);
        done();
      });
    });
    it('creates a new collection with the given name', function (done) {
      db.createEdgeCollection(testCollectionName, function (err) {
        expect(err).not.to.be.ok();
        db.collection(testCollectionName, false, function (err2, collection) {
          expect(err2).not.to.be.ok();
          expect(collection.name).to.equal(testCollectionName);
          done();
        });
      });
    });
    it('returns an ArangoError if the db already exists', function (done) {
      db.createEdgeCollection(testCollectionName, function (err) {
        expect(err).not.to.be.ok();
        db.createEdgeCollection(testCollectionName, function (err2, collection) {
          expect(err2).to.be.an(ArangoError);
          expect(collection).not.to.be.ok();
          done();
        });
      });
    });
  });
  describe('collection', function () {
    describe('with autoCreate:false', function () {
      it('returns the collection if it exists', function (done) {
        db.createCollection(testCollectionName, function (err) {
          expect(err).not.to.be.ok();
          db.collection(testCollectionName, false, function (err2, collection) {
            expect(err2).not.to.be.ok();
            expect(collection.name).to.equal(testCollectionName);
            done();
          });
        });
      });
      it('returns an ArangoError if the collection does not exist', function (done) {
        db.collection('this_does_not_exist', false, function (err, collection) {
          expect(err).to.be.an(ArangoError);
          expect(collection).not.to.be.ok();
          done();
        });
      });
    });
    describe('with autoCreate:true', function () {
      it('returns the collection if it exists', function (done) {
        db.createCollection(testCollectionName, function (err) {
          expect(err).not.to.be.ok();
          db.collection(testCollectionName, false, function (err2, collection) {
            expect(err2).not.to.be.ok();
            expect(collection.name).to.equal(testCollectionName);
            done();
          });
        });
      });
      it('creates the collection if it does not exist', function (done) {
        db.collection(testCollectionName, true, function (err, collection) {
          expect(err).not.to.be.ok();
          expect(collection.name).to.equal(testCollectionName);
          done();
        });
      });
    });
  });
  describe('collections', function () {
    it('returns all the non-system collections', function (done) {
      db.collections(function (err, collections) {
        expect(err).not.to.be.ok();
        expect(collections).to.be.an(Array);
        expect(collections).to.be.empty();
        db.createCollection(testCollectionName, function (err2) {
          expect(err2).not.to.be.ok();
          db.collections(function (err3, collections2) {
            expect(err3).not.to.be.ok();
            var collectionNames = collections2.map(function (collection) {
              return collection.name;
            });
            expect(collectionNames).to.eql([testCollectionName]);
            done();
          });
        });
      });
    });
  });
  describe('allCollections', function () {
    it('returns all the collections', function (done) {
      db.allCollections(function (err, collections) {
        expect(err).not.to.be.ok();
        expect(collections).to.be.an(Array);
        expect(collections).not.to.be.empty();
        collections.forEach(function (collection) {
          expect(collection).to.be.a(Collection);
          expect(collection.name.charAt(0)).to.be('_');
        });
        db.createCollection(testCollectionName, function (err2) {
          expect(err2).not.to.be.ok();
          db.allCollections(function (err3, collections2) {
            expect(err3).not.to.be.ok();
            expect(collections2.length).to.equal(collections.length + 1);
            var collectionNames = collections2.map(function (collection) {
              return collection.name;
            });
            expect(collectionNames).to.contain(testCollectionName);
            done();
          });
        });
      });
    });
  });
  describe('dropCollection', function () {
    it('drops the collection if it exists', function (done) {
      db.createCollection(testCollectionName, function (err) {
        expect(err).not.to.be.ok();
        db.dropCollection(testCollectionName, function (err1) {
          expect(err1).not.to.be.ok();
          db.collection(testCollectionName, false, function (err2, collection) {
            expect(err2).to.be.an(ArangoError);
            expect(collection).not.to.be.ok();
            done();
          });
        });
      });
    });
    it('returns an ArangoError if the collection does not exist', function (done) {
      db.dropCollection('this_collection_does_not_exist', function (err) {
        expect(err).to.be.an(ArangoError);
        done();
      });
    });
  });
  describe('truncateAll', function () {
    it('also truncates system collections', function (done) {
      db.collection('_users', function (err, collection) {
        expect(err).not.to.be.ok();
        expect(collection.isSystem).to.be(true);
        collection.save({_key: 'chicken'}, function (err2) {
          expect(err2).not.to.be.ok();
          db.truncateAll(function (err3) {
            expect(err3).not.to.be.ok();
            collection.all(function (err4, res) {
              expect(err4).not.to.be.ok();
              expect(res).to.be.an(Array);
              expect(res).to.be.empty();
              done();
            });
          });
        });
      });
    });
  });
  describe('truncate', function () {
    beforeEach(function (done) {
      db.collection('_users', function (err, collection) {
        collection.remove('chicken', function () {
          done();
        });
      });
    });
    it('does not truncate system collections', function (done) {
      db.collection('_users', function (err, collection) {
        expect(err).not.to.be.ok();
        expect(collection.isSystem).to.be(true);
        collection.save({_key: 'chicken'}, function (err2, doc) {
          expect(err2).not.to.be.ok();
          db.truncate(function (err3) {
            expect(err3).not.to.be.ok();
            collection.document('chicken', function (err4, doc2) {
              expect(err4).not.to.be.ok();
              expect(doc2).to.have.property('_rev');
              expect(doc2._rev).to.eql(doc._rev);
              done();
            });
          });
        });
      });
    });
    it('truncates non-system collections', function (done) {
      db.createCollection(testCollectionName, function (err, collection) {
        expect(err).not.to.be.ok();
        expect(collection.isSystem).to.be(false);
        collection.save({_key: 'chicken'}, function (err2) {
          expect(err2).not.to.be.ok();
          db.truncate(function (err3) {
            expect(err3).not.to.be.ok();
            collection.all(function (err4, res) {
              expect(err4).not.to.be.ok();
              expect(res).to.be.an(Array);
              expect(res).to.be.empty();
              done();
            });
          });
        });
      });
    });
  });
});