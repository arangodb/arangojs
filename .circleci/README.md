# CircleCI Workflow Guide (`.circleci/config.yml`)

## 1) Purpose

CircleCI validates **arangojs** using one parameterized job, **`node-test`**, combined into matrices inside **two workflows** (depending on pipeline parameter `docker-img`).

**Node.js:** executors track the **two active LTS** releases supported by arangojs (**22.x** and **24.x** as of the current policy).

| Pipeline parameter `docker-img` | Workflow | DB coverage |
|-----------------------------------|----------|-------------|
| Empty (default) | **`integration-tests-multi-runtime-multi-db-image`** only | Two pinned images; **each** runs **Node 22 / 24** × `cjs`/`esm` × **single + cluster** × **SSL on/off** × **HTTP stack `h1` / `h2`** (**32** jobs per image, **64** total). |
| Non-empty | **`integration-tests-given-db-image-full-matrix`** only | Your image × full matrix: topology **single + cluster**, SSL **on/off**, **HTTP stack `h1` / `h2`** (**32** jobs) |

**Secrets:** set **`ARANGO_LICENSE_KEY`** on the CircleCI project (or context) when using Enterprise images.

**Branches:** each matrix job has `filters.branches.ignore: stable` (same intent as GitHub `branches-ignore: stable` on `push`).

---

## 2) Matrix dimensions

### `integration-tests-multi-runtime-multi-db-image` (64 jobs)

Runs when `docker-img` is **empty**. There are **two** `node-test` matrix blocks (one per pinned DB image). Both use the **same** axes below.

| Axis | Values |
|------|--------|
| **ArangoDB image** | Block 1: `docker.io/arangodb/enterprise:3.12` — Block 2: `docker.io/arangodb/enterprise-preview:4.0-nightly` |
| **Node** | `n22`, `n24` → `cimg/node` **22.17**, **24.4** |
| **Topology** | `single`, `cluster` (`STARTER_MODE`) |
| **SSL** | `true`, `false` (HTTPS vs HTTP; `NODE_TLS_REJECT_UNAUTHORIZED=0` when SSL) |
| **HTTP stack** | `h1`, `h2` → exports `TEST_ARANGO_HTTP_VERSION=1.1` or `2.0`; integration tests set undici **`agentOptions.allowH2`** (`false` / `true`). **HTTP/2 is negotiated with HTTPS** (ALPN); plain HTTP stays HTTP/1.1, but both cells still pin the client stack for coverage. |
| **Module system** | `cjs`, `esm` |

**Job count per block:** 2 × 2 × 2 × 2 × 2 = **32**. **Total:** 32 + 32 = **64** jobs.

**Naming:** `<node>-<topology>-ssl<true|false>-<h1|h2>-<cjs|esm>-312` | `<node>-<topology>-ssl<true|false>-<h1|h2>-<cjs|esm>-4.0-nightly`

### `integration-tests-given-db-image-full-matrix` (32 jobs)

Runs when **`docker-img`** is set (**Trigger Pipeline**). Uses that image for every cell.

| Axis | Values |
|------|--------|
| **Node** (executor) | `n22`, `n24` → `cimg/node` 22.17 / 24.4 |
| **Topology** (`STARTER_MODE`) | `single`, `cluster` |
| **SSL** | `true`, `false` (HTTPS vs HTTP; `NODE_TLS_REJECT_UNAUTHORIZED=0` when SSL) |
| **HTTP stack** | `h1`, `h2` (same as default pipeline) |
| **Module system** | `cjs`, `esm` |

**Docker DB image:** `<<pipeline.parameters.docker-img>>`.

**Job count:** 2 × 2 × 2 × 2 × 2 = **32** jobs.

**Naming:** `<node>-<topology>-ssl<true|false>-<h1|h2>-<cjs|esm>`

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
   - **HTTP stack:** `TEST_ARANGO_HTTP_VERSION=1.1` (`h1`) or `2.0` (`h2`) for `src/test/_config.ts` (undici `allowH2`).
   - `ARANGO_RELEASE` = matrix `docker-img`, `CI=true`, then `npm run test:cjs` or `npm run test:esm`.

`start_db.sh` leaves **root password empty**; **`TEST_ARANGODB_URL`** has **no** `user:pass@` (Node `fetch`); the driver sends **Basic `root:`** by default.

---

## 4) Operational usage

### Default (PR / push)

- Trigger pipeline **without** setting `docker-img` (leave default empty).
- Runs **`integration-tests-multi-runtime-multi-db-image`** → **64** jobs (32 on **3.12** + 32 on **4.0-nightly**; both include single/cluster, HTTP/HTTPS, and **h1/h2**).

### Custom DB image

1. In CircleCI: **Trigger Pipeline** → pipeline parameter **`docker-img`** = full reference, e.g.  
   `docker.io/arangodb/enterprise:latest`  
   `docker.io/arangodb/enterprise:3.12`  
   or  
   `docker.io/arangodb/enterprise-preview:devel-nightly`
2. Runs **`integration-tests-given-db-image-full-matrix`** only → **32** jobs (single + cluster × SSL × **h1/h2** × modules × nodes).

---

## 5) Parallelism and cost (orientative)

- **Default pipeline:** roughly **64 × medium** executor-minutes per push (plus startup overhead per job).
- **`docker-img` set:** **32** jobs.

---

## 6) See also

- [GitHub Actions vs CircleCI](github-vs-circleci.md) — matrix sizes, topology/SSL, and jobs only on one side.
