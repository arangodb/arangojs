'use strict';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Database} from '../src';
//import Cursor from '../src/cursor';
const db = new Database();
const queryString = 'FOR i In 0..10 RETURN i';

describe('Cursor', () => {
  it('returns an instanceof Cursor on success', (done) => {
    db.query(queryString, (err, cursor) => {
      expect(err).to.not.be.ok;
      //expect(cursor).to.be.an.instanceof(Cursor);
      done();
    });
  });
  describe('#all', () => {
    it('returns an Array of all results', (done) => {
      db.query(queryString, (err, cursor) => {
        expect(err).to.not.be.ok;
        cursor.all((err, vals) => {
          expect(err).to.not.be.ok;
          expect(vals).to.eql([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
          done();
        });
      });
    });
  });
  describe('#next', () => {
    it('returns the next result of the Cursor', (done) => {
      db.query(queryString, (err, cursor) => {
        expect(err).to.not.be.ok;
        cursor.next((err, val) => {
          expect(err).to.not.be.ok;
          expect(val).to.eql(0);
          cursor.next((err, val) => {
            expect(err).to.not.be.ok;
            expect(val).to.eql(1);
            done();
          });
        });
      });
    });
  });
  describe('#hasNext', () => {
    it('returns true if the Cursor has more results', (done) => {
      db.query(queryString, (err, cursor) => {
        expect(err).to.not.be.ok;
        cursor.next((err, val) => {
          expect(err).to.not.be.ok;
          expect(cursor.hasNext()).to.be.true;
          done();
        });
      });
    });
    it('returns false if the Cursor is empty', (done) => {
      db.query(queryString, (err, cursor) => {
        expect(err).to.not.be.ok;
        cursor.all((err, vals) => {
          expect(err).to.not.be.ok;
          expect(cursor.hasNext()).to.be.false;
          done();
        });
      });
    });
  });
  describe('#each', () => {
    it('returns each result of the Cursor unless false', (done) => {
      db.query(queryString, (err, cursor) => {
        expect(err).to.not.be.ok;
        let results = [];
        cursor.each((value) => {
          results.push(value);
          return value === 5 ? false : true;
        }, (err, last) => {
          if (err) done(err);
          expect(err).to.not.be.ok;
          expect(last).to.be.false;
          expect(results).to.eql([0, 1, 2, 3, 4, 5]);
          done();
        });
      });
    });
  });
  describe('#every', () => {
    it('returns each result of the Cursor unless ~false', (done) => {
      db.query(queryString, (err, cursor) => {
        expect(err).to.not.be.ok;
        let results = [];
        cursor.every((value) => {
          results.push(value);
          return value === 5 ? 0 : true;
        }, (err, last) => {
          if (err) done(err);
          expect(err).to.not.be.ok;
          expect(last).to.be.false;
          expect(results).to.eql([0, 1, 2, 3, 4, 5]);
          done();
        });
      });
    });
  });
  describe('#some', () => {
    it('returns each result of the Cursor unless ~true', (done) => {
      db.query(queryString, (err, cursor) => {
        expect(err).to.not.be.ok;
        let results = [];
        cursor.some((value) => {
          results.push(value);
          return value === 5 ? 1 : false;
        }, (err, last) => {
          if (err) done(err);
          expect(err).to.not.be.ok;
          expect(last).to.be.true;
          expect(results).to.eql([0, 1, 2, 3, 4, 5]);
          done();
        });
      });
    });
  });
  describe('#map', () => {
    it('returns a map of all the results', (done) => {
      db.query(queryString, (err, cursor) => {
        expect(err).to.not.be.ok;
        cursor.map((value) => {
          return value + 1;
        }, (err, results) => {
          if (err) done(err);
          expect(err).to.not.be.ok;
          expect(results).to.eql([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
          done();
        });
      });
    });
  });
  describe('#reduce', () => {
    it('retuns a reduce of all the results', (done) => {
      db.query(queryString, (err, cursor) => {
        expect(err).to.not.be.ok;
        cursor.reduce((a, b) => {
          return a + b;
        }, (err, result) => {
          if (err) done(err);
          expect(err).to.not.be.ok;
          expect(result).to.eql(55);
          done();
        });
      });
    });
  });
});
