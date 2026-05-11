# CircleCI Workflow Guide (`.circleci/config.yml`)

## 1) Purpose

CircleCI validates **arangojs** using one parameterized job, **`node-test`**, combined into matrices inside **two workflows** (depending on pipeline parameter `docker-img`):

| Pipeline parameter `docker-img` | Workflow | DB coverage |
|-----------------------------------|----------|-------------|
| Empty (default) | **`integration-tests-multi-runtime-multi-db-image`** only | Three pinned Enterprise images × Node 20/22/23 × `cjs`/`esm`, **single** / **HTTP** (**18** jobs) |
| Non-empty | **`integration-tests-given-db-image-full-matrix`** only | Your image × full matrix: topology **single + cluster**, SSL **on/off** (**24** jobs) |

**Secrets:** set **`ARANGO_LICENSE_KEY`** on the CircleCI project (or context) when using Enterprise images.

**Branches:** each matrix job has `filters.branches.ignore: stable` (same intent as GitHub `branches-ignore: stable` on `push`).

---

## 2) Matrix dimensions

### `integration-tests-multi-runtime-multi-db-image` (18 jobs)

Runs when `docker-img` is **empty**. Same **shape** as GitHub Actions **`node`** job: several **Node.js** executors × several **DB images** × `cjs`/`esm`, **single** topology, **HTTP** only.

| Axis | Values |
|------|--------|
| **ArangoDB image** | `docker.io/arangodb/enterprise:3.12`, `docker.io/arangodb/enterprise:3.12-deb`, `docker.io/arangodb/enterprise-preview:devel-nightly` |
| **Node** | `n20`, `n22`, `n23` |
| **Topology** | `single` only |
| **SSL** | `false` only (HTTP) |
| **Module system** | `cjs`, `esm` |

**Job count:** 3 × 3 × 2 = **18** jobs (three **`node-test`** matrices under one workflow: **312**, **312deb**, **devel-nightly** — one pinned DB image each).

**Naming:** `<node>-<cjs|esm>-312` | `…-312deb` | `…-devel-nightly`

### `integration-tests-given-db-image-full-matrix` (24 jobs)

Runs when **`docker-img`** is set (**Trigger Pipeline**). Uses that image for every cell.

| Axis | Values |
|------|--------|
| **Node** (executor) | `n20`, `n22`, `n23` → `cimg/node` 20.18 / 22.16 / 23.5 |
| **Topology** (`STARTER_MODE`) | `single`, `cluster` |
| **SSL** | `true`, `false` (HTTPS vs HTTP; `NODE_TLS_REJECT_UNAUTHORIZED=0` when SSL) |
| **Module system** | `cjs`, `esm` |

**Docker DB image:** `<<pipeline.parameters.docker-img>>`.

**Job count:** 3 × 2 × 2 × 2 = **24** jobs.

**Naming:** `<node>-<topology>-ssl<true|false>-<cjs|esm>`

---

## 3) Shared job: `node-test` (per matrix cell)

1. **Timeout** — background cancel after 15 minutes (`CIRCLE_TOKEN` API cancel).
2. **Checkout**
3. **Remote Docker** — for `./docker/start_db.sh`.
4. **Start DB** — `bash ./docker/start_db.sh` with env: `DOCKER_IMAGE` (matrix image), `STARTER_MODE` (topology), `STARTER_DOCKER_IMAGE` (`docker.io/arangodb/arangodb-starter:0.18.5`), `SSL`, and `COMPRESSION` (command default `false`; not matrixed on `node-test`).
5. **Apt** — `jq`, `curl`.
6. **`npm install`**
7. **Tests** — builds `SCHEME` (`http` or `https` when `ssl` is `true`, with `NODE_TLS_REJECT_UNAUTHORIZED=0` for TLS); then:
   - **single:** `TEST_ARANGODB_URL="${SCHEME}://172.28.0.1:8529"`
   - **cluster:** `TEST_ARANGODB_URL="${SCHEME}://172.28.0.1:8529,${SCHEME}://172.28.0.1:8539,${SCHEME}://172.28.0.1:8549"` and `TEST_ARANGO_LOAD_BALANCING_STRATEGY=ROUND_ROBIN`
   - `ARANGO_RELEASE` = matrix `docker-img`, `CI=true`, then `npm run test:cjs` or `npm run test:esm`.

`start_db.sh` leaves **root password empty**; **`TEST_ARANGODB_URL`** has **no** `user:pass@` (Node `fetch`); the driver sends **Basic `root:`** by default.

---

## 4) Operational usage

### Default (PR / push)

- Trigger pipeline **without** setting `docker-img` (leave default empty).
- Runs **`integration-tests-multi-runtime-multi-db-image`** → **18** jobs.

### Cluster, SSL, or a specific image (`:latest`, preview, etc.)

1. In CircleCI: **Trigger Pipeline** → pipeline parameter **`docker-img`** = full reference, e.g.  
   `docker.io/arangodb/enterprise:latest`  
   `docker.io/arangodb/enterprise:3.12`  
   or  
   `docker.io/arangodb/enterprise-preview:devel-nightly`
2. Runs **`integration-tests-given-db-image-full-matrix`** only → **24** jobs (single + cluster × SSL × modules).

---

## 5) Parallelism and cost (orientative)

- **Default pipeline:** roughly **18 × medium** executor-minutes per push (plus startup overhead per job).
- **`docker-img` set:** **24** jobs.

---

## 6) See also

- [GitHub Actions vs CircleCI](github-vs-circleci.md) — matrix sizes, topology/SSL, and jobs only on one side.