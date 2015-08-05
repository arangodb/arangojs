'use strict';
var expect = require('expect.js');
var Database = require('../').Database;
var ArangoError = require('../lib/error');
var db = new Database();
var testCollectionName = 'test__collection_2';

var STATUS_UNLOADED = 2;
var STATUS_LOADED = 3;
var STATUS_UNLOADING = 4;

describe('collection', function () {
  var collection;
  beforeEach(function (done) {
    db.dropCollection(collection ? collection.name : testCollectionName, function () {
      db.createCollection(testCollectionName, function (err, coll) {
        collection = coll;
        done(err);
      });
    });
  });
  describe('load', function () {
    it('loads the collection', function (done) {
      collection.unload(function (err1) {
        expect(err1).not.to.be.ok();
        expect(collection.status).not.to.equal(STATUS_LOADED);
        collection.load(function (err2) {
          expect(err2).not.to.be.ok();
          expect(collection.status).to.equal(STATUS_LOADED);
          done();
        });
      });
      it('also returns the count if count:true', function () {
        delete collection.count;
        collection.load(true, function (err) {
          expect(err).not.to.be.ok();
          expect(collection.count).to.be.a('number');
          done();
        });
      });
    });
  });
  describe('unload', function () {
    it('unloads the collection', function (done) {
      collection.load(function (err1) {
        expect(err1).not.to.be.ok();
        collection.unload(function (err2) {
          expect(err2).not.to.be.ok();
          expect([STATUS_UNLOADED, STATUS_UNLOADING]).to.contain(collection.status);
          done();
        });
      });
    });
  });
  describe('setProperties', function () {
    it('is missing tests');
  });
  describe('rename', function () {
    it('renames the collection', function (done) {
      var newName = collection.name + '_smorgsasbord';
      var oldName = collection.name;
      collection.rename(newName, function (err1) {
        expect(err1).not.to.be.ok();
        expect(collection.name).to.equal(newName);
        db.collection(oldName, false, function (err2, collection) {
          expect(err2).to.be.an(ArangoError);
          expect(collection).not.to.be.ok();
          done();
        });
      });
    });
  });
  describe('rotate', function () {
    it('is missing tests');
  });
  describe('drop', function () {
    it('drops the collection if it exists', function (done) {
      collection.drop(function (err1) {
        expect(err1).not.to.be.ok();
        db.collection(collection.name, false, function (err2, collection) {
          expect(err2).to.be.an(ArangoError);
          expect(collection).not.to.be.ok();
          done();
        });
      });
    });
    it('returns an ArangoError if the collection does not exist', function (done) {
      collection.drop(function (err1) {
        expect(err1).not.to.be.ok();
        collection.drop(function (err2) {
          expect(err2).to.be.an(ArangoError);
          done();
        });
      });
    });
  });
});
