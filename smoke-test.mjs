import esbuild from "esbuild";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const express = require("express");
const proxy = require("express-http-proxy");
const puppeteer = require("puppeteer");

const smokePort = Number(process.env.SMOKE_PORT) || 8559;
const smokeOrigin = `http://127.0.0.1:${smokePort}`;
const arangoProxy = process.env.ARANGO_PROXY_TARGET || "127.0.0.1:8529";

const result = await esbuild.build({
  entryPoints: ["build/esm/index.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  write: false,
  logOverride: { "assign-to-define": "silent" },
  define: {
    module: "undefined",
    exports: "undefined",
  },
});

const app = express();
app.get("/smoke", (_req, res) => {
  res.type("html");
  res.end(`<!DOCTYPE html>
<script type="importmap">
{
  "imports": {
    "arangojs": "/smoke/index.js"
  }
}
</script>
`);
});
app.get("/smoke/index.js", (_req, res) => {
  res.type("js");
  res.end(result.outputFiles[0].text);
});
app.use("/", proxy(arangoProxy));

app.listen(smokePort, () => {
  (async () => {
    let info;
    try {
      const launchOptions = { args: ["--no-sandbox", "--disable-dev-shm-usage"] };
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
      const browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.goto(`${smokeOrigin}/smoke`, {
        waitUntil: "networkidle2",
      });
      const response = await page.evaluate(async (origin) => {
        const arangojs = await import("arangojs");
        const Database = arangojs.Database;
        const db = new Database(origin);
        let collection;
        let trx;
        try {
          const info = await db.version();
          collection = await db.createCollection(
            `browser-transaction-smoke-${Date.now()}`,
          );
          trx = await db.beginTransaction(collection);
          await trx.stepAsync(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return collection.save({ _key: "rollback-me" });
          });
          await trx.abort();
          trx = undefined;
          if (await collection.documentExists("rollback-me")) {
            throw new Error(
              "Browser stepAsync write survived transaction abort",
            );
          }
          return JSON.stringify(info);
        } catch (e) {
          return JSON.stringify(e);
        } finally {
          if (trx) await trx.abort().catch(() => undefined);
          if (collection) await collection.drop().catch(() => undefined);
          db.close();
        }
      }, smokeOrigin);
      info = JSON.parse(response);
      await browser.close();
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
    if (!info || info.server !== "arango") {
      console.error("Smoke test failed:", info);
      process.exit(1);
    } else {
      console.log("Smoke test passed", info);
      process.exit(0);
    }
  })();
});
