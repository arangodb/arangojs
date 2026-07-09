import { expect } from "chai";
import { Database } from "../databases.js";

function withMockHost(
  db: Database,
  assert: (headers: Headers, body: unknown) => void,
) {
  (db as any)._connection._hosts = [
    {
      fetch: async ({ body, headers }: any) => {
        assert(headers, body);
        return new Response(JSON.stringify({ result: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
      close: () => {},
    },
  ];
}

function utf8ByteLength(value: string): number {
  return typeof globalThis.Buffer !== "undefined" && globalThis.Buffer.byteLength
    ? globalThis.Buffer.byteLength(value, "utf8")
    : new TextEncoder().encode(value).length;
}

describe("Content-Length Header", () => {
  describe("default (forceContentLength false)", () => {
    it("does not set content-length for JSON bodies", (done) => {
      const db = new Database();
      withMockHost(db, (headers) => {
        expect(headers.has("content-length")).to.be.false;
        done();
      });
      db.request({
        method: "POST",
        pathname: "/_api/cursor",
        body: { query: "RETURN 1" },
      }).catch(() => {});
    });

    it("does not set content-length for FormData bodies", async () => {
      const db = new Database();
      let capturedHeaders: Headers | null = null;
      withMockHost(db, (headers, body) => {
        capturedHeaders = headers;
        expect(body).to.be.instanceof(Blob);
      });
      const form = new FormData();
      form.append("test", "value");
      await db.request({ method: "POST", pathname: "/_api/test", body: form });
      expect(capturedHeaders!.has("content-length")).to.be.false;
    });

    it("does not set content-length for bodyless POST", (done) => {
      const db = new Database();
      withMockHost(db, (headers) => {
        expect(headers.has("content-length")).to.be.false;
        done();
      });
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: null,
      }).catch(() => {});
    });
  });

  describe("forceContentLength true", () => {
    it("sets content-length for JSON bodies", (done) => {
      const db = new Database({ forceContentLength: true });
      withMockHost(db, (headers, body) => {
        expect(headers.get("content-length")).to.equal(
          String(utf8ByteLength(body as string)),
        );
        done();
      });
      db.request({
        method: "POST",
        pathname: "/_api/cursor",
        body: { query: "RETURN 1" },
      }).catch(() => {});
    });

    it("sets content-length for FormData bodies", async () => {
      const db = new Database({ forceContentLength: true });
      let capturedHeaders: Headers | null = null;
      let capturedBody: Blob | null = null;
      withMockHost(db, (headers, body) => {
        capturedHeaders = headers;
        capturedBody = body as Blob;
      });
      const form = new FormData();
      form.append("test", "value");
      await db.request({ method: "POST", pathname: "/_api/test", body: form });
      expect(capturedHeaders!.get("content-length")).to.equal(
        String(capturedBody!.size),
      );
    });

    it("sets content-length for binary bodies", (done) => {
      const db = new Database({ forceContentLength: true });
      withMockHost(db, (headers, body) => {
        const buffer =
          typeof globalThis.Buffer !== "undefined" &&
          globalThis.Buffer.isBuffer(body)
            ? body
            : null;
        expect(buffer).to.not.be.null;
        expect(headers.get("content-length")).to.equal(String(buffer!.length));
        done();
      });
      const buffer =
        typeof globalThis.Buffer !== "undefined"
          ? globalThis.Buffer.from("test buffer data", "utf8")
          : new TextEncoder().encode("test buffer data");
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: buffer,
        isBinary: true,
      }).catch(() => {});
    });

    it("sets content-length to 0 for bodyless POST", (done) => {
      const db = new Database({ forceContentLength: true });
      withMockHost(db, (headers) => {
        expect(headers.get("content-length")).to.equal("0");
        done();
      });
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: null,
      }).catch(() => {});
    });

    it("does not override a manually set content-length header", (done) => {
      const db = new Database({ forceContentLength: true });
      withMockHost(db, (headers) => {
        expect(headers.get("content-length")).to.equal("9999");
        done();
      });
      db.request({
        method: "POST",
        pathname: "/_api/test",
        body: { test: "data" },
        headers: { "content-length": "9999" },
      }).catch(() => {});
    });
  });
});
