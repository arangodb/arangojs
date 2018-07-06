import { expect } from "chai";
import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";
import { Route } from "../route";

describe("Arbitrary HTTP routes", () => {
  const db = new Database({
    url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
    arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
  });
  describe("database.route", () => {
    it("returns a Route instance", () => {
      const route = db.route();
      expect(route).to.be.an.instanceof(Route);
    });
    it("creates a route for the given path", () => {
      const path = "/hi";
      const route = db.route(path);
      expect((route as any)._path).to.equal(path);
    });
    it("passes the given headers to the new route", () => {
      const route = db.route("/hello", { "x-magic": "awesome" });
      expect((route as any)._headers).to.have.property("x-magic", "awesome");
    });
  });
});

describe("Route API", function() {
  // create database takes 11s in a standard cluster
  this.timeout(20000);

  const name = `testdb_${Date.now()}`;
  let db: Database;
  let collection: DocumentCollection;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
    await db.createDatabase(name);
    db.useDatabase(name);
    collection = db.collection(`c_${Date.now()}`);
    await collection.create();
  });
  after(async () => {
    try {
      db.useDatabase("_system");
      await db.dropDatabase(name);
    } finally {
      db.close();
    }
  });
  beforeEach(async () => {
    await collection.truncate();
  });
  describe("route.route", () => {
    it("should concat path", () => {
      const route = db.route("/api").route("/version");
      expect(route).to.have.property("_path", "/api/version");
    });
  });
  describe("route.get", () => {
    it("should be executed using the route path", done => {
      db.route("/_api/version")
        .get()
        .then(res => {
          expect(res).to.have.property("body");
          const body = res.body;
          expect(body).to.have.property("version");
          expect(body).to.have.property("server");
        })
        .then(() => done())
        .catch(done);
    });
    it("should concat path to route path", done => {
      db.route("/_api")
        .get("/version")
        .then(res => {
          expect(res).to.have.property("body");
          const body = res.body;
          expect(body).to.have.property("version");
          expect(body).to.have.property("server");
        })
        .then(() => done())
        .catch(done);
    });
    it("should passes query parameters", done => {
      db.route("/_api")
        .get("/version", { details: true })
        .then(res => {
          expect(res).to.have.property("body");
          const body = res.body;
          expect(body).to.have.property("version");
          expect(body).to.have.property("server");
          expect(body).to.have.property("details");
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("route.post", () => {
    it("should passes body", done => {
      db.route(`/_api/document/${collection.name}`)
        .post({ foo: "bar" })
        .then(res => {
          expect(res).to.have.property("body");
          expect(res.body).to.have.property("_id");
          expect(res.body).to.have.property("_key");
          expect(res.body).to.have.property("_rev");
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("route.put", () => {
    let documentHandle: String;
    beforeEach(done => {
      collection
        .save({ foo: "bar" })
        .then(doc => {
          documentHandle = doc._id;
          done();
        })
        .catch(done);
    });
    it("should passes body", done => {
      db.route(`/_api/document/${documentHandle}`)
        .put({ hello: "world" })
        .then(res => {
          expect(res).to.have.property("body");
          expect(res.body).to.have.property("_id");
          expect(res.body).to.have.property("_key");
          expect(res.body).to.have.property("_rev");
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("route.patch", () => {
    let documentHandle: String;
    beforeEach(done => {
      collection
        .save({ foo: "bar" })
        .then(doc => {
          documentHandle = doc._id;
          done();
        })
        .catch(done);
    });
    it("should passes body", done => {
      db.route(`/_api/document/${documentHandle}`)
        .patch({ hello: "world" })
        .then(res => {
          expect(res).to.have.property("body");
          expect(res.body).to.have.property("_id");
          expect(res.body).to.have.property("_key");
          expect(res.body).to.have.property("_rev");
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("route.delete", () => {
    let documentHandle: String;
    beforeEach(done => {
      collection
        .save({ foo: "bar" })
        .then(doc => {
          documentHandle = doc._id;
          done();
        })
        .catch(done);
    });
    it("should be executed using the route path", done => {
      db.route(`/_api/document/${documentHandle}`)
        .delete()
        .then(res => {
          expect(res).to.have.property("body");
          expect(res.body).to.have.property("_id");
          expect(res.body).to.have.property("_key");
          expect(res.body).to.have.property("_rev");
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("route.head", () => {
    let documentHandle: String;
    beforeEach(done => {
      collection
        .save({ foo: "bar" })
        .then(doc => {
          documentHandle = doc._id;
          done();
        })
        .catch(done);
    });
    it("should be executed using the route path", done => {
      db.route(`/_api/document/${documentHandle}`)
        .head()
        .then(res => {
          expect(res).to.have.property("statusCode", 200);
        })
        .then(() => done())
        .catch(done);
    });
  });
  describe("route.request", () => {
    it("should be executed using the route path", done => {
      db.route("/_api/version")
        .request("get")
        .then(res => {
          expect(res).to.have.property("body");
          const body = res.body;
          expect(body).to.have.property("version");
          expect(body).to.have.property("server");
        })
        .then(() => done())
        .catch(done);
    });
  });
});
