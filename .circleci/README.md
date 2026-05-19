# CircleCI Workflow Guide (`.circleci/config.yml`)

## 1) Purpose

CircleCI validates **arangojs** using one parameterized job, **`node-test`**, wired into **several workflows** (depending on pipeline parameter `docker-img`).

**Node.js:** `package.json` `engines.node` requires **>=20**; CircleCI executors exercise the **current LTS pair** (**22.x** and **24.x**).

| Pipeline parameter `docker-img` | Workflows | DB / coverage |
|---------------------------------|------------|----------------|
| **Empty** (default) | **`integration-single-topology`**, **`integration-cluster-topology`**, **`integration-http-proto-smoke`**, **`browser-smoke`** | **36** jobs total. |
| **Non-empty** | **`integration-tests-given-db-image-full-matrix`** only | Your image × full matrix (**16** jobs); topology single + cluster, SSL on/off, **HTTP/1.1 only** (default `http_proto`; no `h2` matrix). |

**Secrets:** set **`ARANGO_LICENSE_KEY`** on the CircleCI project (or context) when using Enterprise images.

**Branches:** each job has `filters.branches.ignore: stable` (same intent as GitHub `branches-ignore: stable` on `push`).

---

## 2) Default pipeline (`docker-img` empty) — **34 jobs**

Three workflows run in parallel (same `when: not <<pipeline.parameters.docker-img>>`):

### A) `integration-single-topology` (**16** jobs)

**Topology** is fixed to **`single`** (passed as job parameter, not matrixed).

| Axis | Values |
|------|--------|
| **ArangoDB image** | Block 1: `enterprise:3.12` — Block 2: `enterprise-preview:4.0-nightly` |
| **Node** | `n22`, `n24` |
| **SSL** | `true`, `false` |
| **Module system** | `cjs`, `esm` |
| **HTTP stack** | **Not matrixed** — uses job default **`http_proto: h1`** → `TEST_ARANGO_HTTP_VERSION=1.1` (undici `allowH2: false`). |

**Per block:** 2 × 2 × 2 = **8** jobs. **Total A:** 8 + 8 = **16**.

**Naming:** `single-<node>-ssl<true|false>-<cjs|esm>-312` | `single-...-4.0-nightly`

### B) `integration-cluster-topology` (**16** jobs)

Same matrix as (A), but **topology** is fixed to **`cluster`** (`TEST_ARANGODB_URL` lists three coordinators + `ROUND_ROBIN`).

**Per block:** **8** jobs. **Total B:** **16**.

**Naming:** `cluster-<node>-ssl<true|false>-<cjs|esm>-312` | `cluster-...-4.0-nightly`

### C) `integration-http-proto-smoke` (**2** jobs)

Fixed “best” cell to compare **HTTP/1.1 vs HTTP/2** without multiplying the full matrix:

| Setting | Value |
|---------|--------|
| **Image** | `docker.io/arangodb/enterprise:3.12` |
| **Topology** | `single` |
| **SSL** | `true` (HTTPS — HTTP/2 via ALPN where supported) |
| **Node** | `n24` |
| **Module** | `esm` |
| **HTTP** | Job `http-proto-h1-smoke` → `http_proto: h1`; job `http-proto-h2-smoke` → `http_proto: h2` (`TEST_ARANGO_HTTP_VERSION` **1.1** vs **2.0** in `src/test/_config.ts`). |

**Total C:** **2** jobs.

### D) `browser-smoke` (**2** jobs)

Browser bundling check via `smoke-test.mjs` (Puppeteer, Node **24**):

| Setting | Value |
|---------|--------|
| **Images** | `docker.io/arangodb/enterprise:3.12`, `docker.io/arangodb/enterprise-preview:4.0-nightly` |
| **Topology** | `single` (HTTP) |
| **Hostname** | `arangodb` → `172.28.0.1` in `/etc/hosts` (matches `smoke-test.mjs` proxy target) |

**Naming:** `browser-smoke-312`, `browser-smoke-4.0-nightly`

**Grand total (empty `docker-img`):** 16 + 16 + 2 + 2 = **36** jobs.

---

## 3) Manual pipeline (`docker-img` set) — **`integration-tests-given-db-image-full-matrix`** (**16** jobs)

| Axis | Values |
|------|--------|
| **Docker DB image** | `<<pipeline.parameters.docker-img>>` |
| **Node** | `n22`, `n24` |
| **Topology** | `single`, `cluster` |
| **SSL** | `true`, `false` |
| **Module system** | `cjs`, `esm` |
| **HTTP** | Default **`h1`** only (no `http_proto` matrix). |

**Job count:** 2 × 2 × 2 × 2 = **16**.

**Naming:** `<node>-<topology>-ssl<true|false>-<cjs|esm>`

---

## 4) Shared jobs: `node-test` and `browser-smoke`

### `node-test`

1. **Timeout** — background cancel after 15 minutes (`CIRCLE_TOKEN` API cancel).
2. **Checkout**
3. **Remote Docker** — for `./docker/start_db.sh`.
4. **Start DB** — `bash ./docker/start_db.sh` with env: `DOCKER_IMAGE`, `STARTER_MODE` (topology), `STARTER_DOCKER_IMAGE` (`docker.io/arangodb/arangodb-starter:0.18.5`), `SSL` (command defaults `COMPRESSION` to `false` when not passed).
5. **Apt** — `jq`, `curl`.
6. **`npm install`**
7. **Tests** — `SCHEME` / `TEST_ARANGODB_URL` / `TEST_ARANGO_LOAD_BALANCING_STRATEGY` as in `config.yml`; **`TEST_ARANGO_HTTP_VERSION`** from `http_proto` (`h1` → `1.1`, `h2` → `2.0`); `ARANGO_RELEASE`, `CI=true`, then `npm run test:cjs` or `npm run test:esm`.

`start_db.sh` leaves **root password empty**; **`TEST_ARANGODB_URL`** has **no** `user:pass@`; the driver sends **Basic `root:`** by default.

### `browser-smoke`

Same **start DB** / remote Docker setup as `node-test` (single, HTTP). Then `npm install`, `npm run build`, and `node smoke-test.mjs`.

---

## 5) Operational usage

### Default (PR / push)

- Do **not** set `docker-img`.
- Runs **36** jobs across the four workflows above (single matrix + cluster matrix + HTTP proto smoke + browser smoke).

### Custom DB image

1. **Trigger Pipeline** → **`docker-img`** = full image reference.
2. Runs **`integration-tests-given-db-image-full-matrix`** only → **16** jobs (no full-matrix `h1`/`h2` dimension).

---

## 6) Parallelism and cost (orientative)

- **Default pipeline:** roughly **36 × medium** executor-minutes per push (plus per-job startup).
- **`docker-img` set:** **16** jobs.

---

## 7) See also

- [GitHub Actions vs CircleCI](github-vs-circleci.md) — tests and browser smoke on CircleCI; GitHub **CI** (`stable` promotion).
