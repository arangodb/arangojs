'use strict';
var expect = require('expect.js');
var Database = require('../');
var ArangoError = require('../lib/error');
var Cursor = require('../lib/cursor');
var db = new Database();
var testCollectionName = 'test__collection_0';

describe('database', function () {
  describe('query', function () {
    it('returns a cursor on success', function (done) {
      db.query('RETURN "hello"', function (err, res) {
        expect(err).not.to.be.ok();
        expect(res).to.be.a(Cursor);
        done();
      });
    });
    it('returns an ArangoError if the query is invalid', function (done) {
      db.query('GARBAGE', function (err, res) {
        expect(err).to.be.an(ArangoError);
        expect(res).not.to.be.ok();
        done();
      });
    });
    it('returns an ArangoError if the query failed', function (done) {
      db.query('FOR x IN does_not_exist RETURN x', function (err, res) {
        expect(err).to.be.an(ArangoError);
        expect(res).not.to.be.ok();
        done();
      });
    });
  });
});

describe('cursor', function () {
  var cursor;
  before(function (done) {
    db.createCollection(testCollectionName, function () {
      db.query((
        'FOR i IN 1..1500 INSERT {_key: TO_STRING(i), value: i} INTO ' +
        testCollectionName
      ), function (err) {
        done(err);
      });
    });
  });
  after(function (done) {
    db.dropCollection(testCollectionName, function () {
      done();
    });
  });
  beforeEach(function (done) {
    db.query('FOR x IN ' + testCollectionName + ' SORT x.value ASC RETURN x', function (err, cur) {
      if (err) done(err);
      else {
        cursor = cur;
        done();
      }
    });
  });
  describe('all', function () {
    it('returns an array with all result records', function (done) {
      cursor.all(function (err, records) {
        expect(err).not.to.be.ok();
        expect(records).to.be.an(Array);
        expect(records).to.have.property('length', 1500);
        done();
      });
    });
  });
  describe('next', function () {
    it('returns the next record in the cursor', function (done) {
      cursor.next(function (err, record) {
        expect(err).not.to.be.ok();
        expect(record).to.have.property('value', 1);
        cursor.next(function (err2, record2) {
          expect(err2).not.to.be.ok();
          expect(record2).to.have.property('value', 2);
          done();
        });
      });
    });
    it('returns nothing if the cursor has been depleted', function (done) {
      cursor.all(function (err) {
        expect(err).not.to.be.ok();
        cursor.next(function (err, record) {
          expect(err).not.to.be.ok();
          expect(record).not.to.be.ok();
          done();
        });
      });
    });
  });
  describe('hasNext', function () {
    it('returns true if the cursor has not yet been depleted', function () {
      expect(cursor.hasNext()).to.be(true);
    });
    it('returns false if the cursor has been depleted', function (done) {
      cursor.all(function (err) {
        expect(err).not.to.be.ok();
        expect(cursor.hasNext()).to.be(false);
        done();
      });
    });
  });
  describe('each', function () {
    it('applies the function to each record', function (done) {
      var timesCalled = 0;
      cursor.each(function (record, index, records) {
        expect(record.value).to.equal(timesCalled + 1);
        expect(index).to.equal(timesCalled);
        expect(records).to.equal(cursor);
        timesCalled++;
      }, function (err) {
        expect(err).not.to.be.ok();
        expect(timesCalled).to.equal(1500);
        done();
      });
    });
  });
  describe('every', function () {
    it('returns true if the function returns true for every record', function (done) {
      var timesCalled = 0;
      cursor.every(function (record, index, records) {
        expect(record.value).to.equal(timesCalled + 1);
        expect(index).to.equal(timesCalled);
        expect(records).to.equal(cursor);
        timesCalled++;
        return true;
      }, function (err, result) {
        expect(err).not.to.be.ok();
        expect(result).to.equal(true);
        expect(timesCalled).to.equal(1500);
        expect(cursor._index).to.equal(1500);
        done();
      });
    });
    it('returns false if the function returns false for any record', function (done) {
      var timesCalled = 0;
      cursor.every(function (record, index, records) {
        expect(record.value).to.equal(timesCalled + 1);
        expect(index).to.equal(timesCalled);
        expect(records).to.equal(cursor);
        timesCalled++;
        return timesCalled < 100;
      }, function (err, result) {
        expect(err).not.to.be.ok();
        expect(result).to.equal(false);
        expect(timesCalled).to.equal(100);
        expect(cursor._index).to.equal(100);
        done();
      });
    });
  });
  describe('some', function () {
    it('returns false if the function returns false for every record', function (done) {
      var timesCalled = 0;
      cursor.some(function (record, index, records) {
        expect(record.value).to.equal(timesCalled + 1);
        expect(index).to.equal(timesCalled);
        expect(records).to.equal(cursor);
        timesCalled++;
        return false;
      }, function (err, result) {
        expect(err).not.to.be.ok();
        expect(result).to.equal(false);
        expect(timesCalled).to.equal(1500);
        expect(cursor._index).to.equal(1500);
        done();
      });
    });
    it('returns true if the function returns true for any record', function (done) {
      var timesCalled = 0;
      cursor.some(function (record, index, records) {
        expect(record.value).to.equal(timesCalled + 1);
        expect(index).to.equal(timesCalled);
        expect(records).to.equal(cursor);
        timesCalled++;
        return timesCalled === 100;
      }, function (err, result) {
        expect(err).not.to.be.ok();
        expect(result).to.equal(true);
        expect(timesCalled).to.equal(100);
        expect(cursor._index).to.equal(100);
        done();
      });
    });
  });
  describe('map', function () {
    it('returns the result of applying the function to each record', function (done) {
      var timesCalled = 0;
      cursor.map(function (record, index, records) {
        expect(record.value).to.equal(timesCalled + 1);
        expect(index).to.equal(timesCalled);
        expect(records).to.equal(cursor);
        timesCalled++;
        return 1;
      }, function (err, result) {
        expect(err).not.to.be.ok();
        expect(result).to.be.an(Array);
        expect(result.reduce(function (a, b) {return a + b;})).to.equal(1500);
        expect(timesCalled).to.equal(1500);
        done();
      });
    });
  });
  describe('reduce', function () {
    it('is missing tests');
  });
});
