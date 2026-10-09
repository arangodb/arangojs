# arangojs agent instructions

arangojs is the official TypeScript/JavaScript ArangoDB driver. Source under
`src/` provides an asynchronous public API over Fetch, with ESM, CommonJS, and
declaration outputs plus browser support.

For features, bug fixes, API or type changes, connection behavior, dependencies,
tests, or refactoring, use the
[arangojs development skill](.agents/skills/arangojs-development/SKILL.md).
Open its references only as needed. Agents without skill discovery can read the
same files directly.

## Environment and baseline checks

- Use Node.js 22 or 24 and npm for development and validation; these are the
  versions exercised by the current CI matrix. `package.json#engines` still
  declares `>=20`, but that install-time range does not mean Node.js 20 is
  covered by current CI. Match the exact executor and server setup in
  `.circleci/config.yml` when reproducing CI behavior.
- `npm run build` is the database-free baseline. It recreates `build/`, compiles
  ESM, CommonJS, and declarations, builds package metadata, and copies text
  files. Its scripts require Unix-style tools including `rm`, `mkdir`, `jq`,
  `sed`, `cat`, and `cp`; use an environment that provides them.
- `npm test` is not a unit-only check. Its `pretest` hook builds, then it runs
  the ESM Mocha suite against an ArangoDB server. `npm run test:esm` and
  `npm run test:cjs` assume a fresh compatible build already exists.
- Do not edit `build/` or `tsdoc/`. Change their source inputs instead.

## Compatibility boundaries

- Preserve public TypeScript types, runtime behavior, wire behavior, and TSDoc
  unless the task explicitly changes the contract. Package wildcard exports
  make the domain modules under `src/` part of the supported import surface.
- Preserve ESM, CommonJS, and declaration output together. Source imports use
  `.js` specifiers intentionally even though the source files are `.ts`.
- Keep the CI-tested Node.js 22 and 24 runtimes, global Fetch implementations,
  browser bundling, and optional Undici behavior in mind. `undici` is a peer
  dependency loaded lazily when `agentOptions` or Unix-domain-socket support
  requires it. Treat any change to the currently declared `>=20` package engine
  range as an explicit compatibility and release decision.
- Select validation for affected variants: supported ArangoDB versions,
  single-server/cluster, TLS, HTTP/1.1/HTTP/2, ESM/CommonJS, Node versions, and
  browser use. One green variant does not establish all of them.
- Preserve omission versus explicit `false`, zero, empty string, and `null` in
  request options. Keep parameters in their specified path, query, header, or
  body location and encode dynamic path segments consistently with neighboring
  operations.
- Do not broaden connection retries casually. A replay after an ambiguous
  network outcome can duplicate a write. Preserve host affinity for cursor
  batches and other stateful follow-up requests.

## Testing boundaries

- Integration tests create and drop databases, collections, users, and other
  server state. Use only a disposable ArangoDB deployment; do not run suites
  concurrently against a shared server.
- Local tests default to `http://127.0.0.1:8529` with `root` and an empty
  password. Use `TEST_ARANGODB_URL` for another disposable endpoint. Read
  `src/test/_config.ts`, the relevant fixture, and
  [the testing guide](.agents/skills/arangojs-development/references/testing.md)
  before running a focused or expanded test.
- Version or topology skips must represent real server capabilities. Prefer
  the live server version helpers where nearby tests use them; do not hide a
  regression behind a broad configured-version check.
- Do not run publishing, release, or documentation deployment workflows as
  local validation.

## Change scope and reporting

- Follow nearby code and tests. Avoid unrelated formatting, dependency,
  version, changelog, migration-guide, or CI changes.
- Update public types, overloads, TSDoc, examples, and regression tests together
  when behavior changes. Do not rewrite released changelog entries.
- Treat source, `package.json`, TypeScript configs, tests, Docker helpers, and CI
  definitions as evidence of current behavior. If this guidance has drifted,
  follow the executable configuration and report the drift.
- Before handing off, review the diff for generated output and contract drift.
  Report the change, compatibility implications, checks actually run and their
  results, and relevant variants not tested. Distinguish environment limits from
  product failures.
