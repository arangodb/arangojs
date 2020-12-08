import { expect } from "chai";
import { DocumentCollection } from "../collection";
import { Database } from "../database";
import { Transaction } from "../transaction";
import { config } from "./_config";

const describe35 = config.arangoVersion! >= 30500 ? describe : describe.skip;
const itRdb = process.env.ARANGO_STORAGE_ENGINE !== "mmfiles" ? it : it.skip;

describe("Transactions", () => {
  let db: Database;
  before(async () => {
    db = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") await db.acquireHostList();
  });
  after(() => {
    db.close();
  });
  describe("database.executeTransaction", () => {
    it("should execute a transaction and return the result", async () => {
      const result = await db.executeTransaction(
        [],
        "function (params) {return params;}",
        { params: "test" }
      );
      expect(result).to.equal("test");
    });
  });
  describe35("stream transactions", () => {
    const name = `testdb_${Date.now()}`;
    let collection: DocumentCollection;
    let allTransactions: Transaction[];
    before(async () => {
      allTransactions = [];
      await db.createDatabase(name);
      db.useDatabase(name);
    });
    after(async () => {
      await Promise.all(
        allTransactions.map((transaction) =>
          transaction.abort().catch(() => undefined)
        )
      );
      db.useDatabase("_system");
      await db.dropDatabase(name);
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
      } catch (e) {
        return;
      }
      await collection.drop();
    });

    it("can commit an empty transaction", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      {
        const { id, status } = await trx.get();
        expect(id).to.equal(trx.id);
        expect(status).to.equal("running");
      }
      {
        const trx2 = db.transaction(trx.id);
        const { id, status } = await trx2.get();
        expect(id).to.equal(trx.id);
        expect(status).to.equal("running");
      }
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
    });

    it("can abort an empty transaction", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const { id, status } = await trx.abort();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("aborted");
    });

    it("can insert a document", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const meta = await trx.step(() => collection.save({ _key: "test" }));
      expect(meta).to.have.property("_key", "test");
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
      const doc = await collection.document("test");
      expect(doc).to.have.property("_key", "test");
    });

    it("can insert two documents sequentially", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const meta1 = await trx.step(() => collection.save({ _key: "test1" }));
      const meta2 = await trx.step(() => collection.save({ _key: "test2" }));
      expect(meta1).to.have.property("_key", "test1");
      expect(meta2).to.have.property("_key", "test2");
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
      const doc1 = await collection.document("test1");
      expect(doc1).to.have.property("_key", "test1");
      const doc2 = await collection.document("test2");
      expect(doc2).to.have.property("_key", "test2");
    });

    itRdb("does not leak when inserting a document", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      await trx.step(() => collection.save({ _key: "test" }));
      let doc: any;
      try {
        doc = await collection.document("test");
      } catch (e) {}
      if (doc) expect.fail("Document should not exist yet.");
      const { id, status } = await trx.commit();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("committed");
    });

    itRdb(
      "does not leak when inserting two documents sequentially",
      async () => {
        const trx = await db.beginTransaction(collection);
        allTransactions.push(trx);
        await trx.step(() => collection.save({ _key: "test1" }));
        await trx.step(() => collection.save({ _key: "test2" }));
        let doc: any;
        try {
          doc = await collection.document("test1");
        } catch (e) {}
        if (doc) expect.fail("Document should not exist yet.");
        try {
          doc = await collection.document("test2");
        } catch (e) {}
        if (doc) expect.fail("Document should not exist yet.");
        const { id, status } = await trx.commit();
        expect(id).to.equal(trx.id);
        expect(status).to.equal("committed");
      }
    );

    it("does not insert a document when aborted", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const meta = await trx.step(() => collection.save({ _key: "test" }));
      expect(meta).to.have.property("_key", "test");
      const { id, status } = await trx.abort();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("aborted");
      let doc: any;
      try {
        doc = await collection.document("test");
      } catch (e) {}
      if (doc) expect.fail("Document should not exist yet.");
    });

    itRdb("does not revert unrelated changes when aborted", async () => {
      const trx = await db.beginTransaction(collection);
      allTransactions.push(trx);
      const meta = await collection.save({ _key: "test" });
      expect(meta).to.have.property("_key", "test");
      const { id, status } = await trx.abort();
      expect(id).to.equal(trx.id);
      expect(status).to.equal("aborted");
      const doc = await collection.document("test");
      expect(doc).to.have.property("_key", "test");
    });
  });
});
