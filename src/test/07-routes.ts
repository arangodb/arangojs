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
    it("should be executed using the route path", async () => {
      const res = await db.route("/_api/version").get();
      expect(res).to.have.property("body");
      const body = res.body;
      expect(body).to.have.property("version");
      expect(body).to.have.property("server");
    });
    it("should concat path to route path", async () => {
      const res = await db.route("/_api").get("/version");
      expect(res).to.have.property("body");
      const body = res.body;
      expect(body).to.have.property("version");
      expect(body).to.have.property("server");
    });
    it("should passes query parameters", async () => {
      const res = await db.route("/_api").get("/version", { details: true });
      expect(res).to.have.property("body");
      const body = res.body;
      expect(body).to.have.property("version");
      expect(body).to.have.property("server");
      expect(body).to.have.property("details");
    });
  });
  describe("route.post", () => {
    it("should passes body", async () => {
      const res = await db
        .route(`/_api/document/${collection.name}`)
        .post({ foo: "bar" });
      expect(res).to.have.property("body");
      expect(res.body).to.have.property("_id");
      expect(res.body).to.have.property("_key");
      expect(res.body).to.have.property("_rev");
    });
  });
  describe("route.put", () => {
    let documentHandle: string;
    beforeEach(async () => {
      const doc = await collection.save({ foo: "bar" });
      documentHandle = doc._id;
    });
    it("should pass body", async () => {
      const res = await db
        .route(`/_api/document/${documentHandle}`)
        .put({ hello: "world" });
      expect(res).to.have.property("body");
      expect(res.body).to.have.property("_id");
      expect(res.body).to.have.property("_key");
      expect(res.body).to.have.property("_rev");
    });
  });
  describe("route.patch", () => {
    let documentHandle: string;
    beforeEach(async () => {
      const doc = await collection.save({ foo: "bar" });
      documentHandle = doc._id;
    });
    it("should passes body", async () => {
      const res = await db
        .route(`/_api/document/${documentHandle}`)
        .patch({ hello: "world" });
      expect(res).to.have.property("body");
      expect(res.body).to.have.property("_id");
      expect(res.body).to.have.property("_key");
      expect(res.body).to.have.property("_rev");
    });
  });
  describe("route.delete", () => {
    let documentHandle: string;
    beforeEach(async () => {
      const doc = await collection.save({ foo: "bar" });
      documentHandle = doc._id;
    });
    it("should be executed using the route path", async () => {
      const res = await db.route(`/_api/document/${documentHandle}`).delete();
      expect(res).to.have.property("body");
      expect(res.body).to.have.property("_id");
      expect(res.body).to.have.property("_key");
      expect(res.body).to.have.property("_rev");
    });
  });
  describe("route.head", () => {
    let documentHandle: string;
    beforeEach(async () => {
      const doc = await collection.save({ foo: "bar" });
      documentHandle = doc._id;
    });
    it("should be executed using the route path", async () => {
      const res = await db.route(`/_api/document/${documentHandle}`).head();
      expect(res).to.have.property("statusCode", 200);
    });
  });
  describe("route.request", () => {
    it("should be executed using the route path", async () => {
      const res = await db.route("/_api/version").request("get");
      expect(res).to.have.property("body");
      const body = res.body;
      expect(body).to.have.property("version");
      expect(body).to.have.property("server");
    });
  });
});
