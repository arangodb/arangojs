# CircleCI Workflow Guide (`.circleci/config.yml`)

## 1) Purpose

CircleCI validates **arangojs** using one parameterized job, **`node-test`**, combined into matrices inside **two workflows**. Exactly **one** workflow runs per pipeline:

| Pipeline parameter `docker-img` | Workflow | DB image |
|---------------------------------|----------|----------|
| Empty (default) | `test-enterprise-latest` | `docker.io/arangodb/enterprise:latest` |
| Non-empty | `test-docker-img-parameter` | Value of `docker-img` (full image reference) |

Each workflow expands to **24** parallel **`node-test`** jobs (`3 × 2 × 2 × 2`).

**Secrets:** set **`ARANGO_LICENSE_KEY`** on the CircleCI project (or context) when using Enterprise images.

**Branches:** each matrix job has `filters.branches.ignore: stable` (same intent as GitHub `branches-ignore: stable` on `push`).

---

## 2) Matrix dimensions (both workflows)

| Axis | Values |
|------|--------|
| **Node** (executor) | `n20`, `n22`, `n23` → `cimg/node` 20.18 / 22.16 / 23.5 |
| **Topology** (`STARTER_MODE`) | `single`, `cluster` |
| **SSL** | `true`, `false` (HTTPS vs HTTP; `NODE_TLS_REJECT_UNAUTHORIZED=0` when SSL) |
| **Module system** | `cjs`, `esm` → `npm run test:cjs` / `npm run test:esm` |

**Docker DB image**

- **`test-enterprise-latest`:** fixed `docker.io/arangodb/enterprise:latest`.
- **`test-docker-img-parameter`:** single matrix entry `<<pipeline.parameters.docker-img>>`.

**Job count:** 3 × 2 × 2 × 2 = **24** jobs per workflow.

**Naming**

- Latest workflow: `latest-<node>-<topology>-ssl<true|false>-<cjs|esm>`
- Parameter workflow: `param-<node>-<topology>-ssl<true|false>-<cjs|esm>`

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

### Default (PR / push): Enterprise `:latest`, full matrix

- Trigger pipeline **without** setting `docker-img` (leave default empty).
- Runs **`test-enterprise-latest`** → **24** jobs.

### Validate another image (preview / pinned tag)

1. In CircleCI: **Trigger Pipeline** → add pipeline parameter **`docker-img`** = full reference, e.g.  
   `docker.io/arangodb/enterprise:3.12`  
   or  
   `docker.io/arangodb/enterprise-preview:devel-nightly`
2. Runs **`test-docker-img-parameter`** only → **24** jobs against that image.

**Note:** Only **one** of the two workflows runs per pipeline, so you see **24** jobs total per pipeline, not 48.

---

## 5) See also

- [GitHub Actions vs CircleCI](github-vs-circleci.md) — matrix sizes, topology/SSL, and jobs only on one side.
