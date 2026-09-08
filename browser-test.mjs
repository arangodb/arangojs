import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const require = createRequire(import.meta.url);
const express = require("express");
const proxy = require("express-http-proxy");
const puppeteer = require("puppeteer");

const root = path.dirname(fileURLToPath(import.meta.url));
const testDirectory = path.join(root, "src", "test");
const port = Number(process.env.BROWSER_TEST_PORT) || 8559;
const origin = `http://127.0.0.1:${port}`;
const arangoProxy = process.env.ARANGO_PROXY_TARGET || "127.0.0.1:8529";
const totalTimeoutMs =
  Number(process.env.BROWSER_TEST_TIMEOUT_MS) || 20 * 60 * 1000;

const excludedTests = new Map([
  [
    "13-bulk-imports.ts",
    "uses Node.js Buffer inputs; browser Blob coverage belongs in a dedicated test",
  ],
  ["22-foxx-api.ts", "loads Foxx zip fixtures with Node.js fs and path"],
  ["33-content-length.ts", "contains Node.js Buffer/content-length assertions"],
  [
    "34-agent-options-undici.ts",
    "tests the Node.js-only undici agentOptions path",
  ],
  [
    "36-retrying-connection-errors.ts",
    "tests Node.js/undici system-error shapes",
  ],
]);

const requestedTests = (process.env.BROWSER_TEST_FILES || "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean)
  .map((name) => (name.endsWith(".ts") ? name : `${name}.ts`));

const allTestFiles = (await readdir(testDirectory))
  .filter((name) => /^\d.*\.ts$/.test(name))
  .sort();
const compatibleTestFiles = allTestFiles.filter(
  (name) => !excludedTests.has(name),
);
const testFiles = requestedTests.length
  ? compatibleTestFiles.filter((name) =>
      requestedTests.some((requested) => name.startsWith(requested)),
    )
  : compatibleTestFiles;

if (!testFiles.length) {
  throw new Error(
    `No browser-compatible tests matched BROWSER_TEST_FILES=${JSON.stringify(
      process.env.BROWSER_TEST_FILES || "",
    )}`,
  );
}

const browserEnvironment = {
  ARANGOJS_DEVEL_VERSION: process.env.ARANGOJS_DEVEL_VERSION || "",
  ARANGO_RELEASE: process.env.ARANGO_RELEASE || "",
  ARANGO_VERSION: process.env.ARANGO_VERSION || "",
  ARANGOJS_VERSION: require("./package.json").version,
  CI: process.env.CI || "",
  TEST_ARANGODB_URL: origin,
  TEST_ARANGO_VECTOR_INDEX: process.env.TEST_ARANGO_VECTOR_INDEX || "",
};
const entryPoint = testFiles
  .map((name) => `import ${JSON.stringify(`./src/test/${name}`)};`)
  .join("\n");

console.log(
  `Running ${testFiles.length} browser-compatible test files against ${arangoProxy}`,
);
for (const [name, reason] of excludedTests) {
  if (allTestFiles.includes(name)) console.log(`Skipping ${name}: ${reason}`);
}

const bundle = await esbuild.build({
  stdin: {
    contents: entryPoint,
    loader: "js",
    resolveDir: root,
    sourcefile: "browser-test-entry.js",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  write: false,
  sourcemap: "inline",
  logLevel: "error",
  logOverride: { "assign-to-define": "silent" },
  define: {
    module: "undefined",
    exports: "undefined",
    "process.env": JSON.stringify(browserEnvironment),
  },
});

const serializeForScript = (value) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");
const mochaPath = require.resolve("mocha/mocha.js");
const app = express();

app.get("/browser-tests", (_request, response) => {
  response.type("html").send(`<!doctype html>
<html>
  <head><meta charset="utf-8"><title>arangojs browser tests</title></head>
  <body>
    <div id="mocha"></div>
    <script src="/browser-tests/mocha.js"></script>
    <script>
      mocha.setup({
        ui: "bdd",
        timeout: 10000,
        grep: ${serializeForScript(process.env.BROWSER_TEST_GREP || "")}
      });
      window.__browserTestResult = null;
    </script>
    <script type="module">
      const failures = [];
      try {
        await import("/browser-tests/index.js");
        const runner = mocha.run();
        runner.on("pass", (test) => console.log("PASS " + test.fullTitle()));
        runner.on("pending", (test) => console.log("SKIP " + test.fullTitle()));
        runner.on("fail", (test, error) => {
          failures.push({
            title: test.fullTitle(),
            message: error && error.message,
            stack: error && error.stack
          });
          console.error("FAIL " + test.fullTitle() + ": " + error);
        });
        runner.on("end", () => {
          const stats = runner.stats || {};
          window.__browserTestResult = {
            failures,
            stats: {
              duration: stats.duration || 0,
              failures: stats.failures || failures.length,
              passes: stats.passes || 0,
              pending: stats.pending || 0,
              tests: stats.tests || 0
            }
          };
        });
      } catch (error) {
        window.__browserTestResult = {
          failures: [{
            title: "Loading browser test bundle",
            message: error && error.message,
            stack: error && error.stack
          }],
          stats: { duration: 0, failures: 1, passes: 0, pending: 0, tests: 0 }
        };
      }
    </script>
  </body>
</html>`);
});
app.get("/browser-tests/mocha.js", (_request, response) => {
  response.sendFile(mochaPath);
});
app.get("/browser-tests/index.js", (_request, response) => {
  response.type("js").send(bundle.outputFiles[0].text);
});
app.get("/favicon.ico", (_request, response) => response.sendStatus(204));
app.use("/", proxy(arangoProxy, { parseReqBody: false }));

const server = await new Promise((resolve, reject) => {
  const listener = app.listen(port, "127.0.0.1", () => resolve(listener));
  listener.on("error", reject);
});

let browser;
try {
  const launchOptions = {
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    protocolTimeout: totalTimeoutMs + 60_000,
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  page.setDefaultTimeout(totalTimeoutMs);
  page.on("console", (message) => {
    const output = message.type() === "error" ? console.error : console.log;
    output(`[browser] ${message.text()}`);
  });
  page.on("pageerror", (error) => console.error("[browser]", error));

  await page.goto(`${origin}/browser-tests`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__browserTestResult !== null, {
    timeout: totalTimeoutMs,
  });
  const result = await page.evaluate(() => window.__browserTestResult);
  const { stats } = result;
  console.log(
    `Browser tests: ${stats.passes} passed, ${stats.failures} failed, ` +
      `${stats.pending} pending (${stats.tests} total, ${stats.duration}ms)`,
  );
  for (const failure of result.failures) {
    console.error(`\n${failure.title}\n${failure.stack || failure.message}`);
  }
  if (!stats.tests) {
    console.error("Browser tests failed: Mocha did not run any tests.");
    process.exitCode = 1;
  } else if (stats.failures) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error("Browser test runner failed:", error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
