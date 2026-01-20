import { expect } from "chai";
import { aql } from "../aql.js";
import { Database } from "../databases.js";
import { config } from "./_config.js";

describe("Content-Length Header", () => {
  describe("with string bodies (JSON)", () => {
    it("should set content-length for db.query with object body", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ body, headers }: any) => {
            expect(headers.has("content-length")).to.be.true;
            const contentLength = headers.get("content-length");
            expect(contentLength).to.be.a("string");
            expect(Number(contentLength)).to.be.greaterThan(0);
            // Verify body is a string (JSON.stringify result)
            expect(typeof body).to.equal("string");
            // Verify content-length matches actual body length
            const bodyLength =
              typeof globalThis.Buffer !== "undefined" &&
              globalThis.Buffer.byteLength
                ? globalThis.Buffer.byteLength(body, "utf8")
                : new TextEncoder().encode(body).length;
            expect(Number(contentLength)).to.equal(bodyLength);
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      const query = aql`
        FOR s IN [1..4]
        RETURN s
      `;
      db.query(query).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });

    it("should set content-length for string body", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ body, headers }: any) => {
            expect(headers.has("content-length")).to.be.true;
            const contentLength = headers.get("content-length");
            expect(Number(contentLength)).to.be.greaterThan(0);
            // Verify content-length matches actual body length
            const bodyLength =
              typeof globalThis.Buffer !== "undefined" &&
              globalThis.Buffer.byteLength
                ? globalThis.Buffer.byteLength(body, "utf8")
                : new TextEncoder().encode(body).length;
            expect(Number(contentLength)).to.equal(bodyLength);
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: "test string body",
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });
  });

  describe("with FormData/Blob bodies", () => {
    it("should set content-length for FormData body", async () => {
      const db = new Database();
      let capturedHeaders: Headers | null = null;
      (db as any)._connection._hosts = [
        {
          fetch: async ({ body, headers }: any) => {
            capturedHeaders = headers;
            // FormData is converted to Blob, so body should be a Blob
            expect(body).to.be.instanceof(Blob);
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      const form = new FormData();
      form.append("test", "value");
      await db.request({
        method: "POST",
        pathname: "/_api/test",
        body: form,
      });
      expect(capturedHeaders).to.not.be.null;
      expect(capturedHeaders!.has("content-length")).to.be.true;
      const contentLength = capturedHeaders!.get("content-length");
      expect(Number(contentLength)).to.be.greaterThan(0);
    });
  });

  describe("with Buffer bodies (isBinary: true)", () => {
    it("should set content-length for Buffer body", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ body, headers }: any) => {
            expect(headers.has("content-length")).to.be.true;
            const contentLength = headers.get("content-length");
            // For Buffer, content-length should match buffer.length
            if (
              typeof globalThis.Buffer !== "undefined" &&
              globalThis.Buffer.isBuffer &&
              globalThis.Buffer.isBuffer(body)
            ) {
              expect(Number(contentLength)).to.equal(body.length);
            }
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      const buffer =
        typeof globalThis.Buffer !== "undefined"
          ? globalThis.Buffer.from("test buffer data", "utf8")
          : new TextEncoder().encode("test buffer data");
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: buffer,
        isBinary: true,
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });

    it("should set content-length for Blob body with isBinary", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ body, headers }: any) => {
            expect(headers.has("content-length")).to.be.true;
            const contentLength = headers.get("content-length");
            // For Blob, content-length should match blob.size
            if (body instanceof Blob) {
              expect(Number(contentLength)).to.equal(body.size);
            }
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      const blob = new Blob(["test blob data"], { type: "application/octet-stream" });
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: blob,
        isBinary: true,
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });
  });

  describe("respecting manual content-length", () => {
    it("should not override manually set content-length header", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ headers }: any) => {
            const contentLength = headers.get("content-length");
            // Should use the manually set value, not calculate it
            expect(contentLength).to.equal("9999");
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: { test: "data" },
        headers: {
          "content-length": "9999",
        },
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });
  });

  describe("with empty bodies", () => {
    it("should set content-length: 0 for empty string body", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ body, headers }: any) => {
            expect(body).to.equal("");
            expect(headers.has("content-length")).to.be.true;
            const contentLength = headers.get("content-length");
            expect(contentLength).to.equal("0");
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: "",
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });

    it("should set content-length: 0 for null body on POST", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ headers }: any) => {
            expect(headers.has("content-length")).to.be.true;
            const contentLength = headers.get("content-length");
            expect(contentLength).to.equal("0");
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: null,
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });

    it("should set content-length: 0 for undefined body on PUT", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ headers }: any) => {
            expect(headers.has("content-length")).to.be.true;
            const contentLength = headers.get("content-length");
            expect(contentLength).to.equal("0");
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      db.request({
        method: "PUT",
        pathname: "/_api/test",
        body: undefined,
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });

    it("should set content-length: 0 for null body on PATCH", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ headers }: any) => {
            expect(headers.has("content-length")).to.be.true;
            const contentLength = headers.get("content-length");
            expect(contentLength).to.equal("0");
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      db.request({
        method: "PATCH",
        pathname: "/_api/test",
        body: null,
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });

    it("should not set content-length for null body on GET", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ headers }: any) => {
            // GET requests with no body should not have content-length
            expect(headers.has("content-length")).to.be.false;
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      db.request({
        method: "GET",
        pathname: "/_api/test",
        body: null,
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });

    it("should handle empty object body correctly", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ body, headers }: any) => {
            expect(body).to.equal("{}");
            expect(headers.has("content-length")).to.be.true;
            const contentLength = headers.get("content-length");
            // Empty object JSON.stringify'd is "{}" which is 2 bytes
            expect(Number(contentLength)).to.equal(2);
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: {},
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });

    it("should handle empty array body correctly", (done) => {
      const db = new Database();
      (db as any)._connection._hosts = [
        {
          fetch: async ({ body, headers }: any) => {
            expect(body).to.equal("[]");
            expect(headers.has("content-length")).to.be.true;
            const contentLength = headers.get("content-length");
            // Empty array JSON.stringify'd is "[]" which is 2 bytes
            expect(Number(contentLength)).to.equal(2);
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
          close: () => {},
        },
      ];
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: [],
      }).catch(() => {
        // Ignore errors, we're just testing headers
      });
    });
  });

  describe("integration with real API calls", function () {
    const dbName = `testdb_${Date.now()}`;
    let system: Database, db: Database;
    before(async () => {
      system = new Database(config);
      if (Array.isArray(config.url)) await system.acquireHostList();
      await system.createDatabase(dbName);
      db = system.database(dbName);
      if (Array.isArray(config.url)) {
        await db.waitForPropagation({ pathname: `/_api/version` }, 10000);
      }
    });
    after(async () => {
      try {
        await system.dropDatabase(dbName);
      } finally {
        system.close();
      }
    });

    it("should work with db.query (most common use case)", async () => {
      const query = aql`
        FOR s IN [1..4]
        RETURN s
      `;
      const cursor = await db.query(query);
      const results = [];
      for await (const item of cursor) {
        results.push(item);
      }
      expect(typeof(results)).to.eql('object');
    });

    it("should work with document operations", async () => {
      const collection = await db.createCollection(`test-${Date.now()}`);
      try {
        const doc = await collection.save({ name: "test", value: 123 });
        expect(doc).to.have.property("_key");
        expect(doc).to.have.property("_id");
      } finally {
        await collection.drop();
      }
    });

    it("should work with collection.import using Buffer", async () => {
      const collection = await db.createCollection(`test-${Date.now()}`);
      try {
        // In Node.js test environment, Buffer is always available
        const data = Buffer.from(
          JSON.stringify({ _key: "test1", name: "test" }) + "\n",
          "utf8",
        );
        const result = await collection.import(data, { type: "documents" });
        expect(result).to.have.property("created", 1);
        expect(result).to.have.property("error", false);
      } finally {
        await collection.drop();
      }
    });

    it("should work with collection.import using Blob", async () => {
      const collection = await db.createCollection(`test-${Date.now()}`);
      try {
        const data = new Blob(
          [JSON.stringify({ _key: "test1", name: "test" }) + "\n"],
          { type: "application/json" },
        );
        const result = await collection.import(data, { type: "documents" });
        expect(result).to.have.property("created", 1);
        expect(result).to.have.property("error", false);
      } finally {
        await collection.drop();
      }
    });
  });
});
