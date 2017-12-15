import * as http from "http";
import * as https from "https";

import arangojs, { Database } from "../arangojs";

import { Connection } from "../connection";
import { expect } from "chai";

describe("Creating a Database", () => {
  describe("using the factory", () => {
    const db = arangojs({ databaseName: "potato" });
    it("returns a Database instance", () => {
      expect(db).to.be.an.instanceof(Database);
    });
    it("passes any configs to the connection", () => {
      expect((db as any)._connection).to.have.property(
        "_databaseName",
        "potato"
      );
    });
  });
  describe("using the constructor", () => {
    const db = new Database({ databaseName: "banana" });
    it("returns a Database instance", () => {
      expect(db).to.be.an.instanceof(Database);
    });
    it("passes any configs to the connection", () => {
      expect((db as any)._connection).to.have.property(
        "_databaseName",
        "banana"
      );
    });
  });
});

describe("Configuring the driver", () => {
  describe.skip("with a string", () => {
    it("sets the url", () => {
      const url = "https://example.com:9000";
      const conn = new Connection(url);
      expect((conn as any)._url).to.eql([url]);
    });
  });
  describe("with headers", () => {
    it("applies the headers", done => {
      const conn = new Connection({
        headers: {
          "x-one": "1",
          "x-two": "2"
        }
      });
      (conn as any)._hosts = [
        ({ headers }: any) => {
          expect(headers).to.have.property("x-one", "1");
          expect(headers).to.have.property("x-two", "2");
          done();
        }
      ];
      conn.request({ headers: {} });
    });
  });
  describe("with an arangoVersion", () => {
    it("sets the x-arango-version header", done => {
      const conn = new Connection({ arangoVersion: 99999 });
      (conn as any)._hosts = [
        ({ headers }: any) => {
          expect(headers).to.have.property("x-arango-version", "99999");
          done();
        }
      ];
      conn.request({ headers: {} });
    });
  });
  describe("with agentOptions", () => {
    const _httpAgent = http.Agent;
    const _httpsAgent = https.Agent;
    let protocol: any;
    let options: any;
    beforeEach(() => {
      protocol = undefined;
      options = undefined;
    });
    before(() => {
      let Agent = (ptcl: any) =>
        function(opts: any) {
          protocol = ptcl;
          options = opts;
          return () => null;
        };
      (http as any).Agent = Agent("http");
      (https as any).Agent = Agent("https");
    });
    after(() => {
      (http as any).Agent = _httpAgent;
      (https as any).Agent = _httpsAgent;
    });
    it("passes the agentOptions to the agent", () => {
      new Connection({ agentOptions: { hello: "world" } }); // eslint-disable-line no-new
      expect(options).to.have.property("hello", "world");
    });
    it("uses the built-in agent for the protocol", () => {
      // default: http
      new Connection(); // eslint-disable-line no-new
      expect(protocol).to.equal("http");
      new Connection("https://localhost:8529"); // eslint-disable-line no-new
      expect(protocol).to.equal("https");
      new Connection("http://localhost:8529"); // eslint-disable-line no-new
      expect(protocol).to.equal("http");
    });
  });
  describe("with agent", () => {
    const _httpRequest = http.request;
    const _httpsRequest = https.request;
    let protocol: any;
    let options: any;
    beforeEach(() => {
      protocol = undefined;
      options = undefined;
    });
    before(() => {
      let Request = (ptcl: any) => (opts: any) => {
        protocol = ptcl;
        options = opts;
        return {
          on() {
            return this;
          },
          end() {
            return this;
          }
        };
      };
      (http as any).request = Request("http");
      (https as any).request = Request("https");
    });
    after(() => {
      (http as any).request = _httpRequest;
      (https as any).request = _httpsRequest;
    });
    it("passes the agent to the request function", () => {
      let agent = function() {};
      let conn;
      conn = new Connection({ agent }); // default: http
      conn.request({ headers: {} });
      expect(options).to.have.property("agent", agent);
      agent = function() {};
      conn = new Connection({ agent, url: "https://localhost:8529" });
      conn.request({ headers: {} });
      expect(options).to.have.property("agent", agent);
      agent = function() {};
      conn = new Connection({ agent, url: "http://localhost:8529" });
      conn.request({ headers: {} });
      expect(options).to.have.property("agent", agent);
    });
    it("uses the request function for the protocol", () => {
      const agent = function() {};
      let conn;
      conn = new Connection({ agent }); // default: http
      conn.request({ headers: {} });
      expect(protocol).to.equal("http");
      conn = new Connection({ agent, url: "https://localhost:8529" });
      conn.request({ headers: {} });
      expect(protocol).to.equal("https");
      conn = new Connection({ agent, url: "http://localhost:8529" });
      conn.request({ headers: {} });
      expect(protocol).to.equal("http");
    });
  });
});
