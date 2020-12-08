import { expect } from "chai";
import { DocumentCollection } from "../collection";
import { Database } from "../database";
import { config } from "./_config";

describe("Bulk imports", function () {
  let db: Database;
  let dbName = `testdb_${Date.now()}`;
  let collection: DocumentCollection<{ data: string }>;
  let collectionName = `collection-${Date.now()}`;
  before(async () => {
    db = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") await db.acquireHostList();
    await db.createDatabase(dbName);
    db.useDatabase(dbName);
    collection = await db.createCollection(collectionName);
    await db.waitForPropagation(
      { path: `/_api/collection/${collection.name}` },
      10000
    );
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
    describe("without type", () => {
      it("should accept tuples array", async () => {
        const data = [
          ["_key", "data"],
          ["ta1", "banana"],
          ["ta2", "peach"],
          ["ta3", "apricot"],
        ];
        const info = await collection.import(data);
        expect(info).to.eql({
          error: false,
          created: 3,
          errors: 0,
          empty: 0,
          updated: 0,
          ignored: 0,
        });
      });
      it("should accept documents array", async () => {
        const data = [
          { _key: "da1", data: "banana" },
          { _key: "da2", data: "peach" },
          { _key: "da3", data: "apricot" },
        ];
        const info = await collection.import(data);
        expect(info).to.eql({
          error: false,
          created: 3,
          errors: 0,
          empty: 0,
          updated: 0,
          ignored: 0,
        });
      });
      it("should accept string of LDJSON arrays", async () => {
        const data =
          '["_key", "data"]\r\n["ts1", "banana"]\r\n["ts2", "peach"]\r\n["ts3", "apricot"]\r\n';
        const info = await collection.import(data);
        expect(info).to.eql({
          error: false,
          created: 3,
          errors: 0,
          empty: 0,
          updated: 0,
          ignored: 0,
        });
      });
      it("should accept buffer of LDJSON arrays", async () => {
        const data = Buffer.from(
          '["_key", "data"]\r\n["tb1", "banana"]\r\n["tb2", "peach"]\r\n["tb3", "apricot"]\r\n'
        );
        const info = await collection.import(data);
        expect(info).to.eql({
          error: false,
          created: 3,
          errors: 0,
          empty: 0,
          updated: 0,
          ignored: 0,
        });
      });
    });
    for (const type of ["auto", "documents"] as ("auto" | "documents")[]) {
      describe(`with type ${JSON.stringify(type)}`, () => {
        it("should accept string of LDJSON documents", async () => {
          const data = `{"_key": "ds1-${type}", "data": "banana"}\r\n{"_key": "ds2-${type}", "data": "peach"}\r\n{"_key": "ds3-${type}", "data": "apricot"}\r\n`;
          const info = await collection.import(data, { type });
          expect(info).to.eql({
            error: false,
            created: 3,
            errors: 0,
            empty: 0,
            updated: 0,
            ignored: 0,
          });
        });
        it("should accept buffer of LDJSON documents", async () => {
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
            ignored: 0,
          });
        });
      });
    }
    for (const type of ["auto", "list"] as ("auto" | "list")[]) {
      describe(`with type ${JSON.stringify(type)}`, () => {
        it("should accept string of JSON documents array", async () => {
          const data = JSON.stringify([
            { _key: `js1-${String(type)}`, data: "banana" },
            { _key: `js2-${String(type)}`, data: "peach" },
            { _key: `js3-${String(type)}`, data: "apricot" },
          ]);
          const info = await collection.import(data, { type });
          expect(info).to.eql({
            error: false,
            created: 3,
            errors: 0,
            empty: 0,
            updated: 0,
            ignored: 0,
          });
        });
        it("should accept buffer of JSON documents array", async () => {
          const data = Buffer.from(
            JSON.stringify([
              { _key: `jb1-${String(type)}`, data: "banana" },
              { _key: `jb2-${String(type)}`, data: "peach" },
              { _key: `jb3-${String(type)}`, data: "apricot" },
            ])
          );
          const info = await collection.import(data, { type });
          expect(info).to.eql({
            error: false,
            created: 3,
            errors: 0,
            empty: 0,
            updated: 0,
            ignored: 0,
          });
        });
      });
    }
  });
});
