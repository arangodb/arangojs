'use strict';
var expect = require('expect.js');
var async = require('async');
var Database = require('../');
var Graph = require('../lib/graph');
var ArangoError = require('../lib/error');
var db = new Database();
var testVertexCollectionName1 = 'test__vertices_1';
var testVertexCollectionName2 = 'test__vertices_2';
var testEdgeCollectionName1 = 'test__edges_1';
var testEdgeCollectionName2 = 'test__edges_2';
var testEdgeCollectionName3 = 'test__edges_3';
var testDbName = 'test__database_graphs_1';
var testGraphName = 'test__graph_1';

function mcall(name) {
  return function (obj, cb) {
    obj[name](cb);
  };
}

describe('database', function () {
  var edgeCollection1, edgeCollection2, edgeCollection3;
  var vertexCollection1, vertexCollection2;
  var _db;
  before(function (done) {
    db.database(testDbName, true, function (err1, database) {
      _db = db;
      db = database;
      async.map([
        {name: testVertexCollectionName1, type: 2},
        {name: testVertexCollectionName2, type: 2},
        {name: testEdgeCollectionName1, type: 3},
        {name: testEdgeCollectionName2, type: 3},
        {name: testEdgeCollectionName3, type: 3}
      ], db.createCollection.bind(db), function (err, results) {
        if (err) return done(err);
        vertexCollection1 = results[0];
        vertexCollection2 = results[1];
        edgeCollection1 = results[2];
        edgeCollection2 = results[3];
        edgeCollection3 = results[4];
        done();
      });
    });
  });
  after(function (done) {
    _db.dropDatabase(testDbName, function (err) {
      db = _db;
      done(err);
    });
  });
  beforeEach(function (done) {
    async.map([
      vertexCollection1,
      vertexCollection2,
      edgeCollection1,
      edgeCollection2,
      edgeCollection3
    ], mcall('truncate'), function (err) {
      db.dropGraph(testGraphName, function () {
        done(err);
      });
    });
  });
  describe('createGraph', function (done) {
    it('returns a new graph object with the given name', function (done) {
      db.createGraph({name: testGraphName}, function (err, graph) {
        expect(err).not.to.be.ok();
        expect(graph).to.be.ok();
        expect(graph).to.be.a(Graph);
        expect(graph.name).to.equal(testGraphName);
        done();
      });
    });
    it('creates a new graph with the given name', function (done) {
      db.createGraph({name: testGraphName}, function (err) {
        expect(err).not.to.be.ok();
        db.graph(testGraphName, false, function (err2, graph) {
          expect(err2).not.to.be.ok();
          expect(graph.name).to.equal(testGraphName);
          done();
        });
      });
    });
    it('creates a new graph with the given edge defs', function (done) {
      var edgeDefs = [
        {
          collection: testEdgeCollectionName1,
          from: [testVertexCollectionName1],
          to: [testVertexCollectionName2]
        },
        {
          collection: testEdgeCollectionName2,
          from: [testVertexCollectionName2],
          to: [testVertexCollectionName1]
        },
        {
          collection: testEdgeCollectionName3,
          from: [testVertexCollectionName1, testVertexCollectionName2],
          to: [testVertexCollectionName1, testVertexCollectionName2]
        }
      ];
      db.createGraph({
        name: testGraphName,
        edgeDefinitions: edgeDefs
      }, function (err) {
        expect(err).not.to.be.ok();
        db.graph(testGraphName, false, function (err2, graph) {
          expect(err2).not.to.be.ok();
          expect(graph.edgeDefinitions).to.eql(edgeDefs);
          done();
        });
      });
    });
  });
  describe('graph', function () {
    describe('with autoCreate:false', function () {
      it('returns the graph if it exists', function (done) {
        db.createGraph({name: testGraphName}, function (err) {
          expect(err).not.to.be.ok();
          db.graph(testGraphName, false, function (err2, graph) {
            expect(err2).not.to.be.ok();
            expect(graph.name).to.equal(testGraphName);
            done();
          });
        });
      });
      it('returns an ArangoError if the graph does not exist', function (done) {
        db.graph('this_does_not_exist', false, function (err, graph) {
          expect(err).to.be.an(ArangoError);
          expect(graph).not.to.be.ok();
          done();
        });
      });
    });
    describe('with autoCreate:true', function () {
      it('returns the graph if it exists', function (done) {
        db.createGraph({name: testGraphName}, function (err) {
          expect(err).not.to.be.ok();
          db.graph(testGraphName, false, function (err2, graph) {
            expect(err2).not.to.be.ok();
            expect(graph.name).to.equal(testGraphName);
            done();
          });
        });
      });
      it('creates the graph if it does not exist', function (done) {
        db.graph(testGraphName, true, function (err, graph) {
          expect(err).not.to.be.ok();
          expect(graph.name).to.equal(testGraphName);
          done();
        });
      });
    });
  });
  describe('graphs', function () {
    it('is missing tests');
  });
  describe('dropGraph', function () {
    it('is missing tests');
  });
});
