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
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("http://localhost:8529/smoke", {
      waitUntil: "networkidle2",
    });
    const server = await page.evaluate(`async function () {
      var Database = arangojs.Database;
      var db = new Database();
      var el = document.getElementById("version");
      const info = await db.version();
      return info.server;
    }`);
    await browser.close();
    if (server !== "arango") {
      console.error("Unexpected version response:", server);
      process.exit(1);
    }
  })();
});
