# CircleCI Workflow Guide (`.circleci/config.yml`)

## 1) Purpose

CircleCI validates **arangojs** using one parameterized job, `**node-test`**, wired into **several workflows** (depending on pipeline parameter `docker-img`).

**Node.js:** `package.json` `engines.node` requires **>=20**; CircleCI executors exercise the **current LTS pair** (**22.x** and **24.x**).


| Pipeline parameter `docker-img` | Workflows                                                                                                                      | DB / coverage                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Empty** (default)             | `**integration-single-topology`**, `**integration-cluster-topology**`, `**integration-http-proto-smoke**`, `**browser-smoke**`, `**compat-typescript**` | **40** jobs total (36 DB/browser + 4 TypeScript consumer compat).                                                                                      |
| **Non-empty**                   | **`integration-tests-given-db-image`**, **`integration-http-proto-smoke-given-db-image`**, **`browser-smoke-given-db-image`** | **19** jobs total (16 + 2 + 1); same split as the default pipeline |

### Secrets and context

| Name | Used for |
| ---- | -------- |
| **`ARANGO_LICENSE_KEY`** | Enterprise images in `docker/start_db.sh` (project or context) |
| **`DOCKER_HUB_USER`** / **`DOCKER_HUB_PASSWORD`** | `login-docker-hub` before image pulls (context **`docker-hub`**) |

All integration and browser jobs attach **`context: docker-hub`**.

### Runners and Docker

| Job | Executor | Resource class |
| --- | -------- | -------------- |
| **`node-test`** | `n22` / `n24` | `arangodb/medium-arm64-privileged` |
| **`browser-smoke`** | `n24-browser` (`cimg/node:24.4`) | `arangodb/medium-amd64-privileged` |

- **`setup-docker`** — install Docker CLI, start in-container `dockerd` (DinD).
- **`login-docker-hub`** — before **`start-db`** (avoids anonymous pull rate limits).
- No `setup_remote_docker` / `machine: true`.

**Branches:** `filters.branches.ignore: stable` on every job.

### ArangoDB images (default pipeline)

| Role | Image |
| ---- | ----- |
| Enterprise **3.12** | `gcr.io/gcr-for-testing/arangodb/enterprise:3.12` |
| Enterprise **4.0-nightly** | `gcr.io/gcr-for-testing/arangodb/enterprise-preview:4.0-nightly` |
| Starter | `docker.io/arangodb/arangodb-starter:0.18.5` |

---

## 2) Default pipeline (`docker-img` empty) — **40 jobs**

Five workflows run in parallel (`when: not <<pipeline.parameters.docker-img>>`).

### A) `integration-single-topology` (**16** jobs)

**Topology** is fixed to `**single`** (passed as job parameter, not matrixed).


| Axis               | Values                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **ArangoDB image** | Block 1: `enterprise:3.12` — Block 2: `enterprise-preview:4.0-nightly`                                               |
| **Node**           | `n22`, `n24`                                                                                                         |
| **SSL**            | `true`, `false`                                                                                                      |
| **Module system**  | `cjs`, `esm`                                                                                                         |
| **HTTP stack**     | **Not matrixed** — uses job default `**http_proto: h1`** → `TEST_ARANGO_HTTP_VERSION=1.1` (undici `allowH2: false`). |


**Per block:** 2 × 2 × 2 = **8** jobs. **Total A:** 8 + 8 = **16**.

**Naming:** `single-<node>-ssl<true|false>-<cjs|esm>-312` | `single-...-4.0-nightly`

### B) `integration-cluster-topology` (**16** jobs)

Same matrix as (A), topology **`cluster`** (`TEST_ARANGODB_URL` = three coordinators + `ROUND_ROBIN`).

**Naming:** `cluster-<node>-ssl<ssl>-<cjs|esm>-312` | `cluster-...-4.0-nightly`

### C) `integration-http-proto-smoke` — **2 jobs**

| Setting | Value |
| ------- | ----- |
| **Image** | `gcr.io/gcr-for-testing/arangodb/enterprise:3.12` |
| **Topology** | `single` |
| **SSL** | `true` |
| **Node** | `n24` |
| **Module** | `esm` |
| **HTTP** | `http-proto-h1-smoke` → `h1`; `http-proto-h2-smoke` → `h2` |

### D) `browser-smoke` — **2 jobs**

Puppeteer + `smoke-test.mjs` (esbuild browser bundle, `db.version()` in headless Chrome).

| Setting | Value |
| ------- | ----- |
| **Images** | Same GCR tags as 3.12 / 4.0-nightly above |
| **Executor** | `n24-browser` (AMD64) |
| **Chrome** | Google Chrome stable **amd64** `.deb` |
| **Smoke HTTP** | Express on **8559** (`SMOKE_PORT`); proxy → **`ARANGO_PROXY_TARGET`** `172.28.0.1:8529` |

**Naming:** `browser-smoke-312`, `browser-smoke-4.0-nightly`

### E) `compat-typescript` — **4 jobs** (no ArangoDB / Docker)

Builds and packs the publishable driver tarball once, then typechecks it as a consumer on TypeScript **5.4**, **6.0**, and **7.0** (see `compat-test/`).

| Job | Role |
| --- | ---- |
| **`compat-pack`** | `npm install --ignore-scripts`, `npm run build`, `npm pack` → workspace `arangojs-pack.tgz` |
| **`compat-consumer-ts5`** | Install pack + `typescript@5.4.5`, `npx tsc --noEmit` |
| **`compat-consumer-ts6`** | Install pack + `typescript@6.0.3`, `npx tsc --noEmit` |
| **`compat-consumer-ts7`** | Install pack + `typescript@7.0.2`, `npx tsc --noEmit` |

**Grand total (empty `docker-img`):** 16 + 16 + 2 + 2 + 4 = **40** jobs.

---

## 3) Manual pipeline (`docker-img` set) — **19** jobs (three workflows)

All run when **`docker-img`** is set (Trigger Pipeline). They use the same **`<<pipeline.parameters.docker-img>>`** for every job.

### A) `integration-tests-given-db-image` (**16** jobs)


| Axis                | Values                                          |
| ------------------- | ----------------------------------------------- |
| **Docker DB image** | `<<pipeline.parameters.docker-img>>`            |
| **Node**            | `n22`, `n24`                                    |
| **Topology**        | `single`, `cluster`                             |
| **SSL**             | `true`, `false`                                 |
| **Module system**   | `cjs`, `esm`                                    |
| **HTTP**            | Default `**h1`** only (no `http_proto` matrix). |


**Job count:** 2 × 2 × 2 × 2 = **16**.

**Naming:** `<node>-<topology>-ssl<true|false>-<cjs|esm>`

### B) `integration-http-proto-smoke-given-db-image` (**2** jobs)

Same fixed stack as default workflow (C), with **`docker-img`** as the pipeline parameter:


| Setting      | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| **Image**    | `<<pipeline.parameters.docker-img>>`                       |
| **Topology** | `single`                                                   |
| **SSL**      | `true`                                                     |
| **Node**     | `n24`                                                      |
| **Module**   | `esm`                                                      |
| **HTTP**     | `http-proto-h1-smoke` → `h1`; `http-proto-h2-smoke` → `h2` |


### C) `browser-smoke-given-db-image` (**1** job)


| Setting      | Value                                |
| ------------ | ------------------------------------ |
| **Image**    | `<<pipeline.parameters.docker-img>>` |
| **Topology** | `single` (HTTP)                      |
| **Node**     | `n24`                                |


**Naming:** `browser-smoke`

**Grand total (set `docker-img`):** 16 + 2 + 1 = **19** jobs.

---

## 4) Shared jobs: `node-test` and `browser-smoke`

### `node-test`

1. **Timeout** — background cancel after 15 minutes (`CIRCLE_TOKEN` API cancel).
2. **Checkout**
3. **Setup Docker** — install CLI, start in-container `dockerd` if needed, `docker info`.
4. **Login Docker Hub** — `docker login` (needs `DOCKER_HUB_USER` / `DOCKER_HUB_PASSWORD`).
5. **Start DB** — `bash ./docker/start_db.sh` (`DOCKER_IMAGE`, `STARTER_MODE`, `STARTER_DOCKER_IMAGE`, `SSL`).
6. **Apt** — `jq`, `curl`.
7. **`npm install`**
8. **Tests** — `SCHEME` / `TEST_ARANGODB_URL` / `TEST_ARANGO_LOAD_BALANCING_STRATEGY`; `TEST_ARANGO_HTTP_VERSION` from `http_proto`; `npm run test:cjs` or `npm run test:esm`.

`start_db.sh` leaves **root password empty**; `**TEST_ARANGODB_URL`** has **no** `user:pass@`; the driver sends **Basic `root:`** by default.

### `browser-smoke`

Same Docker setup and **`login-docker-hub`** → **`start-db`** (single, HTTP) as integration, then:

1. Install Google Chrome (AMD64)
2. `npm install`, `npm run build` (`PUPPETEER_SKIP_DOWNLOAD=true`)
3. `node smoke-test.mjs` with `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable`, `ARANGO_PROXY_TARGET=172.28.0.1:8529`

---

## 5) Operational usage

### Default (PR / push)

- Do **not** set `docker-img`.
- Runs **40** jobs across the five workflows above (single matrix + cluster matrix + HTTP proto smoke + browser smoke + TypeScript consumer compat).

### Custom DB image

1. **Trigger Pipeline** → set **`docker-img`** to the full image reference.
2. Runs **three workflows** in parallel (**19** jobs): **`integration-tests-given-db-image`** (16), **`integration-http-proto-smoke-given-db-image`** (2), **`browser-smoke-given-db-image`** (1).

