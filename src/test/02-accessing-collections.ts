import { expect } from "chai";
import { isArangoCollection } from "../collection";
import { Database } from "../database";
import { config } from "./_config";

const range = (n: number): number[] => Array.from(Array(n).keys());

describe("Accessing collections", function () {
  const name = `testdb_${Date.now()}`;
  let db: Database;
  let builtinSystemCollections: string[];
  before(async () => {
    db = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") await db.acquireHostList();
    await db.createDatabase(name);
    db.useDatabase(name);
    const collections = await db.listCollections(false);
    builtinSystemCollections = collections.map((c: any) => c.name);
  });
  after(async () => {
    try {
      db.useDatabase("_system");
      await db.dropDatabase(name);
    } finally {
      db.close();
    }
  });
  describe("database.collection", () => {
    it("returns a DocumentCollection instance for the collection", () => {
      const name = "potato";
      const collection = db.collection(name);
      expect(isArangoCollection(collection)).to.equal(true);
      expect(collection).to.have.property("name").that.equals(name);
    });
  });
  describe("database.listCollections", () => {
    const nonSystemCollectionNames = range(4).map(
      (i) => `c_${Date.now()}_${i}`
    );
    const systemCollectionNames = range(4).map((i) => `_c_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all([
        ...nonSystemCollectionNames.map(async (name) => {
          const collection = await db.createCollection(name);
          await db.waitForPropagation(
            { path: `/_api/collection/${collection.name}` },
            10000
          );
        }),
        ...systemCollectionNames.map(async (name) => {
          const collection = db.collection(name);
          await collection.create({ isSystem: true });
          await db.waitForPropagation(
            { path: `/_api/collection/${collection.name}` },
            10000
          );
        }),
      ] as Promise<void>[]);
    });
    after(async () => {
      await Promise.all([
        ...nonSystemCollectionNames.map((name) => db.collection(name).drop()),
        ...systemCollectionNames.map((name) =>
          db.collection(name).drop({ isSystem: true })
        ),
      ]);
    });
    it("fetches information about all non-system collections", async () => {
      const collections = await db.listCollections();
      expect(collections.length).to.equal(nonSystemCollectionNames.length);
      expect(collections.map((c: any) => c.name).sort()).to.eql(
        nonSystemCollectionNames
      );
    });
    it("includes system collections if explicitly passed false", async () => {
      const collections = await db.listCollections(false);
      const allCollectionNames = nonSystemCollectionNames
        .concat(systemCollectionNames)
        .concat(builtinSystemCollections)
        .sort();
      expect(collections.length).to.be.at.least(allCollectionNames.length);
      expect(collections.map((c: any) => c.name).sort()).to.eql(
        allCollectionNames
      );
    });
  });
  describe("database.collections", () => {
    const documentCollectionNames = range(4).map(
      (i) => `dc_${Date.now()}_${i}`
    );
    const edgeCollectionNames = range(4).map((i) => `ec_${Date.now()}_${i}`);
    const systemCollectionNames = range(4).map((i) => `_c_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all([
        ...documentCollectionNames.map(async (name) => {
          const collection = await db.createCollection(name);
          await db.waitForPropagation(
            { path: `/_api/collection/${collection.name}` },
            10000
          );
        }),
        ...edgeCollectionNames.map(async (name) => {
          const collection = await db.createEdgeCollection(name);
          await db.waitForPropagation(
            { path: `/_api/collection/${collection.name}` },
            10000
          );
        }),
        ...systemCollectionNames.map(async (name) => {
          const collection = db.collection(name);
          await collection.create({ isSystem: true });
          await db.waitForPropagation(
            { path: `/_api/collection/${collection.name}` },
            10000
          );
        }),
      ] as Promise<void>[]);
    });
    after(async () => {
      await Promise.all([
        ...documentCollectionNames.map((name) => db.collection(name).drop()),
        ...edgeCollectionNames.map((name) => db.collection(name).drop()),
        ...systemCollectionNames.map((name) =>
          db.collection(name).drop({ isSystem: true })
        ),
      ]);
    });
    it("creates Collection instances", async () => {
      const collections = await db.collections();
      expect(collections.length).to.equal(
        documentCollectionNames.length + edgeCollectionNames.length
      );
      expect(collections.map((c) => c.name).sort()).to.eql(
        [...documentCollectionNames, ...edgeCollectionNames].sort()
      );
    });
    it("includes system collections if explicitly passed false", async () => {
      const collections = await db.collections(false);
      const allCollectionNames = [
        ...documentCollectionNames,
        ...edgeCollectionNames,
        ...systemCollectionNames,
        ...builtinSystemCollections,
      ].sort();
      expect(collections.map((c: any) => c.name).sort()).to.eql(
        allCollectionNames
      );
    });
  });
});
