import { expect } from "chai";
import { DocumentCollection } from "../collection";
import { Database } from "../database";
import { config } from "./_config";

describe("Manipulating collections", function () {
  const name = `testdb_${Date.now()}`;
  let system: Database, db: Database;
  let collection: DocumentCollection;
  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
    db = await system.createDatabase(name);
  });
  after(async () => {
    try {
      await system.dropDatabase(name);
    } finally {
      system.close();
    }
  });
  beforeEach(async () => {
    collection = await db.createCollection(`collection-${Date.now()}`);
    await db.waitForPropagation(
      { path: `/_api/collection/${collection.name}` },
      10000
    );
  });
  afterEach(async () => {
    try {
      await collection.get();
    } catch (e: any) {
      return;
    }
    await collection.drop();
  });
  describe("collection.create", () => {
    it("creates a new document collection", async () => {
      const collection = await db.createCollection(
        `document-collection-${Date.now()}`
      );
      await db.waitForPropagation(
        { path: `/_api/collection/${collection.name}` },
        10000
      );
      const info = await db.collection(collection.name).get();
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("isSystem", false);
      expect(info).to.have.property("status", 3); // loaded
      expect(info).to.have.property("type", 2); // document collection
    });
    it("creates a new edge collection", async () => {
      const collection = await db.createEdgeCollection(
        `edge-collection-${Date.now()}`
      );
      await db.waitForPropagation(
        { path: `/_api/collection/${collection.name}` },
        10000
      );
      const info = await db.collection(collection.name).get();
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("isSystem", false);
      expect(info).to.have.property("status", 3); // loaded
      expect(info).to.have.property("type", 3); // edge collection
    });
  });
  describe("collection.setProperties", () => {
    it("should change properties", async () => {
      const info = await collection.properties({ waitForSync: true });
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("waitForSync", true);
    });
  });
  describe("collection.rename", () => {
    it("should rename a collection", async () => {
      const res = await db.route("/_admin/server/role").get();
      if (res.body.role !== "SINGLE") return;
      const name = `rename-collection-${Date.now()}`;
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const info = await collection.rename(name);
      expect(info).to.have.property("name", name);
    });
  });
  describe("collection.truncate", () => {
    it("should truncate a non-empty collection", async () => {
      await collection.save({});
      await collection.truncate();
      const info = await collection.count();
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("count", 0);
    });
    it("should allow truncating a empty collection", async () => {
      await collection.truncate();
      const info = await collection.count();
      expect(info).to.have.property("name", collection.name);
      expect(info).to.have.property("count", 0);
    });
  });
  describe("collection.drop", () => {
    it("should drop a collection", async () => {
      await collection.drop();
      try {
        await collection.get();
      } catch (err: any) {
        expect(err).to.have.property("errorNum", 1203);
        return;
      }
      expect.fail();
    });
  });
});
