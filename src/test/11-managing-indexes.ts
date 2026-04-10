import { expect } from "chai";
import { DocumentCollection } from "../collections.js";
import { Database } from "../databases.js";
import { InvertedIndexDescription } from "../indexes.js";
import { config } from "./_config.js";

const it312 = config.arangoVersion! >= 31200 ? it : it.skip;

/** ArangoDB 3.12.9+ vector index responses may include this (DE-1147). */
const VECTOR_TRAINING_STATES = [
  "unusable",
  "training",
  "ingesting",
  "ready",
] as const;

function expectTrainingStateIfPresent(info: {
  trainingState?: string | null;
}): void {
  if (
    info.trainingState !== undefined &&
    info.trainingState !== null
  ) {
    expect(VECTOR_TRAINING_STATES).to.include(info.trainingState);
  }
}

/**
 * Vector index tests need ArangoDB 3.12.4+ with `--vector-index` enabled.
 *
 * - By default the suite probes the server once: if creating a minimal vector
 *   index fails, all tests in this block are skipped.
 * - `TEST_ARANGO_VECTOR_INDEX=1` forces them to run (after the 3.12 version check).
 * - `TEST_ARANGO_VECTOR_INDEX=0` forces skip without probing.
 */
function resolveVectorIndexTestMode():
  | "run"
  | "skip"
  | "probe" {
  const v = process.env.TEST_ARANGO_VECTOR_INDEX;
  if (v === "0") return "skip";
  if (v === "1") return "run";
  return "probe";
}

describe("Managing indexes", function () {
  let system: Database, db: Database;
  let collection: DocumentCollection;
  const dbName = `testdb_${Date.now()}`;
  const collectionName = `collection-${Date.now()}`;
  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
    await system.createDatabase(dbName);
    db = system.database(dbName);
    collection = await db.createCollection(collectionName);
    await db.waitForPropagation(
      { pathname: `/_api/collection/${collection.name}` },
      10000,
    );
  });
  after(async () => {
    try {
      await system.dropDatabase(dbName);
    } finally {
      system.close();
    }
  });
  describe("collection.ensureIndex#vector", function () {
    let vectorIndexTestsEnabled = false;

    before(async function () {
      const mode = resolveVectorIndexTestMode();
      if (config.arangoVersion! < 31200 || mode === "skip") {
        vectorIndexTestsEnabled = false;
        return;
      }
      if (mode === "run") {
        vectorIndexTestsEnabled = true;
        return;
      }
      const probeName = `vector_probe_${Date.now()}`;
      const probeCol = await db.createCollection(probeName);
      try {
        await probeCol.import([{ _key: "probe", pv: Array(8).fill(0.1) }]);
        const res = await probeCol.ensureIndex({
          type: "vector",
          fields: ["pv"],
          sparse: true,
          params: {
            metric: "cosine",
            dimension: 8,
            nLists: 1,
          },
        });
        vectorIndexTestsEnabled =
          Boolean(res && typeof res === "object" && res.type === "vector" && res.id);
      } catch {
        vectorIndexTestsEnabled = false;
      } finally {
        try {
          await probeCol.drop();
        } catch {
          // ignore
        }
      }
    });

    function itVector(
      title: string,
      fn: (this: Mocha.Context) => Promise<void>,
    ) {
      it(title, async function (this: Mocha.Context) {
        if (!vectorIndexTestsEnabled) this.skip();
        await fn.call(this);
      });
    }

    itVector("should create a vector index", async () => {
      const data = Array.from({ length: 128 }, (_, cnt) => ({
        _key: `vb${cnt}`,
        vec_basic: Array(128).fill(cnt),
      }));
      await collection.import(data);
      const info = await collection.ensureIndex({
        type: "vector",
        fields: ["vec_basic"],
        sparse: true,
        params: {
          metric: "cosine",
          dimension: 128,
          nLists: 2,
        },
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "vector");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["vec_basic"]);
      expect(info).to.have.property("isNewlyCreated", true);
      expect(info).to.have.nested.property("params.metric", "cosine");
      expect(info).to.have.nested.property("params.dimension", 128);
      expect(info).to.have.nested.property("params.nLists", 2);
      expectTrainingStateIfPresent(info);
    });

    itVector(
      "should expose optional errorMessage on vector index responses (ArangoDB 3.12.9+)",
      async () => {
        const data = Array.from({ length: 128 }, (_, cnt) => ({
          _key: `ve${cnt}`,
          vec_err: Array(128).fill(cnt),
        }));
        await collection.import(data);
        const info = await collection.ensureIndex({
          type: "vector",
          fields: ["vec_err"],
          sparse: true,
          params: {
            metric: "cosine",
            dimension: 128,
            nLists: 2,
          },
        });
        expect(info).to.have.property("type", "vector");
        if (info.errorMessage !== undefined) {
          expect(info.errorMessage).to.be.a("string");
        }
      },
    );

    itVector("should create a vector index with storedValues", async () => {
      const data = Array.from({ length: 128 }, (_, cnt) => ({
        _key: `vs${cnt}`,
        vec_sv: Array(128).fill(cnt),
        val: cnt,
        category: `cat${cnt % 5}`,
      }));
      await collection.import(data);
      const info = await collection.ensureIndex({
        type: "vector",
        fields: ["vec_sv"],
        storedValues: ["val", "category"],
        sparse: true,
        params: {
          metric: "cosine",
          dimension: 128,
          nLists: 2,
        },
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "vector");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["vec_sv"]);
      expect(info).to.have.property("storedValues");
      expect(info.storedValues).to.eql(["val", "category"]);
      expect(info).to.have.property("isNewlyCreated", true);
      expect(info).to.have.nested.property("params.metric", "cosine");
      expect(info).to.have.nested.property("params.dimension", 128);
      expect(info).to.have.nested.property("params.nLists", 2);
      expectTrainingStateIfPresent(info);
    });

    itVector("should create a vector index with innerProduct metric", async () => {
      const data = Array.from({ length: 128 }, (_, cnt) => ({
        _key: `vi${cnt}`,
        vec_ip: Array(128).fill(cnt),
      }));
      await collection.import(data);
      const info = await collection.ensureIndex({
        type: "vector",
        fields: ["vec_ip"],
        sparse: true,
        params: {
          metric: "innerProduct",
          dimension: 128,
          nLists: 2,
        },
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "vector");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["vec_ip"]);
      expect(info).to.have.property("isNewlyCreated", true);
      expect(info).to.have.nested.property("params.metric", "innerProduct");
      expect(info).to.have.nested.property("params.dimension", 128);
      expect(info).to.have.nested.property("params.nLists", 2);
      expectTrainingStateIfPresent(info);
    });
  });
  describe("collection.ensureIndex#persistent", () => {
    it("should create a persistent index", async () => {
      const info = await collection.ensureIndex({
        type: "persistent",
        fields: ["value"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "persistent");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.ensureIndex#geo", () => {
    it("should create a geo index for one field", async () => {
      const info = await collection.ensureIndex({
        type: "geo",
        fields: ["value"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "geo");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
    it("should create a geo index for two fields", async () => {
      const info = await collection.ensureIndex({
        type: "geo",
        fields: ["value1", "value2"],
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "geo");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["value1", "value2"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.ensureIndex#mdi", () => {
    it312("should create an MDI index", async () => {
      const info = await collection.ensureIndex({
        type: "mdi",
        fields: ["x", "y", "z"],
        fieldValueTypes: "double",
        sparse: true
      });
      expect(info).to.have.property("id");
      expect(info).to.have.property("type", "mdi");
      expect(info).to.have.property("fields");
      expect(info.fields).to.eql(["x", "y", "z"]);
      expect(info).to.have.property("isNewlyCreated", true);
    });
  });
  describe("collection.index", () => {
    it("should return information about a index", async () => {
      const info = await collection.ensureIndex({
        type: "persistent",
        fields: ["test"],
      });
      const index = await collection.index(info.id);
      expect(index).to.have.property("id", info.id);
      expect(index).to.have.property("type", info.type);
    });
  });
  describe("collection.indexes", () => {
    it("should return a list of indexes", async () => {
      const index = await collection.ensureIndex({
        type: "persistent",
        fields: ["test"],
      });
      const indexes = await collection.indexes();
      expect(indexes).to.be.instanceof(Array);
      expect(indexes).to.not.be.empty;
      expect(indexes.filter((i: any) => i.id === index.id).length).to.equal(1);
    });
  });
  describe("collection.dropIndex", () => {
    it("should drop existing index", async () => {
      const info = await collection.ensureIndex({
        type: "persistent",
        fields: ["test"],
      });
      const index = await collection.dropIndex(info.id);
      expect(index).to.have.property("id", info.id);
      const indexes = await collection.indexes();
      expect(indexes).to.be.instanceof(Array);
      expect(indexes).to.not.be.empty;
      expect(indexes.filter((i: any) => i.id === index.id).length).to.equal(0);
    });
  });
  describe("collection.ensureIndex#inverted", () => {
    it312(
      "should create an inverted index with new consolidation policy options",
      async () => {
        const info = await collection.ensureIndex({
          type: "inverted",
          fields: ["value"],
          consolidationPolicy: {
            type: "tier",
            maxSkewThreshold: 0.5,
            minDeletionRatio: 0.6,
          },
        });
        expect(info).to.have.property("id");
        expect(info).to.have.property("type", "inverted");
        expect(info).to.have.property("fields");
        expect(info.fields).to.be.an("array");
        expect(info).to.have.property("isNewlyCreated", true);
        const index = (await collection.index(info.id)) as InvertedIndexDescription;
        expect(index).to.have.property("consolidationPolicy");
        expect(index.consolidationPolicy).to.have.property("type", "tier");
        // Server may return the new fields or may omit them if using defaults
        // We just verify the index was created successfully with the new options
      },
    );
  });
});
