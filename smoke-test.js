"use strict";
const puppeteer = require("puppeteer");
const express = require("express");
const proxy = require("express-http-proxy");
const { createReadStream } = require("fs");

const app = express();
app.get("/smoke", (_req, res) => {
  res.type("html");
  res.end('<!DOCTYPE html><script src="/smoke/web.js"></script>');
});
app.get("/smoke/web.js", (_req, res) => {
  res.type("js");
  createReadStream("build/web.js").pipe(res);
});
app.get("/smoke/web.js.map", (_req, res) => {
  res.type("js");
  createReadStream("build/web.js.map").pipe(res);
});
app.use("/", proxy("arangodb:8529"));

app.listen(8529, () => {
  (async () => {
    let server;
    try {
      const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
      const page = await browser.newPage();
      await page.goto("http://localhost:8529/smoke", {
        waitUntil: "networkidle2",
      });
      server = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        const Database = arangojs.Database;
        const db = new Database();
        const info = await db.version();
        return info.server;
      });
      await browser.close();
    } catch (e) {
      console.error(e);
    }
    if (server !== "arango") {
      console.error("Unexpected version response:", server);
      process.exit(1);
    } else {
      process.exit(0);
    }
  })();
});
