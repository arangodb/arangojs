# GitHub Actions vs CircleCI — test coverage comparison

This document compares the **`Tests`** workflow in [`.github/workflows/tests.yml`](../.github/workflows/tests.yml) with the CircleCI setup in [`.circleci/config.yml`](config.yml). For Circle-only details (steps, naming, pipeline parameters), see [CircleCI workflow guide](README.md).

## Triggers and `stable` branch

| | **GitHub** | **CircleCI** |
|---|------------|--------------|
| **When** | `on.push` only (no `pull_request` in this workflow) | Workflows run on pushes / pipeline triggers per project defaults |
| **`stable`** | `branches-ignore: stable` | Each matrix job: `filters.branches.ignore: stable` |

## Does GitHub Actions run cluster topology?

**No.** The `node` job uses a single `services` container (`arangodb`) and `TEST_ARANGODB_URL: http://arangodb:8529` — one coordinator, not a starter-deployed cluster with multiple endpoints.

**On CircleCI, cluster runs only when you set pipeline parameter `docker-img`** (workflow **`integration-tests-given-db-image-full-matrix`**): `STARTER_MODE=cluster`, comma-separated `172.28.0.1` coordinator ports **8529 / 8539 / 8549**, and `TEST_ARANGO_LOAD_BALANCING_STRATEGY=ROUND_ROBIN` in `node-test`.

The **default** CircleCI pipeline (`docker-img` empty) runs only **`integration-tests-multi-runtime-multi-db-image`** — **single** topology and **HTTP**, matching GitHub `node`.

---

## Coverage comparison table

| Dimension | **GitHub `tests.yml` — `node` job** | **CircleCI — `node-test` workflows** |
|-----------|-------------------------------------|--------------------------------------|
| **Runner / image** | `ubuntu-latest`; test job runs in `node:<version>-alpine` | `cimg/node` executors **20.18 / 22.16 / 23.5** (`n20` / `n22` / `n23`); **remote Docker** for DB |
| **Topology** | Single instance only (`services.arangodb`, `TEST_ARANGODB_URL: http://arangodb:8529`) | **Default (`docker-img` empty):** single only (`integration-tests-multi-runtime-multi-db-image`). **`docker-img` set:** single + cluster (`integration-tests-given-db-image-full-matrix`). |
| **SSL** | HTTP only | **Default:** HTTP only. **`docker-img` set:** HTTP + HTTPS (`ssl` matrix `true` / `false`; `NODE_TLS_REJECT_UNAUTHORIZED=0` when HTTPS). |
| **Node versions** | 20, 22, 23 (matrix `node-version`) | 20, 22, 23 (executors above) |
| **Module system** | `cjs` + `esm` | `cjs` + `esm` |
| **ArangoDB images** | **Three** matrix images: `arangodb/enterprise:3.12`, `arangodb/enterprise:3.12-deb`, `arangodb/enterprise-preview:devel-nightly` | **Default:** those three under `docker.io/...` (`integration-tests-multi-runtime-multi-db-image`). **`docker-img` set:** whichever image you pass (`integration-tests-given-db-image-full-matrix`), e.g. `:latest` or a preview tag. |
| **`ARANGO_RELEASE` / image tag** | Set to the matrix image string for tests | Set to matrix `docker-img` (full reference) |
| **DB auth** | `ARANGO_NO_AUTH: 1` on the service; `ARANGO_LICENSE_KEY` from secrets | `start_db.sh` sets root password **empty**; `TEST_ARANGODB_URL` without userinfo; driver uses Basic `root:` |
| **Resource** | GitHub-hosted defaults | `node-test` defaults to `resource_class: medium` |

### Jobs only on GitHub

| Item | Notes |
|------|--------|
| **`web` job** | **3** matrix cells (same **three** `arangodb-version` images as `node`, fixed **Node 20** `node:20` container). Runs `smoke-test.mjs` with Chrome / Puppeteer — **not** in CircleCI `config.yml`. |
| **`promote` job** | Runs only when `github.ref == refs/heads/main` after `node` + `web` succeed; force-updates `stable` — **not** in CircleCI unless you add an equivalent. |

### Jobs only on CircleCI (vs GitHub `node`)

| Item | Notes |
|------|--------|
| **Cluster** | Only when **`docker-img`** is set (`integration-tests-given-db-image-full-matrix`). |
| **SSL matrix** | Only when **`docker-img`** is set; HTTPS uses certs / env from `docker/` via `start_db.sh`. |
| **Starter image** | `STARTER_DOCKER_IMAGE: docker.io/arangodb/arangodb-starter:0.18.5` in the `start-db` command env. |

---

## Approximate matrix sizes

| CI | Count | Calculation |
|----|-------|-------------|
| **GitHub `node`** | **18** | 3 `node-version` × 3 `arangodb-version` × 2 `module-system` |
| **GitHub `web`** | **3** | 3 `arangodb-version` (Node 20 only; no module matrix) |
| **CircleCI `node-test`** (`docker-img` empty) | **18** | `integration-tests-multi-runtime-multi-db-image`: 3 × 3 × 2 (single / HTTP) |
| **CircleCI `node-test`** (`docker-img` set) | **24** | `integration-tests-given-db-image-full-matrix`: 3 × 2 × 2 × 2 |

When **`docker-img`** is empty, only **`integration-tests-multi-runtime-multi-db-image`** runs. When **`docker-img`** is set, only **`integration-tests-given-db-image-full-matrix`** runs.

---

## Summary

- **GitHub** prioritizes **several DB image variants** on a **single** server (`ARANGO_NO_AUTH: 1`, `push` only in `tests.yml`).
- **CircleCI** default matches that **shape** (**integration-tests-multi-runtime-multi-db-image**). **Cluster + SSL** and testing **`enterprise:latest`** (or any chosen image) require triggering with **`docker-img`** (**integration-tests-given-db-image-full-matrix**). Auth follows `start_db.sh` (empty root password).

Failures that appear only on **cluster** in CircleCI do **not** run on the **default** Circle pipeline anymore; they appear when **`docker-img`** is set. They remain invisible to the GitHub `node` job, because GitHub never runs cluster.

---

## Cluster CI — test adjustments (driver suite)

Some failures are inherent to **multi-coordinator + `ROUND_ROBIN`** (e.g. Foxx using **server-local paths** while requests hit different coordinators). The suite mitigates that as follows:

| Symptom | Mitigation in tests |
|---------|---------------------|
| `database not found` right after `createDatabase` | `waitForPropagation` on `/_api/version` for the new DB before `version()` / version checks (`04-transactions.ts`). |
| Foxx “not allowed to read files in this path …” for **local** server paths | **Pin** the Foxx `Database` to the **first** coordinator URL with **`loadBalancingStrategy: "NONE"`** when `TEST_ARANGODB_URL` lists multiple hosts (`22-foxx-api.ts`), so install / replace / upgrade with **`localJsFile` / `localZipFile` / `localDir`** stay on one node. Single-URL setups are unchanged. |
| Vector index tests **timeout** | **120s** Mocha timeout when multiple coordinator URLs + non-`NONE` load balancing (`11-managing-indexes.ts`). |
| **`config.maxRetries` conflict test** | **120s** / **300s** Mocha timeouts (0 vs 100 retries); on cluster + LB, **25** parallel queries per **wave** instead of 1000 at once to avoid coordinator overload / “cluster internal HTTP connection broken” (`31-conflicts.ts`). |
