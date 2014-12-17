/*jshint node: true */
/*globals describe, it, before, after */
'use strict';
var expect = require('expect.js');
var Database = require('../');
var ArangoError = require('../lib/error');
var Cursor = require('../lib/cursor');
var db = new Database();
var testCollectionName = 'test__collection_0';
var testData = [
  ["hello", "blue", 10],
  ["world", "green", 15],
  ["foo", "orange", 9000],
  ["bar", "black", 7],
  ["qux", "bleen", 42],
  ["bob", "pink", 300]
].map(function (data, i) {
  return {
    "_key": String(i),
    "name": data[0],
    "color": data[1],
    "size": data[2]
  };
});

describe('database', function () {
  describe('query', function () {
    it('returns a cursor on success', function (done) {
      db.query('RETURN "hello"', function (err, res) {
        expect(err).not.to.be.ok();
        expect(res).to.be.a(Cursor);
        done();
      });
    });
    it('returns an error if the query is invalid', function (done) {
      db.query('GARBAGE', function (err, res) {
        expect(err).to.be.an(ArangoError);
        expect(res).not.to.be.ok();
        done();
      });
    });
    it('returns an error if the query failed', function (done) {
      db.query('FOR x IN does_not_exist RETURN x', function (err, res) {
        expect(err).to.be.an(ArangoError);
        expect(res).not.to.be.ok();
        done();
      });
    });
  });
});

describe('cursor', function () {
  before(function (done) {
    db.createCollection(testCollectionName, function () {
      db.query((
        'FOR x IN ' + JSON.stringify(testData) +
        ' INSERT x INTO ' + testCollectionName
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
  describe('all', function () {
    it('is missing tests');
  });
  describe('next', function () {
    it('is missing tests');
  });
  describe('hasNext', function () {
    it('is missing tests');
  });
  describe('each', function () {
    it('is missing tests');
  });
  describe('every', function () {
    it('is missing tests');
  });
  describe('some', function () {
    it('is missing tests');
  });
  describe('map', function () {
    it('is missing tests');
  });
  describe('reduce', function () {
    it('is missing tests');
  });
});