import { expect } from "chai";
import { Database } from "../index.js";
import { config } from "./_config.js";

describe("agentOptions with undici", () => {
  it("uses undici.Request with undici.fetch", async () => {
    const db = new Database({
      url: "http://127.0.0.1:8529",
      agentOptions: { keepAliveTimeout: 30000 },
    });

    try {
      await db.version();
    } catch (e: any) {
      const cause = e.cause?.cause;
      if (cause?.code === "ERR_INVALID_URL" && cause?.input === "[object Request]") {
        expect.fail("undici.fetch requires undici.Request, not globalThis.Request");
      }
    } finally {
      db.close();
    }
  });
});

describe("undici 8 compatibility (#855)", function () {
  this.timeout(10000);

  // Same scenario as reported in https://github.com/arangodb/arangojs/issues/855
  it("connects and returns a query result without agentOptions", async () => {
    const url = Array.isArray(config.url) ? config.url[0] : config.url;
    const db = new Database({ url });

    try {
      if (Array.isArray(config.url)) await db.acquireHostList();

      const value = "Hello ArangoDB!";
      const result = await db.query({
        query: "RETURN @value",
        bindVars: { value },
      });
      const returnValue = await result.next();

      expect(returnValue).to.equal(value);
    } catch (e: any) {
      const code = e.cause?.code ?? e.cause?.cause?.code;
      if (code === "UND_ERR_INVALID_ARG") {
        expect.fail("fetch failed with invalid content-length header (#855)");
      }
      throw e;
    } finally {
      db.close();
    }
  });
});
