import { expect } from "chai";
import { Database } from "../arangojs";
import { DocumentCollection, EdgeCollection } from "../collection";

const range = (n: number): number[] => Array.from(Array(n).keys());

describe("Accessing collections", function() {
  const name = `testdb_${Date.now()}`;
  let db: Database;
  let builtinSystemCollections: string[];
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
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
      expect(collection).to.be.an.instanceof(DocumentCollection);
      expect(collection)
        .to.have.property("name")
        .that.equals(name);
    });
  });
  describe("database.edgeCollection", () => {
    it("returns an EdgeCollection instance for the collection", () => {
      const name = "tomato";
      const collection = db.edgeCollection(name);
      expect(collection).to.be.an.instanceof(EdgeCollection);
      expect(collection)
        .to.have.property("name")
        .that.equals(name);
    });
  });
  describe("database.listCollections", () => {
    const nonSystemCollectionNames = range(4).map(i => `c_${Date.now()}_${i}`);
    const systemCollectionNames = range(4).map(i => `_c_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all([
        ...nonSystemCollectionNames.map(name => db.collection(name).create()),
        ...systemCollectionNames.map(name =>
          db.collection(name).create({ isSystem: true })
        )
      ]);
    });
    after(async () => {
      await Promise.all([
        ...nonSystemCollectionNames.map(name => db.collection(name).drop()),
        ...systemCollectionNames.map(name =>
          db.collection(name).drop({ isSystem: true })
        )
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
    const documentCollectionNames = range(4).map(i => `dc_${Date.now()}_${i}`);
    const edgeCollectionNames = range(4).map(i => `ec_${Date.now()}_${i}`);
    const systemCollectionNames = range(4).map(i => `_c_${Date.now()}_${i}`);
    before(async () => {
      await Promise.all([
        ...documentCollectionNames.map(name => db.collection(name).create()),
        ...edgeCollectionNames.map(name => db.edgeCollection(name).create()),
        ...systemCollectionNames.map(name =>
          db.collection(name).create({ isSystem: true })
        )
      ]);
    });
    after(async () => {
      await Promise.all([
        ...documentCollectionNames.map(name => db.collection(name).drop()),
        ...edgeCollectionNames.map(name => db.edgeCollection(name).drop()),
        ...systemCollectionNames.map(name =>
          db.collection(name).drop({ isSystem: true })
        )
      ]);
    });
    it("creates DocumentCollection and EdgeCollection instances", async () => {
      const collections = await db.collections();
      const documentCollections = collections
        .filter((c: any) => c instanceof DocumentCollection)
        .sort();
      const edgeCollections = collections
        .filter((c: any) => c instanceof EdgeCollection)
        .sort();
      expect(documentCollections.length).to.equal(
        documentCollectionNames.length
      );
      expect(documentCollections.map((c: any) => c.name).sort()).to.eql(
        documentCollectionNames
      );
      expect(edgeCollections.length).to.equal(edgeCollectionNames.length);
      expect(edgeCollections.map((c: any) => c.name).sort()).to.eql(
        edgeCollectionNames
      );
    });
    it("includes system collections if explicitly passed false", async () => {
      const collections = await db.collections(false);
      const documentCollections = collections.filter(
        (c: any) => c instanceof DocumentCollection
      );
      const edgeCollections = collections.filter(
        (c: any) => c instanceof EdgeCollection
      );
      const allDocumentCollectionNames = documentCollectionNames
        .concat(systemCollectionNames)
        .concat(builtinSystemCollections)
        .sort();
      expect(documentCollections.length).to.be.at.least(
        allDocumentCollectionNames.length
      );
      expect(documentCollections.map((c: any) => c.name).sort()).to.eql(
        allDocumentCollectionNames
      );
      expect(edgeCollections.length).to.be.at.least(edgeCollectionNames.length);
      expect(edgeCollections.map((c: any) => c.name).sort()).to.eql(
        edgeCollectionNames
      );
    });
  });
});
