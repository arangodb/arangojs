# Build and test guide

Run commands from the repository root. Check current scripts and CI before
copying a command from this guide if the repository has changed.

## Contents

- [Environment](#environment)
- [Database-free checks](#database-free-checks)
- [Focused integration checks](#focused-integration-checks)
- [Test placement](#test-placement)
- [CI dimensions](#ci-dimensions)
- [Reproducing a CircleCI job](#reproducing-a-circleci-job)
- [Choosing validation](#choosing-validation)

## Environment

Use the Node.js versions configured in `.circleci/config.yml` and npm. The
current CI matrix tests Node.js 22 and 24. Although `package.json#engines`
currently declares `>=20`, that package-installation range is not evidence that
Node.js 20 is exercised by current CI.

`npm run build` invokes Unix-style tools (`rm`, `mkdir`, `jq`, `sed`, `cat`, and
`cp`) in addition to local Node tools, so run it in a shell environment that
provides them.

Integration tests default to an ArangoDB server at `http://127.0.0.1:8529`
with user `root` and an empty password. Override the endpoint with
`TEST_ARANGODB_URL`. A comma-separated URL list selects multiple hosts; the CI
cluster setup also sets `TEST_ARANGO_LOAD_BALANCING_STRATEGY=ROUND_ROBIN`.

Tests mutate server-wide and database state, including databases, collections,
users, transactions, jobs, and configuration exercised by administrative tests.
Use an isolated disposable server. Do not run suites concurrently against the
same deployment.

Inspect `docker/start_db.sh` before using it. The current helper creates the
fixed Docker network `arangodb` on `172.28.0.0/16`, the volume container
`arangodb-data`, and the starter container `adb`; it also mounts the host Docker
socket. Existing resources with those names can collide with a run. The default
database image is Enterprise and needs `ARANGO_LICENSE_KEY`; topology, TLS, and
image choices come from environment variables. The helper does not clean up its
fixed resources, so inspect and remove only the exact resources created for a
disposable run.

## Database-free checks

Build all outputs and compile production plus test TypeScript:

```sh
npm run build
```

This recreates `build/` and generates ESM, CommonJS, declarations, and package
metadata. It does **not** execute Mocha or validate server behavior. Inspect the
command output for all parallel build branches; one generated output alone is
not a complete build.

For TypeScript-only edits, a no-emit check can provide a faster first signal:

```sh
npm exec tsc -- -p tsconfig.json
```

Still run the full build when module output, declarations, entry points, or
package behavior is relevant.

## Focused integration checks

Build first, then run the emitted test file for the affected area. For example:

```sh
npm run build
npm exec mocha -- --reporter spec \
  --require source-map-support/register \
  --timeout 10000 \
  build/esm/test/10-manipulating-collections.js
```

Replace the file with the relevant existing or new test. Confirm the report
contains the intended cases and inspect skips. A misspelled selection, all
skipped cases, or a stale `build/` test is not a passing regression check.

Run the full already-built suite for one output format with:

```sh
npm run test:esm
npm run test:cjs
```

`npm test` runs `pretest` first and therefore rebuilds, but only selects the ESM
suite:

```sh
npm test
```

Set a suitable timeout or use the CI `jenkins` script only when the environment
and intended scope require it; an unlimited timeout can conceal a hung test.

## Test placement

Tests are grouped as numbered files under `src/test/`. Add a regression near the
existing behavior instead of creating a disconnected suite.

| Change                                                                               | Start with                                                                                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Driver construction, configuration, headers, serialization basics                    | `00-basics.ts` and the affected configuration tests.                                                  |
| Database, collection, document, graph, index, view, query, transaction, or admin API | The numbered domain test file matching that API.                                                      |
| Cursor creation, batching, iteration, and cleanup                                    | `08-cursors.ts` and query-stream tests where applicable.                                              |
| Connection retries, host behavior, conflicts, timeouts                               | `31-conflicts.ts`, `36-retrying-connection-errors.ts`, and the closest connection-focused regression. |
| Async job trapping, polling, cancellation, and deletion                              | `37-async-jobs.ts`.                                                                                   |
| Authentication, access tokens, agent options, content length, HTTP stack             | The corresponding high-numbered regression file.                                                      |
| Browser compatibility or package entry behavior                                      | `smoke-test.mjs` after a successful build.                                                            |

Follow nearby Mocha and Chai style. Reuse shared `config`, database setup, and
cleanup patterns. Avoid sleeps when a deterministic poll or signal is available.
Ensure cleanup runs on failure for resources the test creates.

For server-dependent feature gates, obtain the actual server version using the
current helpers in `src/test/_arango-server-version.ts` when that is the nearby
pattern. `ARANGO_VERSION` and `ARANGO_RELEASE` influence shared configuration,
but a configured value is not proof of the live server's capabilities.

## CI dimensions

`.circleci/config.yml` is authoritative. Select the dimensions affected by the
change rather than claiming full coverage from a default local run. The current
matrix includes:

- Node.js 22 and 24;
- ArangoDB 3.12 and a 4.0 nightly preview, with an additional pinned 3.12.9
  workflow;
- single-server and cluster topology;
- TLS enabled and disabled;
- ESM and CommonJS output;
- HTTP/1.1 and HTTP/2 smoke coverage through `TEST_ARANGO_HTTP_VERSION`;
- browser bundling and a live request in headless Chrome.

Relevant environment variables include `TEST_ARANGODB_URL`,
`TEST_ARANGO_LOAD_BALANCING_STRATEGY`, `TEST_ARANGO_HTTP_VERSION`,
`ARANGO_VERSION`, `ARANGO_RELEASE`, and `CI`. Use CI's exact setup when
reproducing an environment-specific failure.

The browser check requires a built ESM entry, a disposable server, a proxy, and
Chrome/Puppeteer:

```sh
node smoke-test.mjs
```

It uses `ARANGO_PROXY_TARGET` and optionally `PUPPETEER_EXECUTABLE_PATH`. Do not
present an esbuild-only bundle as proof of a successful browser request.

## Reproducing a CircleCI job

Use the failed job's expanded parameters and logs rather than selecting only the
test filename. `.circleci/config.yml` is authoritative; `.circleci/README.md`
summarizes the current workflows and setup.

1. Check out the same commit and use the job's Node version and architecture.
2. Record its database and starter images, topology, TLS flag, module system,
   and HTTP protocol. For a custom-image pipeline, use the exact `docker-img`
   value.
3. Provide required credentials without copying them into logs. Enterprise
   images require `ARANGO_LICENSE_KEY`; private or rate-limited registries may
   also require Docker login.
4. Start a disposable database using the same `DOCKER_IMAGE`, `STARTER_MODE`,
   `STARTER_DOCKER_IMAGE`, and `SSL` values. Check first for the fixed Docker
   resources described under [Environment](#environment).
5. Set the same test endpoint and protocol. Cluster jobs use three coordinator
   URLs and `TEST_ARANGO_LOAD_BALANCING_STRATEGY=ROUND_ROBIN`; protocol jobs set
   `TEST_ARANGO_HTTP_VERSION` to `1.1` or `2.0`.
6. Install dependencies using the repository and lockfile state present at that
   commit, build when the selected script does not do so, and run the same
   `test:esm`, `test:cjs`, or browser command.
7. Confirm that the failing case ran. Compare the local error, server version,
   topology, protocol, and timing with the CI log before calling it reproduced.

If the full environment cannot be matched, vary one dimension at a time and
report the mismatch. A locally passing single-server HTTP/1.1 ESM run does not
disprove a cluster, HTTP/2, CommonJS, architecture, or server-version failure.

## Choosing validation

- Documentation-only agent-guidance changes: verify paths and commands, validate
  skill structure, and run `git diff --check`. A database run is unnecessary.
- Public API or endpoint changes: build, run the focused domain test in ESM, and
  assess CommonJS and supported server variants.
- Connection, retry, HTTP, TLS, or cluster changes: run focused regressions and
  the applicable topology/protocol variants.
- Packaging, dependency, or entry-point changes: build all outputs, check both
  import styles, and assess browser smoke coverage.

If infrastructure is unavailable, run safe database-free checks and state
precisely which server behavior and variants remain unverified. Never describe a
build, skipped suite, or unselected test as a passing integration test.
