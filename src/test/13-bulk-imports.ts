import { expect } from "chai";
import { Database } from "../arangojs";
import { DocumentCollection, ImportOptions } from "../collection";

describe("Bulk imports", function() {
  let db: Database;
  let dbName = `testdb_${Date.now()}`;
  let collection: DocumentCollection;
  let collectionName = `collection-${Date.now()}`;
  before(async () => {
    db = new Database({
      url: process.env.TEST_ARANGODB_URL || "http://localhost:8529",
      arangoVersion: Number(process.env.ARANGO_VERSION || 30400)
    });
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
    collection = db.collection(collectionName);
    await collection.create();
  });
  after(async () => {
    try {
      db.useDatabase("_system");
      await db.dropDatabase(dbName);
    } finally {
      db.close();
    }
  });
  describe("collection.import", () => {
    describe("with type null", () => {
      it("should accept tuples array", async () => {
        const data = [
          ["_key", "data"],
          ["ta1", "banana"],
          ["ta2", "peach"],
          ["ta3", "apricot"]
        ];
        const info = await collection.import(data, { type: null });
        expect(info).to.eql({
          error: false,
          created: 3,
          errors: 0,
          empty: 0,
          updated: 0,
          ignored: 0
        });
      });
      it("should accept tuples string", async () => {
        const data =
          '["_key", "data"]\r\n["ts1", "banana"]\r\n["ts2", "peach"]\r\n["ts3", "apricot"]\r\n';
        const info = await collection.import(data, { type: null });
        expect(info).to.eql({
          error: false,
          created: 3,
          errors: 0,
          empty: 0,
          updated: 0,
          ignored: 0
        });
      });
      it("should accept tuples buffer", async () => {
        const data = Buffer.from(
          '["_key", "data"]\r\n["tb1", "banana"]\r\n["tb2", "peach"]\r\n["tb3", "apricot"]\r\n'
        );
        const info = await collection.import(data, { type: null });
        expect(info).to.eql({
          error: false,
          created: 3,
          errors: 0,
          empty: 0,
          updated: 0,
          ignored: 0
        });
      });
    });
    for (const type of [
      undefined,
      "auto",
      "documents"
    ] as ImportOptions["type"][]) {
      describe(`with type ${JSON.stringify(type)}`, () => {
        it("should accept documents array", async () => {
          const data = [
            { _key: `da1-${type}`, data: "banana" },
            { _key: `da2-${type}`, data: "peach" },
            { _key: `da3-${type}`, data: "apricot" }
          ];
          const info = await collection.import(data, { type });
          expect(info).to.eql({
            error: false,
            created: 3,
            errors: 0,
            empty: 0,
            updated: 0,
            ignored: 0
          });
        });
        it("should accept documents string", async () => {
          const data = `{"_key": "ds1-${type}", "data": "banana"}\r\n{"_key": "ds2-${type}", "data": "peach"}\r\n{"_key": "ds3-${type}", "data": "apricot"}\r\n`;
          const info = await collection.import(data, { type });
          expect(info).to.eql({
            error: false,
            created: 3,
            errors: 0,
            empty: 0,
            updated: 0,
            ignored: 0
          });
        });
        it("should accept documents buffer", async () => {
          const data = Buffer.from(
            `{"_key": "db1-${type}", "data": "banana"}\r\n{"_key": "db2-${type}", "data": "peach"}\r\n{"_key": "db3-${type}", "data": "apricot"}\r\n`
          );
          const info = await collection.import(data, { type });
          expect(info).to.eql({
            error: false,
            created: 3,
            errors: 0,
            empty: 0,
            updated: 0,
            ignored: 0
          });
        });
      });
    }
    for (const type of [
      undefined,
      "auto",
      "array"
    ] as ImportOptions["type"][]) {
      describe(`with type ${JSON.stringify(type)}`, () => {
        it("should accept JSON string", async () => {
          const data = JSON.stringify([
            { _key: `js1-${String(type)}`, data: "banana" },
            { _key: `js2-${String(type)}`, data: "peach" },
            { _key: `js3-${String(type)}`, data: "apricot" }
          ]);
          const info = await collection.import(data, { type });
          expect(info).to.eql({
            error: false,
            created: 3,
            errors: 0,
            empty: 0,
            updated: 0,
            ignored: 0
          });
        });
        it("should accept JSON buffer", async () => {
          const data = Buffer.from(
            JSON.stringify([
              { _key: `jb1-${String(type)}`, data: "banana" },
              { _key: `jb2-${String(type)}`, data: "peach" },
              { _key: `jb3-${String(type)}`, data: "apricot" }
            ])
          );
          const info = await collection.import(data, { type });
          expect(info).to.eql({
            error: false,
            created: 3,
            errors: 0,
            empty: 0,
            updated: 0,
            ignored: 0
          });
        });
      });
    }
  });
});
