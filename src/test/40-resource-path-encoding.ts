import { expect } from "chai";
import { Database } from "../databases.js";

/*
 * Prevent '?' and '#' in collection names from becoming a URL query or fragment.
 * Simulated Fetch responses let these tests check final URLs without a server.
 * Extended names are opt-in since ArangoDB 3.11.0 (--database.extended-names)
 * and enabled by default since 3.12.0. (DE-1273)
 */
describe("Resource path encoding", () => {
  let db: Database;
  let originalFetch: typeof globalThis.fetch;
  let requests: Request[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    requests = [];
    globalThis.fetch = async (input) => {
      const request = input as Request;
      requests.push(request);
      return new Response(
        request.method === "HEAD"
          ? null
          : JSON.stringify({ vertex: {}, edge: {} }),
        { headers: { "content-type": "application/json" } },
      );
    };
    db = new Database({ url: "http://localhost:8529", maxRetries: 0 });
  });

  afterEach(() => {
    db.close();
    globalThis.fetch = originalFetch;
  });

  it("encodes the collection name in single-document requests", async () => {
    const collection = db.collection("abc?tag#part");

    await collection.document("key");
    await collection.documentExists({ _key: "key" });
    await collection.update("abc?tag#part/key", { value: 1 });
    await collection.replace({ _id: "abc?tag#part/key" }, { value: 2 });
    await collection.remove("key");

    expect(requests.map((request) => request.method)).to.deep.equal([
      "GET",
      "HEAD",
      "PATCH",
      "PUT",
      "DELETE",
    ]);
    for (const request of requests) {
      expect(request.url).to.equal(
        "http://localhost:8529/_db/_system/_api/document/abc%3Ftag%23part/key",
      );
    }
    expect(collection.documentId("key")).to.equal("abc?tag#part/key");
  });

  it("encodes the collection name in graph vertex requests", async () => {
    const vertices = db.graph("graph").vertexCollection("abc?tag#part");

    await vertices.vertex("key");
    // This checks the HEAD URL; it does not require server support for HEAD.
    await vertices.vertexExists("key");
    await vertices.update("key", { value: 1 });
    await vertices.replace("key", { value: 2 });
    await vertices.remove("key");

    expect(requests.map((request) => request.method)).to.deep.equal([
      "GET",
      "HEAD",
      "PATCH",
      "PUT",
      "DELETE",
    ]);
    for (const request of requests) {
      expect(request.url).to.equal(
        "http://localhost:8529/_db/_system/_api/gharial/graph/vertex/abc%3Ftag%23part/key",
      );
    }
  });

  it("encodes the collection name in graph edge requests", async () => {
    const edges = db.graph("graph").edgeCollection("abc?tag#part");

    await edges.edge("key");
    await edges.edgeExists("key");
    await edges.update("key", { value: 1 });
    await edges.replace("key", { _from: "vertices/a", _to: "vertices/b" });
    await edges.remove("key");

    expect(requests.map((request) => request.method)).to.deep.equal([
      "GET",
      "HEAD",
      "PATCH",
      "PUT",
      "DELETE",
    ]);
    for (const request of requests) {
      expect(request.url).to.equal(
        "http://localhost:8529/_db/_system/_api/gharial/graph/edge/abc%3Ftag%23part/key",
      );
    }
  });

  it("encodes the collection name in index requests", async () => {
    const collection = db.collection("abc?tag#part");

    await collection.index("123");
    await collection.dropIndex({ id: "abc?tag#part/123" });

    expect(requests.map((request) => request.method)).to.deep.equal([
      "GET",
      "DELETE",
    ]);
    for (const request of requests) {
      expect(request.url).to.equal(
        "http://localhost:8529/_db/_system/_api/index/abc%3Ftag%23part/123",
      );
    }
  });

  it("encodes question marks, hashes, spaces, percent sequences, and Unicode", async () => {
    const names = [
      ["abc?tag", "abc%3Ftag"],
      ["abc#part", "abc%23part"],
      ["abc space", "abc%20space"],
      ["abc%3F%2Fpart", "abc%253F%252Fpart"],
      ["Espa\u00f1a", "Espa%C3%B1a"],
      ["ordinary", "ordinary"],
    ];

    for (const [name, encodedName] of names) {
      await db.collection(name).document("key");

      expect(requests[requests.length - 1].url).to.equal(
        "http://localhost:8529/_db/_system/_api/document/" +
          encodedName +
          "/key",
      );
    }
  });

  it("keeps query options separate from the collection name", async () => {
    await db
      .collection("abc?tag#part")
      .update("key", { value: 1 }, { waitForSync: false });

    expect(requests[0].url).to.equal(
      "http://localhost:8529/_db/_system/_api/document/abc%3Ftag%23part/key?waitForSync=false",
    );
  });

  it("rejects handles from another collection before sending a request", async () => {
    const collection = db.collection("abc?tag#part");
    const result = await collection
      .document("other/key")
      .catch((error) => error);

    expect(result).to.be.instanceOf(Error);
    expect(result.message).to.include("does not match collection name");
    expect(() => collection.index("other/123")).to.throw(
      "does not match collection name",
    );
    expect(requests).to.have.lengthOf(0);
  });
});
