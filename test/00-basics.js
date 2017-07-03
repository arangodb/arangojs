import {describe, it, before, after, beforeEach} from 'mocha'
import {expect} from 'chai'
import arangojs, {Database} from '../src'
import Connection from '../src/connection'
import https from 'https'
import http from 'http'

describe('Creating a Database', () => {
  describe('using the factory', () => {
    const db = arangojs({potato: 'potato'})
    it('returns a Database instance', () => {
      expect(db).to.be.an.instanceof(Database)
    })
    it('passes any configs to the connection', () => {
      expect(db._connection.config).to.have.a.property('potato', 'potato')
    })
  })
  describe('using the constructor', () => {
    const db = new Database({banana: 'banana'})
    it('returns a Database instance', () => {
      expect(db).to.be.an.instanceof(Database)
    })
    it('passes any configs to the connection', () => {
      expect(db._connection.config).to.have.a.property('banana', 'banana')
    })
  })
})

describe('Configuring the driver', () => {
  describe('with a string', () => {
    it('sets the url', () => {
      const url = 'https://example.com:9000'
      const conn = new Connection(url)
      expect(conn.config).to.have.a.property('url', url)
    })
  })
  describe('with headers', () => {
    it('applies the headers', (done) => {
      const conn = new Connection({
        headers: {
          'x-one': '1',
          'x-two': '2'
        }
      })
      conn._request = ({headers}) => {
        expect(headers).to.have.a.property('x-one', '1')
        expect(headers).to.have.a.property('x-two', '2')
        done()
      }
      conn.request({headers: {}})
    })
  })
  describe('with an arangoVersion', () => {
    it('sets the x-arango-version header', (done) => {
      const conn = new Connection({arangoVersion: 99999})
      conn._request = ({headers}) => {
        expect(headers).to.have.a.property('x-arango-version', 99999)
        done()
      }
      conn.request({headers: {}})
    })
    it('does not overwrite explicit headers', (done) => {
      const conn = new Connection({
        arangoVersion: 99999,
        headers: {'x-arango-version': 66666}
      })
      conn._request = ({headers}) => {
        expect(headers).to.have.a.property('x-arango-version', 66666)
        done()
      }
      conn.request({headers: {}})
    })
  })
  describe('with agentOptions', () => {
    const _httpAgent = http.Agent
    const _httpsAgent = https.Agent
    let protocol
    let options
    beforeEach(() => {
      protocol = undefined
      options = undefined
    })
    before(() => {
      let Agent = (ptcl) => (opts) => {
        protocol = ptcl
        options = opts
        return () => null
      }
      http.Agent = Agent('http')
      https.Agent = Agent('https')
    })
    after(() => {
      http.Agent = _httpAgent
      https.Agent = _httpsAgent
    })
    it('passes the agentOptions to the agent', () => {
      new Connection({agentOptions: {hello: 'world'}}) // eslint-disable-line no-new
      expect(options).to.have.a.property('hello', 'world')
    })
    it('uses the built-in agent for the protocol', () => {
      // default: http
      new Connection() // eslint-disable-line no-new
      expect(protocol).to.equal('http')
      new Connection('https://localhost:8529') // eslint-disable-line no-new
      expect(protocol).to.equal('https')
      new Connection('http://localhost:8529') // eslint-disable-line no-new
      expect(protocol).to.equal('http')
    })
  })
  describe('with agent', () => {
    const _httpRequest = http.request
    const _httpsRequest = https.request
    let protocol
    let options
    beforeEach(() => {
      protocol = undefined
      options = undefined
    })
    before(() => {
      let Request = (ptcl) => (opts) => {
        protocol = ptcl
        options = opts
        return {
          on () {
            return this
          },
          end () {
            return this
          }
        }
      }
      http.request = Request('http')
      https.request = Request('https')
    })
    after(() => {
      http.request = _httpRequest
      https.request = _httpsRequest
    })
    it('passes the agent to the request function', () => {
      let agent = 1
      let conn
      conn = new Connection({agent}) // default: http
      conn.request({headers: {}})
      expect(options).to.have.a.property('agent', agent)
      agent++
      conn = new Connection({agent, url: 'https://localhost:8529'})
      conn.request({headers: {}})
      expect(options).to.have.a.property('agent', agent)
      agent++
      conn = new Connection({agent, url: 'http://localhost:8529'})
      conn.request({headers: {}})
      expect(options).to.have.a.property('agent', agent)
    })
    it('uses the request function for the protocol', () => {
      const agent = 1
      let conn
      conn = new Connection({agent}) // default: http
      conn.request({headers: {}})
      expect(protocol).to.equal('http')
      conn = new Connection({agent, url: 'https://localhost:8529'})
      conn.request({headers: {}})
      expect(protocol).to.equal('https')
      conn = new Connection({agent, url: 'http://localhost:8529'})
      conn.request({headers: {}})
      expect(protocol).to.equal('http')
    })
  })
})
