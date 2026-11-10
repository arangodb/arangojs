import { expect } from "chai";
import { DocumentCollection } from "../collections.js";
import { Database } from "../databases.js";
import {
  Document,
  DocumentMetadata,
  DocumentOperationFailure,
  DocumentOperationMetadata,
} from "../documents.js";
import { DOCUMENT_NOT_FOUND, ERROR_ARANGO_CONFLICT } from "../lib/codes.js";
import { config } from "./_config.js";
import {
  clusterIntegrationTimeoutMs,
  propagationForResourceMs,
  waitForNewDatabase,
} from "./_integration-timeouts.js";

describe("DocumentCollection API", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  const name = `testdb_${Date.now()}`;
  let system: Database, db: Database;
  let collection: DocumentCollection;
  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
    db = await system.createDatabase(name);
    await waitForNewDatabase(db);
  });
  after(async () => {
    try {
      await system.dropDatabase(name);
    } finally {
      system.close();
    }
  });
  beforeEach(async () => {
    collection = await db.createCollection(`c_${Date.now()}`);
    await db.waitForPropagation(
      { pathname: `/_api/collection/${collection.name}` },
      propagationForResourceMs,
    );
  });
  afterEach(async () => {
    await collection.drop();
  });
  describe("documentCollection.document", () => {
    const data = { foo: "bar" };
    let meta: DocumentMetadata;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns a document in the collection", async () => {
      const doc = await collection.document(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc.foo).to.equal(data.foo);
    });
    it("does not throw on not found when graceful", async () => {
      const doc = await collection.document("does-not-exist", true);
      expect(doc).to.equal(null);
    });
  });
  describe("documentCollection.documents", () => {
    const data = { foo: "bar" };
    let meta: DocumentMetadata[];
    beforeEach(async () => {
      const c = collection as DocumentCollection<{ foo: string }>;
      meta = await Promise.all([c.save(data), c.save(data), c.save(data)]);
    });
    it("returns multiple documents in the collection", async () => {
      const docs = await collection.documents(meta);
      let i = 0;
      for (const doc of docs) {
        expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
        expect(doc._id).to.equal(meta[i]._id);
        expect(doc._key).to.equal(meta[i]._key);
        expect(doc._rev).to.equal(meta[i]._rev);
        expect(doc.foo).to.equal(data.foo);
        i++;
      }
    });
  });
  describe("documentCollection.documentExists", () => {
    const data = { foo: "bar" };
    let meta: DocumentMetadata;
    beforeEach(async () => {
      meta = await collection.save(data);
    });
    it("returns true if the document exists", async () => {
      const exists = await collection.documentExists(meta._id);
      expect(exists).to.equal(true);
    });
    it("returns false if the document does not exist", async () => {
      const exists = await collection.documentExists("does-not-exist");
      expect(exists).to.equal(false);
    });
    it("returns false if the collection does not exist", async () => {
      const exists = await db
        .collection("does-not-exist")
        .documentExists("lol");
      expect(exists).to.equal(false);
    });
  });
  describe("documentCollection.save", () => {
    it("creates a document in the collection", async () => {
      const data = { foo: "bar" };
      const meta = await collection.save(data);
      expect(meta).to.be.an("object");
      expect(meta).to.have.property("_id").that.is.a("string");
      expect(meta).to.have.property("_rev").that.is.a("string");
      expect(meta).to.have.property("_key").that.is.a("string");
      const doc = await collection.document(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
      expect(doc._id).to.equal(meta._id);
      expect(doc._key).to.equal(meta._key);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc.foo).to.equal(data.foo);
    });
    it("uses the given _key if provided", async () => {
      const data = { potato: "tomato", _key: "banana" };
      const meta = await collection.save(data);
      expect(meta).to.be.an("object");
      expect(meta).to.have.property("_id").that.is.a("string");
      expect(meta).to.have.property("_rev").that.is.a("string");
      expect(meta).to.have.property("_key").that.equals(data._key);
      const doc = await collection.document(meta._id);
      expect(doc).to.have.keys("_key", "_id", "_rev", "potato");
      expect(doc._id).to.equal(meta._id);
      expect(doc._rev).to.equal(meta._rev);
      expect(doc._key).to.equal(data._key);
      expect(doc.potato).to.equal(data.potato);
    });
    it("returns the document if options.returnNew is set", async () => {
      const data = { potato: "tomato" };
      const options = { returnNew: true };
      const meta = await collection.save(data, options);
      expect(meta).to.be.an("object");
      expect(meta).to.have.property("_id").that.is.a("string");
      expect(meta).to.have.property("_rev").that.is.a("string");
      expect(meta).to.have.property("_key").that.is.a("string");
      expect(meta.new).to.be.an("object");
      expect(meta.new).to.have.property("_id").that.is.a("string");
      expect(meta.new).to.have.property("_rev").that.is.a("string");
      expect(meta.new).to.have.property("_key").that.is.a("string");
      expect(meta.new!.potato).to.equal(data.potato);
    });
    it("interprets options as returnNew if it is a boolean", async () => {
      const data = { potato: "tomato" };
      const meta = await collection.save(data, { returnNew: true });
      expect(meta).to.be.an("object");
      expect(meta).to.have.property("_id").that.is.a("string");
      expect(meta).to.have.property("_rev").that.is.a("string");
      expect(meta).to.have.property("_key").that.is.a("string");
      expect(meta.new).to.be.an("object");
      expect(meta.new).to.have.property("_id").that.is.a("string");
      expect(meta.new).to.have.property("_rev").that.is.a("string");
      expect(meta.new).to.have.property("_key").that.is.a("string");
      expect(meta.new!.potato).to.equal(data.potato);
    });
  });
  describe("documentCollection.replace", () => {
    it("replaces the given document", async () => {
      const data = { potato: "tomato" };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.replace(doc, { sup: "dawg" });
      const newData = await collection.document(doc._key);
      expect(newData).not.to.have.property("potato");
      expect(newData).to.have.property("sup").that.equals("dawg");
    });
  });
  describe("documentCollection.update", () => {
    it("updates the given document", async () => {
      const data = { potato: "tomato", empty: false };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.update(doc, { sup: "dawg", empty: null });
      const newData = await collection.document(doc._key);
      expect(newData).to.have.property("potato").that.equals(doc.potato);
      expect(newData).to.have.property("sup").that.equals("dawg");
      expect(newData).to.have.property("empty").that.equals(null);
    });
    it("removes null values if keepNull is explicitly set to false", async () => {
      const data = { potato: "tomato", empty: false };
      const meta = await collection.save(data, { returnNew: true });
      const doc = meta.new!;
      await collection.update(
        doc,
        { sup: "dawg", empty: null },
        { keepNull: false },
      );
      const newData = await collection.document(doc._key);
      expect(newData).to.have.property("potato").that.equals(doc.potato);
      expect(newData).to.have.property("sup").that.equals("dawg");
      expect(newData).not.to.have.property("empty");
    });
  });
  describe("documentCollection.remove", () => {
    const key = `d_${Date.now()}`;
    beforeEach(async () => {
      await collection.save({ _key: key });
    });
    it("deletes the given document", async () => {
      await collection.remove(key);
      try {
        await collection.document(key);
      } catch (e: any) {
        return;
      }
      expect.fail();
    });
  });

  // DE-1259: Strengthen integration coverage for bulk document operations.
  describe("bulk operations", () => {
    // Not currently exported by lib/codes.ts.
    const uniqueConstraintViolation = 1210;
    // Every bulk test also has one untouched sentinel included in collection counts.
    const keys = ["third", "first", "second"];
    let sentinel: Document;

    function bulkData(key: string) {
      return {
        _key: key,
        something: "original-" + key,
        more: "preserved",
        empty: false,
      };
    }

    function bulkChange(key: string) {
      return {
        _key: key,
        something: "changed-" + key,
      };
    }

    // Seed through the single-document API so fixtures do not depend on the bulk method under test.
    async function seed(seedKeys = keys) {
      const originals = [];
      for (const key of seedKeys) {
        const result = await collection.save(bulkData(key), {
          returnNew: true,
        });
        originals.push(result.new!);
      }
      return originals;
    }

    function success<T extends DocumentOperationMetadata>(
      result: T | DocumentOperationFailure,
      key?: string,
    ): T {
      if ("error" in result) {
        expect.fail("Unexpected bulk failure: " + JSON.stringify(result));
      }
      expect(result._key).to.be.a("string").and.not.to.equal("");
      if (key !== undefined) expect(result._key).to.equal(key);
      expect(result._id).to.equal(collection.name + "/" + result._key);
      expect(result._rev).to.be.a("string").and.not.to.equal("");
      return result;
    }

    function failure(
      result: DocumentOperationMetadata | DocumentOperationFailure,
      errorNum: number,
    ) {
      // Server wording may vary; check the stable error code and a non-empty description.
      expect(result).to.have.property("error", true);
      expect(result).to.have.property("errorNum", errorNum);
      expect(result)
        .to.have.property("errorMessage")
        .that.is.a("string")
        .and.not.to.equal("");
      expect(result).not.to.have.property("new");
      expect(result).not.to.have.property("old");
    }

    beforeEach(async () => {
      [sentinel] = await seed(["sentinel"]);
    });

    afterEach(async () => {
      expect(await collection.document(sentinel._key)).to.deep.equal(sentinel);
    });

    describe("documentCollection.saveAll", () => {
      it("inserts documents and returns metadata in input order", async () => {
        // Non-sorted keys expose reordered replies; default responses should contain metadata only.
        const data = keys.map(bulkData);
        const result = await collection.saveAll(data);
        expect(result).to.have.lengthOf(data.length);
        for (const [i, input] of data.entries()) {
          const meta = success(result[i], input._key);
          expect(meta).not.to.have.property("new");
          expect(meta).not.to.have.property("old");
          expect(await collection.document(input._key)).to.deep.equal({
            ...input,
            _id: meta._id,
            _rev: meta._rev,
          });
        }
        expect(await collection.count()).to.have.property("count", 4);
      });

      it("returns new documents, including a generated key, in input order", async () => {
        // Omit the middle key during serialization so the server generates it without shifting results.
        const generated = { ...bulkData("generated"), _key: undefined };
        const data = [bulkData("third"), generated, bulkData("first")];
        const expectedKeys = ["third", undefined, "first"];
        const result = await collection.saveAll(data, { returnNew: true });
        expect(result).to.have.lengthOf(3);
        for (const [i, input] of data.entries()) {
          const meta = success(result[i], expectedKeys[i]);
          const stored = await collection.document(meta._key);
          expect(stored).to.deep.equal({
            ...input,
            _key: meta._key,
            _id: meta._id,
            _rev: meta._rev,
          });
          expect(meta.new).to.deep.equal(stored);
          expect(meta).not.to.have.property("old");
        }
        expect(await collection.count()).to.have.property("count", 4);
      });

      it("accepts an empty batch without changing the collection", async () => {
        // The sentinel is the only stored document; an empty batch must leave it untouched.
        expect(await collection.saveAll([])).to.deep.equal([]);
        expect(await collection.count()).to.have.property("count", 1);
      });

      it("preserves a duplicate and returns errors between successful inserts", async () => {
        // Only the middle key exists already; its failure must not roll back either surrounding insert.
        const [original] = await seed(["first"]);
        const data = keys.map(bulkData);
        const result = await collection.saveAll(data, { returnNew: true });
        expect(result).to.have.lengthOf(3);
        failure(result[1], uniqueConstraintViolation);
        for (const i of [0, 2]) {
          const meta = success(result[i], data[i]._key);
          const stored = await collection.document(meta._key);
          expect(stored).to.deep.equal({
            ...data[i],
            _id: meta._id,
            _rev: meta._rev,
          });
          expect(meta.new).to.deep.equal(stored);
        }
        expect(await collection.document("first")).to.deep.equal(original);
        expect(await collection.count()).to.have.property("count", 4);
      });

      it("returns per-document errors when every key already exists", async () => {
        // An all-error response must preserve every original document, including its revision.
        const originals = await seed();
        const result = await collection.saveAll(keys.map(bulkChange));
        expect(result).to.have.lengthOf(3);
        for (const [i, original] of originals.entries()) {
          failure(result[i], uniqueConstraintViolation);
          expect(await collection.document(original._key)).to.deep.equal(
            original,
          );
        }
        expect(await collection.count()).to.have.property("count", 4);
      });

      it("reports a repeated key in the same batch without creating extra documents", async () => {
        // Either repeated input may win across topologies; match the stored payload to the successful index.
        const data = [bulkData("repeated"), bulkChange("repeated")];
        const result = await collection.saveAll(data, { returnNew: true });
        expect(result).to.have.lengthOf(2);
        const stored = await collection.document("repeated");
        let successes = 0;
        let failures = 0;
        for (const [i, item] of result.entries()) {
          if ("error" in item) {
            failure(item, uniqueConstraintViolation);
            failures++;
          } else {
            const meta = success(item, "repeated");
            expect(stored).to.deep.equal({
              ...data[i],
              _id: meta._id,
              _rev: meta._rev,
            });
            expect(meta.new).to.deep.equal(stored);
            successes++;
          }
        }
        expect(successes).to.equal(1);
        expect(failures).to.equal(1);
        expect(await collection.count()).to.have.property("count", 2);
      });

      for (const overwriteMode of ["update", "replace"] as const) {
        it(
          "returns old and new documents with overwriteMode " + overwriteMode,
          async () => {
            // Old snapshots require overwrite mode: update keeps omitted fields, while replace removes them.
            const originals = await seed();
            const result = await collection.saveAll(keys.map(bulkChange), {
              overwriteMode,
              returnOld: true,
              returnNew: true,
            });
            expect(result).to.have.lengthOf(3);
            for (const [i, original] of originals.entries()) {
              const meta = success(result[i], original._key);
              const stored = await collection.document(original._key);
              expect(meta.old).to.deep.equal(original);
              expect(meta.new).to.deep.equal(stored);
              expect(stored).to.deep.equal({
                ...(overwriteMode === "update" ? original : {}),
                ...bulkChange(original._key),
                _id: original._id,
                _rev: meta._rev,
              });
              expect(meta._rev).not.to.equal(original._rev);
            }
            expect(await collection.count()).to.have.property("count", 4);
          },
        );
      }

      it("returns undefined when silent even with return options", async () => {
        // Both snapshot flags are enabled to prove silent suppresses the response while applying the overwrite.
        const originals = await seed();
        const result = await collection.saveAll(keys.map(bulkChange), {
          overwriteMode: "replace",
          silent: true,
          returnNew: true,
          returnOld: true,
        });
        expect(result).to.equal(undefined);
        for (const original of originals) {
          const stored = await collection.document(original._key);
          expect(stored).to.deep.equal({
            ...bulkChange(original._key),
            _id: original._id,
            _rev: stored._rev,
          });
          expect(stored._rev).not.to.equal(original._rev);
        }
        expect(await collection.count()).to.have.property("count", 4);
      });

      it("persists successful inserts in a silent batch containing a duplicate", async () => {
        // Silent hides the error array, so reads must prove fresh inserts persisted and the duplicate survived.
        const [original] = await seed(["first"]);
        expect(
          await collection.saveAll(keys.map(bulkChange), { silent: true }),
        ).to.equal(undefined);
        for (const key of ["third", "second"]) {
          const stored = await collection.document(key);
          success(stored, key);
          expect(stored).to.deep.equal({
            ...bulkChange(key),
            _id: stored._id,
            _rev: stored._rev,
          });
        }
        expect(await collection.document("first")).to.deep.equal(original);
        expect(await collection.count()).to.have.property("count", 4);
      });
    });

    // Both methods have the same batch result contract; their persisted states differ.
    for (const method of ["replaceAll", "updateAll"] as const) {
      describe("documentCollection." + method, () => {
        function expected(original: Document, revision: string) {
          return {
            ...(method === "updateAll" ? original : {}),
            ...bulkChange(original._key),
            _id: original._id,
            _rev: revision,
          };
        }

        it("changes documents in input order", async () => {
          // Replacement drops omitted fields; patching preserves them. Both must retain identity and input order.
          const originals = await seed();
          const data = keys.map(bulkChange);
          const result = await collection[method](data);
          expect(result).to.have.lengthOf(3);
          for (const [i, original] of originals.entries()) {
            const meta = success(result[i], original._key);
            expect(meta).not.to.have.property("new");
            expect(meta).not.to.have.property("old");
            expect(meta._rev).not.to.equal(original._rev);
            expect(await collection.document(original._key)).to.deep.equal(
              expected(original, meta._rev),
            );
          }
          expect(await collection.count()).to.have.property("count", 4);
        });

        it("accepts an empty batch without modifying documents", async () => {
          // Seed real targets so an empty batch proves existing data and revisions remain unchanged.
          const originals = await seed();
          expect(await collection[method]([])).to.deep.equal([]);
          for (const original of originals) {
            expect(await collection.document(original._key)).to.deep.equal(
              original,
            );
          }
          expect(await collection.count()).to.have.property("count", 4);
        });

        it("returns per-document errors when every target is missing", async () => {
          // All missing targets must produce individual errors without accidentally creating documents.
          const result = await collection[method](keys.map(bulkChange));
          expect(result).to.have.lengthOf(3);
          for (const [i, key] of keys.entries()) {
            failure(result[i], DOCUMENT_NOT_FOUND);
            expect(await collection.documentExists(key)).to.equal(false);
          }
          expect(await collection.count()).to.have.property("count", 1);
        });

        it("returns a missing-document error between successful changes", async () => {
          // Leave input index 1 missing; successful snapshots must stay at indices 0 and 2.
          const originals = await seed(["third", "second"]);
          const result = await collection[method](keys.map(bulkChange), {
            returnOld: true,
            returnNew: true,
          });
          expect(result).to.have.lengthOf(3);
          failure(result[1], DOCUMENT_NOT_FOUND);
          for (const [i, original] of originals.entries()) {
            const meta = success(result[i === 0 ? 0 : 2], original._key);
            const stored = await collection.document(original._key);
            expect(meta.old).to.deep.equal(original);
            expect(meta.new).to.deep.equal(stored);
            expect(stored).to.deep.equal(expected(original, meta._rev));
          }
          expect(await collection.documentExists("first")).to.equal(false);
          expect(await collection.count()).to.have.property("count", 3);
        });

        it("checks each revision while preserving conflicts and missing results in order", async () => {
          // An intervening write makes only the middle revision stale; expect success, conflict, missing, success.
          const originals = await seed();
          await collection.update("first", { something: "intervening-change" });
          const current = await collection.document("first");
          const result = await collection[method](
            [
              { ...bulkChange("third"), _rev: originals[0]._rev },
              { ...bulkChange("first"), _rev: originals[1]._rev },
              bulkChange("missing"),
              { ...bulkChange("second"), _rev: originals[2]._rev },
            ],
            { ignoreRevs: false, returnOld: true, returnNew: true },
          );
          expect(result).to.have.lengthOf(4);
          failure(result[1], ERROR_ARANGO_CONFLICT);
          failure(result[2], DOCUMENT_NOT_FOUND);
          for (const [i, original] of [originals[0], originals[2]].entries()) {
            const meta = success(result[i === 0 ? 0 : 3], original._key);
            const stored = await collection.document(original._key);
            expect(meta.old).to.deep.equal(original);
            expect(meta.new).to.deep.equal(stored);
            expect(meta._rev).not.to.equal(original._rev);
            expect(stored).to.deep.equal(expected(original, meta._rev));
          }
          expect(await collection.document("first")).to.deep.equal(current);
          expect(await collection.documentExists("missing")).to.equal(false);
          expect(await collection.count()).to.have.property("count", 4);
        });

        it("ignores stale revisions when explicitly requested", async () => {
          // Reuse a real stale revision with checks disabled to distinguish ignoreRevs from conflict handling.
          const [original] = await seed(["first"]);
          await collection.update("first", { something: "intervening-change" });
          const current = await collection.document("first");
          const result = await collection[method](
            [{ ...bulkChange("first"), _rev: original._rev }],
            { ignoreRevs: true },
          );
          expect(result).to.have.lengthOf(1);
          const meta = success(result[0], "first");
          expect(meta._rev).not.to.equal(current._rev);
          expect(await collection.document("first")).to.deep.equal(
            expected(current, meta._rev),
          );
        });

        for (const options of [
          { returnNew: true },
          { returnOld: true },
          { returnOld: true, returnNew: true },
        ]) {
          it("honors return options " + JSON.stringify(options), async () => {
            // Exercise each snapshot flag alone and together; unrequested snapshots must remain absent.
            const originals = await seed();
            const result = await collection[method](
              keys.map(bulkChange),
              options,
            );
            expect(result).to.have.lengthOf(3);
            for (const [i, original] of originals.entries()) {
              const meta = success(result[i], original._key);
              const stored = await collection.document(original._key);
              expect(stored).to.deep.equal(expected(original, meta._rev));
              expect(meta._rev).not.to.equal(original._rev);
              if (options.returnOld) expect(meta.old).to.deep.equal(original);
              else expect(meta).not.to.have.property("old");
              if (options.returnNew) expect(meta.new).to.deep.equal(stored);
              else expect(meta).not.to.have.property("new");
            }
          });
        }

        it("returns undefined when silent even with return options", async () => {
          // With both return flags enabled, silent must still yield undefined and persist every change.
          const originals = await seed();
          expect(
            await collection[method](keys.map(bulkChange), {
              silent: true,
              returnOld: true,
              returnNew: true,
            }),
          ).to.equal(undefined);
          for (const original of originals) {
            const stored = await collection.document(original._key);
            expect(stored._rev).not.to.equal(original._rev);
            expect(stored).to.deep.equal(expected(original, stored._rev));
          }
          expect(await collection.count()).to.have.property("count", 4);
        });

        it("persists successful changes in a silent batch containing a missing target", async () => {
          // Without response metadata, verify successful writes directly and confirm the missing target stays absent.
          const originals = await seed(["third", "second"]);
          expect(
            await collection[method](keys.map(bulkChange), { silent: true }),
          ).to.equal(undefined);
          for (const original of originals) {
            const stored = await collection.document(original._key);
            expect(stored._rev).not.to.equal(original._rev);
            expect(stored).to.deep.equal(expected(original, stored._rev));
          }
          expect(await collection.documentExists("first")).to.equal(false);
          expect(await collection.count()).to.have.property("count", 3);
        });
        if (method === "updateAll") {
          for (const keepNull of [true, false]) {
            it(
              "preserves unmodified fields with keepNull " + keepNull,
              async () => {
                // Patch only the nullable field; keepNull controls removal while all other fields must survive.
                const originals = await seed();
                const result = await collection.updateAll(
                  keys.map((_key) => ({ _key, empty: null })),
                  { keepNull, returnNew: true },
                );
                expect(result).to.have.lengthOf(3);
                for (const [i, original] of originals.entries()) {
                  const meta = success(result[i], original._key);
                  const retained = { ...original };
                  delete retained.empty;
                  const stored = await collection.document(original._key);
                  expect(stored).to.deep.equal({
                    ...retained,
                    ...(keepNull ? { empty: null } : {}),
                    _rev: meta._rev,
                  });
                  expect(meta._rev).not.to.equal(original._rev);
                  expect(meta.new).to.deep.equal(stored);
                }
              },
            );
          }
        }
      });
    }

    describe("documentCollection.removeAll", () => {
      it("removes keys, full handles and object selectors in input order", async () => {
        // Mix key strings, full handles, and key objects; removal metadata must follow selector order.
        const originals = await seed();
        const result = await collection.removeAll([
          originals[0]._key,
          originals[1]._id,
          { _key: originals[2]._key },
        ]);
        expect(result).to.have.lengthOf(3);
        for (const [i, original] of originals.entries()) {
          const meta = success(result[i], original._key);
          expect(meta._rev).to.equal(original._rev);
          expect(meta).not.to.have.property("old");
          expect(await collection.documentExists(original._key)).to.equal(
            false,
          );
        }
        expect(await collection.count()).to.have.property("count", 1);
      });

      it("accepts an empty batch without removing documents", async () => {
        // An empty delete batch must leave every seeded target and its revision untouched.
        const originals = await seed();
        expect(await collection.removeAll([])).to.deep.equal([]);
        for (const original of originals) {
          expect(await collection.document(original._key)).to.deep.equal(
            original,
          );
        }
        expect(await collection.count()).to.have.property("count", 4);
      });

      it("returns per-document errors when every target is missing", async () => {
        // An all-missing delete batch should resolve to per-item errors rather than rejecting the request.
        const result = await collection.removeAll(keys);
        expect(result).to.have.lengthOf(3);
        for (const [i, key] of keys.entries()) {
          failure(result[i], DOCUMENT_NOT_FOUND);
          expect(await collection.documentExists(key)).to.equal(false);
        }
        expect(await collection.count()).to.have.property("count", 1);
      });

      it("returns old documents around a missing-document error", async () => {
        // The absent middle selector must not shift the surrounding old snapshots or prevent deletions.
        const originals = await seed(["third", "second"]);
        const result = await collection.removeAll(keys, { returnOld: true });
        expect(result).to.have.lengthOf(3);
        failure(result[1], DOCUMENT_NOT_FOUND);
        for (const [i, original] of originals.entries()) {
          const meta = success(result[i === 0 ? 0 : 2], original._key);
          expect(meta._rev).to.equal(original._rev);
          expect(meta.old).to.deep.equal(original);
        }
        for (const key of keys)
          expect(await collection.documentExists(key)).to.equal(false);
        expect(await collection.count()).to.have.property("count", 1);
      });

      it("checks revisions per selector and leaves conflicting documents unchanged", async () => {
        // Make one selector stale, then prove current revisions delete successfully while the conflict survives.
        const originals = await seed();
        await collection.update("first", { something: "intervening-change" });
        const current = await collection.document("first");
        const result = await collection.removeAll(
          [
            { _key: "third", _rev: originals[0]._rev },
            { _key: "first", _rev: originals[1]._rev },
            { _key: "missing" },
            { _key: "second", _rev: originals[2]._rev },
          ],
          { ignoreRevs: false, returnOld: true },
        );
        expect(result).to.have.lengthOf(4);
        failure(result[1], ERROR_ARANGO_CONFLICT);
        failure(result[2], DOCUMENT_NOT_FOUND);
        for (const [i, original] of [originals[0], originals[2]].entries()) {
          const meta = success(result[i === 0 ? 0 : 3], original._key);
          expect(meta._rev).to.equal(original._rev);
          expect(meta.old).to.deep.equal(original);
          expect(await collection.documentExists(original._key)).to.equal(
            false,
          );
        }
        expect(await collection.document("first")).to.deep.equal(current);
        expect(await collection.documentExists("missing")).to.equal(false);
        expect(await collection.count()).to.have.property("count", 2);
      });

      it("ignores stale selector revisions when explicitly requested", async () => {
        // Ignoring a stale selector revision must delete the current document and return its latest old snapshot.
        const [original] = await seed(["first"]);
        await collection.update("first", { something: "intervening-change" });
        const current = await collection.document("first");
        const result = await collection.removeAll(
          [{ _key: "first", _rev: original._rev }],
          { ignoreRevs: true, returnOld: true },
        );
        expect(result).to.have.lengthOf(1);
        const meta = success(result[0], "first");
        expect(meta._rev).to.equal(current._rev);
        expect(meta.old).to.deep.equal(current);
        expect(await collection.documentExists("first")).to.equal(false);
      });

      it("returns complete old documents in input order", async () => {
        // Compare each old snapshot with the captured original and independently confirm its deletion.
        const originals = await seed();
        const result = await collection.removeAll(keys, { returnOld: true });
        expect(result).to.have.lengthOf(3);
        for (const [i, original] of originals.entries()) {
          const meta = success(result[i], original._key);
          expect(meta.old).to.deep.equal(original);
          expect(await collection.documentExists(original._key)).to.equal(
            false,
          );
        }
        expect(await collection.count()).to.have.property("count", 1);
      });

      it("returns undefined when silent even with returnOld", async () => {
        // Enable returnOld to prove silent takes precedence; absence checks verify the actual deletions.
        await seed();
        expect(
          await collection.removeAll(keys, { silent: true, returnOld: true }),
        ).to.equal(undefined);
        for (const key of keys)
          expect(await collection.documentExists(key)).to.equal(false);
        expect(await collection.count()).to.have.property("count", 1);
      });

      it("persists successful removals in a silent batch containing a missing target", async () => {
        // Silent provides no item results, so verify successful deletions and the final collection count.
        await seed(["third", "second"]);
        expect(await collection.removeAll(keys, { silent: true })).to.equal(
          undefined,
        );
        for (const key of keys)
          expect(await collection.documentExists(key)).to.equal(false);
        expect(await collection.count()).to.have.property("count", 1);
      });
    });
  });
});
