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
const proxyTargets = (process.env.ARANGO_PROXY_TARGET || "127.0.0.1:8529")
  .split(",")
  .map((target) => target.trim())
  .filter(Boolean);
if (!proxyTargets.length) {
  throw new Error("ARANGO_PROXY_TARGET must list at least one host:port");
}
const testOrigins = proxyTargets.map(
  (_target, index) => `http://127.0.0.1:${port + index}`,
);
const totalTimeoutMs =
  Number(process.env.BROWSER_TEST_TIMEOUT_MS) || 20 * 60 * 1000;
const browserName = (process.env.BROWSER_TEST_BROWSER || "chrome")
  .trim()
  .toLowerCase();
if (browserName !== "chrome" && browserName !== "firefox") {
  throw new Error(
    `BROWSER_TEST_BROWSER must be either "chrome" or "firefox", got ${JSON.stringify(
      process.env.BROWSER_TEST_BROWSER,
    )}`,
  );
}

const excludedTests = new Map([
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

const requestedTests = [
  ...new Set(
    (process.env.BROWSER_TEST_FILES || "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => (name.endsWith(".ts") ? name : `${name}.ts`)),
  ),
];

const allTestFiles = (await readdir(testDirectory))
  .filter((name) => /^\d.*\.ts$/.test(name))
  .sort();
const compatibleTestFiles = allTestFiles.filter(
  (name) => !excludedTests.has(name),
);
const unavailableRequestedTests = requestedTests.filter(
  (name) => !compatibleTestFiles.includes(name),
);
if (unavailableRequestedTests.length) {
  throw new Error(
    `The following BROWSER_TEST_FILES are missing or not browser-compatible: ${unavailableRequestedTests.join(
      ", ",
    )}`,
  );
}
const testFiles = requestedTests.length ? requestedTests : compatibleTestFiles;

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
  TEST_ARANGODB_URL: testOrigins.join(","),
  TEST_ARANGO_LOAD_BALANCING_STRATEGY:
    process.env.TEST_ARANGO_LOAD_BALANCING_STRATEGY || "",
  TEST_ARANGO_VECTOR_INDEX: process.env.TEST_ARANGO_VECTOR_INDEX || "",
};
const entryPoint = testFiles
  .map((name) => `import ${JSON.stringify(`./src/test/${name}`)};`)
  .join("\n");

console.log(
  `Running ${testFiles.length} browser-compatible test files in ${browserName} against ${proxyTargets.join(", ")}`,
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
      const report = (line = "") => console.log("__MOCHA_SPEC__" + line);
      try {
        await import("/browser-tests/index.js");
        const runner = mocha.run();
        let suiteDepth = 0;
        runner.on("suite", (suite) => {
          if (suite.root) return;
          report("\\n" + "  ".repeat(suiteDepth) + suite.title);
          suiteDepth += 1;
        });
        runner.on("suite end", (suite) => {
          if (!suite.root) suiteDepth -= 1;
        });
        runner.on("pass", (test) => {
          report("  ".repeat(suiteDepth) + "✓ " + test.title);
        });
        runner.on("pending", (test) => {
          report("  ".repeat(suiteDepth) + "- " + test.title);
        });
        runner.on("fail", (test, error) => {
          failures.push({
            title: test.fullTitle(),
            message: error && error.message,
            stack: error && error.stack
          });
          report("  ".repeat(suiteDepth) + failures.length + ") " + test.title);
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
attachClusterEndpoints(app);
app.use("/", proxy(proxyTargets[0], proxyOptions()));

function attachClusterEndpoints(application) {
  application.use((request, response, next) => {
    if (!request.path.endsWith("/_api/cluster/endpoints")) {
      next();
      return;
    }
    // acquireHostList() must keep using the browser-visible proxy URLs. The
    // real endpoint response contains Docker-internal coordinator URLs, whose
    // response headers are subject to ArangoDB's more restrictive CORS policy.
    response.json({
      error: false,
      code: 200,
      endpoints: testOrigins.map((endpoint) => ({ endpoint })),
    });
  });
}

function proxyOptions() {
  return {
    parseReqBody: false,
    // ArangoDB emits its own CORS headers whenever the request carries an
    // Origin, and its Access-Control-Expose-Headers list omits headers the
    // driver reads (e.g. x-arango-queue-time-seconds). Rewrite the list so
    // every response header stays readable from the test page.
    userResHeaderDecorator(headers) {
      return {
        ...headers,
        "access-control-allow-origin": origin,
        "access-control-expose-headers": Object.keys(headers)
          .filter((name) => !name.startsWith("access-control-"))
          .join(", "),
      };
    },
  };
}

function listen(application, listenPort) {
  return new Promise((resolve, reject) => {
    const listener = application.listen(listenPort, "127.0.0.1", () =>
      resolve(listener),
    );
    listener.on("error", reject);
  });
}

function attachCors(application) {
  application.use((request, response, next) => {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader(
      "Access-Control-Allow-Headers",
      request.headers["access-control-request-headers"] || "*",
    );
    response.setHeader(
      "Access-Control-Allow-Methods",
      "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    );
    response.setHeader("Access-Control-Max-Age", "86400");
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }
    next();
  });
}

const servers = [await listen(app, port)];
for (let index = 1; index < proxyTargets.length; index++) {
  const extra = express();
  attachCors(extra);
  attachClusterEndpoints(extra);
  extra.use("/", proxy(proxyTargets[index], proxyOptions()));
  servers.push(await listen(extra, port + index));
}

let browser;
try {
  const launchOptions = {
    browser: browserName,
    protocolTimeout: totalTimeoutMs + 60_000,
  };
  if (browserName === "chrome") {
    launchOptions.args = ["--no-sandbox", "--disable-dev-shm-usage"];
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  const browserErrors = [];
  const isExpectedNetworkDiagnostic = (text) =>
    browserName === "firefox" &&
    text.includes("Cross-Origin Request Blocked:") &&
    text.includes("http://does.not.exist.example:9999/");
  page.setDefaultTimeout(totalTimeoutMs);
  page.on("console", (message) => {
    const text = message.text();
    const mochaSpecPrefix = "__MOCHA_SPEC__";
    if (text.startsWith(mochaSpecPrefix)) {
      console.log(text.slice(mochaSpecPrefix.length));
      return;
    }
    // 00-basics deliberately requests an unreachable cross-origin host to
    // exercise error serialization. Firefox reports the handled rejection as
    // both a console error and a page error, unlike Chrome and Node.js.
    if (isExpectedNetworkDiagnostic(text)) return;
    // Chrome logs an error for every expected HTTP 4xx response. Mocha owns
    // test reporting, so these transport messages only obscure the results.
    if (
      message.type() === "error" &&
      text.startsWith("Failed to load resource:")
    ) {
      return;
    }
    const output = message.type() === "error" ? console.error : console.log;
    output(`[browser] ${text}`);
  });
  page.on("pageerror", (error) => {
    if (isExpectedNetworkDiagnostic(error.message)) return;
    browserErrors.push({
      title: "Uncaught browser error",
      message: error.message,
      stack: error.stack,
    });
    console.error("[browser]", error);
  });

  await page.goto(`${origin}/browser-tests`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__browserTestResult !== null, {
    timeout: totalTimeoutMs,
  });
  // Give the browser a turn to report unhandled rejections queued by the last test.
  await new Promise((resolve) => setTimeout(resolve, 100));
  const result = await page.evaluate(() => window.__browserTestResult);
  const { stats } = result;
  if (browserErrors.length) {
    result.failures.push(...browserErrors);
    stats.failures += browserErrors.length;
  }
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
  await Promise.all(
    servers.map(
      (listener) =>
        new Promise((resolve, reject) =>
          listener.close((error) => (error ? reject(error) : resolve())),
        ),
    ),
  );
}
