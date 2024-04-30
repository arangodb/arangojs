import esbuild from "esbuild";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const express = require("express");
const proxy = require("express-http-proxy");
const puppeteer = require("puppeteer");

const result = await esbuild.build({
  entryPoints: ["build/esm/index.js"],
  bundle: true,
  format: "esm",
  write: false,
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
app.use("/", proxy("arangodb:8529"));

app.listen(8529, () => {
  (async () => {
    let info;
    try {
      const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
      const page = await browser.newPage();
      await page.goto("http://127.0.0.1:8529/smoke", {
        waitUntil: "networkidle2",
      });
      const response = await page.evaluate(async () => {
        const arangojs = await import("arangojs");
        const Database = arangojs.Database;
        const db = new Database();
        try {
          const info = await db.version();
          return JSON.stringify(info);
        } catch (e) {
          return JSON.stringify(e);
        }
      });
      info = JSON.parse(response);
      await browser.close();
    } catch (e) {
      console.error(e);
    }
    if (info.server !== "arango") {
      console.error("Smoke test failed:", info);
      process.exit(1);
    } else {
      console.log("Smoke test passed", info);
      process.exit(0);
    }
  })();
});
