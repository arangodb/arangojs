import { Database } from "../arangojs";
import { Route } from "../route";
import { expect } from "chai";

describe("Arbitrary HTTP routes", () => {
  const db = new Database({
    url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
    arangoVersion: Number(process.env.ARANGO_VERSION || 30000)
  });
  describe("database.route", () => {
    it("returns a Route instance", () => {
      let route = db.route();
      expect(route).to.be.an.instanceof(Route);
    });
    it("creates a route for the given path", () => {
      let path = "/hi";
      let route = db.route(path);
      expect((route as any)._path).to.equal(path);
    });
    it("passes the given headers to the new route", () => {
      let route = db.route("/hello", { "x-magic": "awesome" });
      expect((route as any)._headers).to.have.property("x-magic", "awesome");
    });
  });
});

describe("Route API", () => {
  describe("route.route", () => {
    it("is missing tests");
  });
  describe("route.get", () => {
    it("is missing tests");
  });
  describe("route.post", () => {
    it("is missing tests");
  });
  describe("route.put", () => {
    it("is missing tests");
  });
  describe("route.patch", () => {
    it("is missing tests");
  });
  describe("route.delete", () => {
    it("is missing tests");
  });
  describe("route.head", () => {
    it("is missing tests");
  });
  describe("route.request", () => {
    it("is missing tests");
  });
});
