import { expect } from "chai";
import { Database } from "../index.js";

describe("agentOptions with undici", () => {
  it("uses compatible Request constructor with undici.fetch", async () => {
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
