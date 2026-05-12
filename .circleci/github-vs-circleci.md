# GitHub Actions vs CircleCI — test coverage comparison

This document compares the **`Tests`** workflow in [`.github/workflows/tests.yml`](../.github/workflows/tests.yml) with the CircleCI setup in [`.circleci/config.yml`](config.yml). For Circle-only details (steps, naming, pipeline parameters), see [CircleCI workflow guide](README.md).

## Triggers and `stable` branch

| | **GitHub** | **CircleCI** |
|---|------------|--------------|
| **When** | `on.push` only (no `pull_request` in this workflow) | Workflows run on pushes / pipeline triggers per project defaults |
| **`stable`** | `branches-ignore: stable` | Each matrix job: `filters.branches.ignore: stable` |

## Does GitHub Actions run cluster topology?

**No.** The `node` job uses a single `services` container (`arangodb`) and `TEST_ARANGODB_URL: http://arangodb:8529` — one coordinator, not a starter-deployed cluster with multiple endpoints.

**On CircleCI, cluster + multi-endpoint URLs run whenever a matrix cell uses `topology: cluster`** (default pipeline and manual trigger).

1. **Default pipeline** (`docker-img` empty): workflow **`integration-tests-multi-runtime-multi-db-image`** — **both** pinned images (`enterprise:3.12` and `enterprise-preview:4.0-nightly`) use **`topology: single, cluster`** and **`ssl: true, false`**. For cluster cells, `node-test` sets comma-separated `172.28.0.1` coordinator ports **8529 / 8539 / 8549** and `TEST_ARANGO_LOAD_BALANCING_STRATEGY=ROUND_ROBIN`.

2. **Manual trigger** (`docker-img` set): workflow **`integration-tests-given-db-image-full-matrix`** runs the same topology × SSL × module × Node matrix for **your** image.

The **default** CircleCI pipeline therefore exercises **cluster** and **HTTPS** for **3.12** and **4.0-nightly** (unlike GitHub `node`, which is always single-instance HTTP).

---

## Coverage comparison table

| Dimension | **GitHub `tests.yml` — `node` job** | **CircleCI — `node-test` workflows** |
|-----------|-------------------------------------|--------------------------------------|
| **Runner / image** | `ubuntu-latest`; test job runs in `node:<version>-alpine` | `cimg/node` executors **22.17** and **24.4** (`n22` / `n24`); **remote Docker** for DB |
| **Topology** | Single instance only (`services.arangodb`, `TEST_ARANGODB_URL: http://arangodb:8529`) | **Default (`docker-img` empty):** **single + cluster** for both pinned images. **`docker-img` set:** single + cluster for every cell. |
| **SSL** | HTTP only | **Default:** **HTTP + HTTPS** (`ssl` matrix `true` / `false`; `NODE_TLS_REJECT_UNAUTHORIZED=0` when HTTPS) for both pinned images. **`docker-img` set:** HTTP + HTTPS for all cells. |
| **Node versions** | 20, 22, 23 (matrix `node-version`) | **22, 24** (matches arangojs **supported LTS pair** on CircleCI; GitHub matrix may differ until updated). |
| **Module system** | `cjs` + `esm` | `cjs` + `esm` |
| **ArangoDB images** | **Three** matrix images: `arangodb/enterprise:3.12`, `arangodb/enterprise:3.12-deb`, `arangodb/enterprise-preview:devel-nightly` | **Default:** `enterprise:3.12` and `enterprise-preview:4.0-nightly` (`integration-tests-multi-runtime-multi-db-image`). **`docker-img` set:** whichever image you pass (`integration-tests-given-db-image-full-matrix`). |
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
| **Cluster** | On the **default** pipeline, for any cell with `topology: cluster` (**3.12** and **4.0-nightly**). When **`docker-img`** is set, for every cluster cell (`integration-tests-given-db-image-full-matrix`). |
| **SSL matrix** | On the **default** pipeline, for **both** pinned images (`ssl: true` / `false`; HTTPS uses `docker/` via `start_db.sh`). When **`docker-img`** is set, for every cell. |
| **Starter image** | `STARTER_DOCKER_IMAGE: docker.io/arangodb/arangodb-starter:0.18.5` in the `start-db` command env. |

---

## Approximate matrix sizes

| CI | Count | Calculation |
|----|-------|-------------|
| **GitHub `node`** | **18** | 3 `node-version` × 3 `arangodb-version` × 2 `module-system` |
| **GitHub `web`** | **3** | 3 `arangodb-version` (Node 20 only; no module matrix) |
| **CircleCI `node-test`** (`docker-img` empty) | **32** | `integration-tests-multi-runtime-multi-db-image`: **3.12** — 2 × 2 × 2 × 2 = **16**; **4.0-nightly** — **16** |
| **CircleCI `node-test`** (`docker-img` set) | **16** | `integration-tests-given-db-image-full-matrix`: 2 × 2 × 2 × 2 |

When **`docker-img`** is empty, only **`integration-tests-multi-runtime-multi-db-image`** runs. When **`docker-img`** is set, only **`integration-tests-given-db-image-full-matrix`** runs.

---

## Summary

- **GitHub** prioritizes **several DB image variants** on a **single** server (`ARANGO_NO_AUTH: 1`, `push` only in `tests.yml`).
- **CircleCI** default pipeline runs **cluster** and **HTTPS** for **both** pinned images (**3.12** and **4.0-nightly**), **32** jobs total. To run the same matrix against **another** image, trigger with **`docker-img`** (**integration-tests-given-db-image-full-matrix**, **16** jobs). Auth follows `start_db.sh` (empty root password).

Failures that appear only on **cluster** or **HTTPS** can surface on the **default** CircleCI pipeline for **either** pinned image; they still do not run on the GitHub `node` job, because GitHub never runs cluster or HTTPS in that workflow.

---

## Cluster CI — test adjustments (driver suite)

Some failures are inherent to **multi-coordinator + `ROUND_ROBIN`** (e.g. Foxx using **server-local paths** while requests hit different coordinators). The suite mitigates that as follows:

| Symptom | Mitigation in tests |
|---------|---------------------|
| `database not found` right after `createDatabase` | `waitForPropagation` on `/_api/version` for the new DB before `version()` / version checks (`04-transactions.ts`). |
| Foxx “not allowed to read files in this path …” for **local** server paths | **Pin** the Foxx `Database` to the **first** coordinator URL with **`loadBalancingStrategy: "NONE"`** when `TEST_ARANGODB_URL` lists multiple hosts (`22-foxx-api.ts`), so install / replace / upgrade with **`localJsFile` / `localZipFile` / `localDir`** stay on one node. Single-URL setups are unchanged. |
| Vector index tests **timeout** | **120s** Mocha timeout when multiple coordinator URLs + non-`NONE` load balancing (`11-managing-indexes.ts`). |
| **`config.maxRetries` conflict test** | **120s** / **300s** Mocha timeouts (0 vs 100 retries); on cluster + LB, **25** parallel queries per **wave** instead of 1000 at once to avoid coordinator overload / “cluster internal HTTP connection broken” (`31-conflicts.ts`). |
