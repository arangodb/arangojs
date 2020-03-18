import { expect } from "chai";
import * as http from "http";
import * as https from "https";
import arangojs, { Database } from "../arangojs";

describe("Creating a Database", () => {
  describe("using the factory", () => {
    const db = arangojs({ arangoVersion: 54321 });
    it("returns a Database instance", () => {
      expect(db).to.be.an.instanceof(Database);
    });
    it("passes any configs to the connection", () => {
      expect((db as any)._connection).to.have.property("_arangoVersion", 54321);
    });
  });
  describe("using the constructor", () => {
    const db = new Database({ arangoVersion: 43210 });
    it("returns a Database instance", () => {
      expect(db).to.be.an.instanceof(Database);
    });
    it("passes any configs to the connection", () => {
      expect((db as any)._connection).to.have.property("_arangoVersion", 43210);
    });
  });
});

describe("Configuring the driver", () => {
  describe.skip("with a string", () => {
    it("sets the url", () => {
      const url = "https://example.com:9000";
      const db = new Database(url);
      expect((db as any)._connection._url).to.eql([url]);
    });
  });
  describe("with headers", () => {
    it("applies the headers", done => {
      const db = new Database({
        headers: {
          "x-one": "1",
          "x-two": "2"
        }
      });
      (db as any)._connection._hosts = [
        ({ headers }: any) => {
          expect(headers).to.have.property("x-one", "1");
          expect(headers).to.have.property("x-two", "2");
          done();
        }
      ];
      db.request({ headers: {} }, () => {});
    });
  });
  describe("with an arangoVersion", () => {
    it("sets the x-arango-version header", done => {
      const db = new Database({ arangoVersion: 99999 });
      (db as any)._connection._hosts = [
        ({ headers }: any) => {
          expect(headers).to.have.property("x-arango-version", "99999");
          done();
        }
      ];
      db.request({ headers: {} }, () => {});
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
      let Agent = (proto: any) =>
        function(opts: any) {
          protocol = proto;
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
      new Database({ agentOptions: { hello: "world" } }); // eslint-disable-line no-new
      expect(options).to.have.property("hello", "world");
    });
    it("uses the built-in agent for the protocol", () => {
      // default: http
      new Database(); // eslint-disable-line no-new
      expect(protocol).to.equal("http");
      new Database("https://localhost:8529"); // eslint-disable-line no-new
      expect(protocol).to.equal("https");
      new Database("http://localhost:8529"); // eslint-disable-line no-new
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
      let Request = (proto: any) => (opts: any) => {
        protocol = proto;
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
      let agent = Symbol("agent");
      let db;
      db = new Database({ agent }); // default: http
      db.request({ headers: {} }, () => {});
      expect(options).to.have.property("agent", agent);
      agent = Symbol("agent");
      db = new Database({ agent, url: "https://localhost:8529" });
      db.request({ headers: {} }, () => {});
      expect(options).to.have.property("agent", agent);
      agent = Symbol("agent");
      db = new Database({ agent, url: "http://localhost:8529" });
      db.request({ headers: {} }, () => {});
      expect(options).to.have.property("agent", agent);
    });
    it("uses the request function for the protocol", () => {
      const agent = Symbol("agent");
      let db;
      db = new Database({ agent }); // default: http
      db.request({ headers: {} }, () => {});
      expect(protocol).to.equal("http");
      db = new Database({ agent, url: "https://localhost:8529" });
      db.request({ headers: {} }, () => {});
      expect(protocol).to.equal("https");
      db = new Database({ agent, url: "http://localhost:8529" });
      db.request({ headers: {} }, () => {});
      expect(protocol).to.equal("http");
    });
    it("calls Agent#destroy when the connection is closed", () => {
      const agent = {
        _destroyed: false,
        destroy() {
          this._destroyed = true;
        }
      };
      const db = new Database({ agent });
      expect(agent._destroyed).to.equal(false);
      db.close();
      expect(agent._destroyed).to.equal(true);
    });
  });
});
