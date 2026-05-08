# CircleCI Workflow Guide (`.circleci/config.yml`)

## 1) Purpose and Design

This CircleCI setup validates `arangojs` by reusing one core job (`node-test`) across multiple workflow matrices.
The executed workflow depends on the pipeline parameter `docker-img`.

Key goals:
- test ArangoDB behavior across topology modes
- test SSL and module-system combinations
- test Node.js version compatibility
- support ad-hoc validation of custom ArangoDB images

---

## 2) Trigger and Routing Logic

Pipeline parameter:
- `docker-img` (string, default: empty)

Routing:
- If `docker-img` is empty:
  - run `test-adb-version`
  - run `test-node`
- If `docker-img` is provided:
  - run `test-adb-topology` only

Branch filtering:
- All workflow jobs ignore branch `stable`.

---

## 3) Shared Job: `node-test`

All workflows invoke `node-test` with different matrix values.

### Job sequence (start to end)

1. **Timeout guard**
   - Starts a background timer (`15m`) and auto-cancels the job through CircleCI API if exceeded.
2. **Checkout**
   - Pulls repository contents.
3. **Remote Docker setup**
   - Enables Docker daemon required by `./docker/start_db.sh`.
4. **Database startup**
   - Calls `start-db` command (`./docker/start_db.sh`) with:
     - `DOCKER_IMAGE`
     - `STARTER_MODE` (`single` or `cluster`)
     - `SSL` (`true`/`false`)
     - `COMPRESSION` (defined, not currently varied by workflows)
5. **Dependency cache restore**
   - Restores npm cache from `~/.npm` keyed by `package-lock.json`.
6. **System package install**
   - Installs `jq` and `curl`.
7. **npm upgrade**
   - Upgrades to `npm@10`.
8. **Node dependency install**
   - Runs `npm ci`.
9. **Test execution**
   - Builds runtime env vars from matrix params:
     - `SCHEME=http|https`
     - `NODE_TLS_REJECT_UNAUTHORIZED=0` when SSL is enabled
     - `TEST_ARANGODB_URL`:
       - single: one endpoint (`8529`)
       - cluster: three endpoints (`8529, 8539, 8549`)
     - `TEST_ARANGO_LOAD_BALANCING_STRATEGY=ROUND_ROBIN` (cluster only)
     - `ARANGO_RELEASE`
     - `CI=true`
   - Executes `npm run test:cjs` or `npm run test:esm`.
10. **Dependency cache save**
    - Saves updated `~/.npm` cache.

---

## 4) Workflow Reference

### A) `test-adb-version`

**When it runs**
- `docker-img` is empty.

**Matrix**
- `docker-img`: `docker.io/arangodb/enterprise:3.12`
- `topology`: `single`, `cluster`
- `module-system`: `cjs`, `esm`
- `node`: `n23`

**Total jobs**
- `2 * 2 * 1 * 1 = 4`

**What it validates**
- Baseline ArangoDB version (`3.12`) across both topology modes and module systems.

---

### B) `test-adb-topology`

**When it runs**
- `docker-img` is provided at pipeline trigger time.

**Matrix**
- `docker-img`: value from pipeline parameter
- `topology`: `single`, `cluster`
- `ssl`: `true`, `false`
- `module-system`: `cjs`, `esm`
- `node`: `n23`

**Total jobs**
- `1 * 2 * 2 * 2 * 1 = 8`

**What it validates**
- A specific ArangoDB image (for example preview/nightly/custom) across topology, SSL, and module-system combinations.

---

### C) `test-node`

**When it runs**
- `docker-img` is empty.

**Matrix**
- `node`: `n20`, `n22`, `n23`
- `module-system`: `cjs`, `esm`
- `ssl`: `true`, `false`
- inherited job defaults:
  - `docker-img`: `docker.io/arangodb/enterprise:latest`
  - `topology`: `single`

**Total jobs**
- `3 * 2 * 2 = 12`

**What it validates**
- Node.js compatibility coverage across supported versions, both module systems, and SSL modes.

---

## 5) Operational Usage

### Default CI path (PR / normal push)
- Do not pass `docker-img`.
- Workflows executed:
  - `test-adb-version`
  - `test-node`

### Validate a custom ArangoDB image
- Trigger pipeline with `docker-img=<image>`.
- Workflow executed:
  - `test-adb-topology`

Example:
- `docker-img: docker.io/arangodb/enterprise-preview:devel-nightly`

---

## 6) Quick Decision Table

- **Need baseline DB coverage?** Use default trigger (`test-adb-version`).
- **Need Node compatibility matrix?** Use default trigger (`test-node`).
- **Need to test a custom or preview DB image?** Set `docker-img` (`test-adb-topology`).