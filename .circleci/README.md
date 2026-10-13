# CircleCI workflow guide (`.circleci/config.yml`)

## Purpose

CircleCI validates arangojs with the Node.js integration suite, HTTP protocol
smoke tests, a browser bundle smoke test, and the full browser-compatible
integration suite.

The full browser suite runs automatically in the latest stable Chrome and
Firefox releases. There is no browser-specific pipeline flag.

| Pipeline input                      | Workflows                                           | Jobs |
| ----------------------------------- | --------------------------------------------------- | ---: |
| `docker-img` empty (normal push/PR) | Default Node, smoke, and browser workflows          |   44 |
| `docker-img` set                    | All custom-image Node, smoke, and browser workflows |   23 |

`package.json` requires Node.js 20 or newer. CircleCI exercises Node.js 22 and
24 for the Node integration suite. Browser jobs use Node.js 24 on AMD64.

### Secrets and context

| Name                                      | Used for                                                   |
| ----------------------------------------- | ---------------------------------------------------------- |
| `ARANGO_LICENSE_KEY`                      | Enterprise images started by `docker/start_db.sh`          |
| `DOCKER_HUB_USER` / `DOCKER_HUB_PASSWORD` | Authenticated image pulls through the `docker-hub` context |

Every integration and browser job attaches `context: docker-hub` and ignores
the `stable` branch.

## Normal pipeline: 44 jobs

The normal pipeline runs when `docker-img` is empty.

| Workflow                       | Coverage                                              | Jobs |
| ------------------------------ | ----------------------------------------------------- | ---: |
| `integration-single-topology`  | 2 DB images x 2 Node versions x 2 SSL modes x CJS/ESM |   16 |
| `integration-cluster-topology` | Same matrix in cluster mode                           |   16 |
| `integration-3129`             | Enterprise 3.12.9 x single/cluster x CJS/ESM          |    4 |
| `integration-http-proto-smoke` | HTTP/1.1 and HTTP/2 on Enterprise 3.12                |    2 |
| `browser-smoke`                | Bundle smoke test on Enterprise 3.12 and 4.0-nightly  |    2 |
| `browser-tests`                | Chrome/Firefox x single/cluster on Enterprise 3.12    |    4 |

The main Node matrices use these images:

- `gcr.io/gcr-for-testing/arangodb/enterprise:3.12`
- `gcr.io/gcr-for-testing/arangodb/core-preview:4.0-nightly`

The full browser matrix uses Enterprise 3.12 as the default LTS target. It is
not repeated over every Node and database-version axis because the browser
itself is the runtime under test.

## Custom-image pipeline: 23 jobs

Setting `docker-img` starts all custom-image workflows automatically:

| Workflow                                      | Coverage                                                 | Jobs |
| --------------------------------------------- | -------------------------------------------------------- | ---: |
| `integration-tests-given-db-image`            | 2 Node versions x single/cluster x 2 SSL modes x CJS/ESM |   16 |
| `integration-http-proto-smoke-given-db-image` | HTTP/1.1 and HTTP/2                                      |    2 |
| `browser-smoke-given-db-image`                | Chrome bundle smoke test                                 |    1 |
| `browser-tests-given-db-image`                | Chrome/Firefox x single/cluster                          |    4 |

No second trigger or approval is required for the browser integration jobs.

## Browser integration suite

The `browser-test` job accepts two matrix parameters:

| Parameter  | Values              |
| ---------- | ------------------- |
| `browser`  | `chrome`, `firefox` |
| `topology` | `single`, `cluster` |

For every job CircleCI:

1. Starts the requested live ArangoDB topology.
2. Downloads the current Google Chrome stable `.deb` or Mozilla Firefox stable
   archive for Linux AMD64.
3. Prints the installed browser version in the job log.
4. Installs project dependencies without downloading Puppeteer's bundled
   browser.
5. Sets `BROWSER_TEST_BROWSER` and `PUPPETEER_EXECUTABLE_PATH` for the selected
   browser.
6. Runs `npm run test:browser`.

The browser runner uses Puppeteer to launch the selected browser and serves the
Mocha bundle through a local Express proxy. The page is served at
`127.0.0.1:8559`; cluster coordinator proxies use ports 8560 and 8561.

| Topology  | ArangoDB proxy targets      | Load balancing |
| --------- | --------------------------- | -------------- |
| `single`  | `172.28.0.1:8529`           | Driver default |
| `cluster` | `172.28.0.1:8529,8539,8549` | `ROUND_ROBIN`  |

The job has a 60-minute ceiling. Cluster runs get a 40-minute browser-test
timeout because they are slower than single-server runs.

### Test selection

`browser-test.mjs` discovers the existing numbered integration test files.
Files that depend entirely on Node.js-only APIs are excluded with a reason in
the log. Browser-compatible cases in mixed files still run; for example,
`13-bulk-imports.ts` runs in browsers while only its `Buffer` cases are skipped.

For a targeted local run, set a comma-separated file list:

```sh
BROWSER_TEST_FILES=00-basics,05-aql-helpers npm run test:browser
```

Select Firefox with:

```sh
BROWSER_TEST_BROWSER=firefox \
PUPPETEER_EXECUTABLE_PATH=/path/to/firefox \
npm run test:browser
```

Chrome is the default when `BROWSER_TEST_BROWSER` is unset.

## Other shared jobs

### `node-test`

The job starts Docker-in-Docker, authenticates to Docker Hub, starts ArangoDB,
installs dependencies, builds the selected module system, and runs the existing
Mocha integration suite. Cluster jobs expose three coordinators and use round
robin load balancing.

### `browser-smoke`

The smoke job installs the latest Chrome stable release, builds the browser
bundle, and runs `smoke-test.mjs` against a live single-server database. This
fast check remains separate from the full Chrome/Firefox integration matrix.

## Running the workflows

### Push or pull request

Do not set `docker-img`. The full Chrome/Firefox browser matrix runs
automatically alongside all normal workflows.

### Custom ArangoDB image

Trigger a pipeline with `docker-img` set to the complete image reference. The
full Chrome/Firefox browser matrix and the existing custom-image workflows all
run automatically.
