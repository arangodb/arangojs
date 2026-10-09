# Architecture and ownership

Paths are repository-relative. This is a navigation map for maintainers, not a
replacement for reading the implementation and tests being changed.

## Package shape

arangojs is a single TypeScript package. It exposes the default `arangojs`
factory and `Database` from `src/index.ts`, while the wildcard entries in
`package.json#exports` expose compiled domain modules such as
`arangojs/collections`, `arangojs/connection`, and `arangojs/errors`.

| Area                                                                                          | Responsibility                                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                                                                                | Default entry point and top-level `arangojs`, `aql`, and `Database` exports.                                                                                     |
| `src/databases.ts`                                                                            | `Database` facade, shared connection access, database-relative request prefixing, cached domain handles, and database-level APIs.                                |
| `src/collections.ts`, `graphs.ts`, `views.ts`                                                 | Stateful domain handles, their public types, and related endpoint operations.                                                                                    |
| `src/documents.ts`, `indexes.ts`, `queries.ts`                                                | Shared public option/result types and helpers used by database and collection operations.                                                                        |
| `src/transactions.ts`, `cursors.ts`, `jobs.ts`                                                | Stateful transaction, cursor-batch, iteration, and asynchronous-job behavior.                                                                                    |
| `src/users.ts`, `services.ts`, `administration.ts`, `cluster.ts`, `hot-backups.ts`, `logs.ts` | Administrative and server-management APIs. Some operations are deployment-, edition-, or topology-specific.                                                      |
| `src/connection.ts`                                                                           | Fetch host creation, optional Undici setup, request shaping, task queueing, host selection, retry/conflict handling, response parsing, and connection lifecycle. |
| `src/configuration.ts`                                                                        | Public client configuration and authentication types.                                                                                                            |
| `src/errors.ts`                                                                               | Network, Fetch, HTTP, system, timeout, abort, and ArangoDB error types and retry-safety classification.                                                          |
| `src/routes.ts`                                                                               | Low-level arbitrary route access; deprecated for ArangoDB 4.0 and later.                                                                                         |
| `src/aql.ts`                                                                                  | Safe AQL template construction and AQL value helpers.                                                                                                            |
| `src/lib/`                                                                                    | Internal path, header, timer, ID, linked-list, and error-code utilities.                                                                                         |
| `src/test/`                                                                                   | Numbered Mocha integration and regression tests plus shared runtime configuration.                                                                               |

Public option and result types generally live beside the domain they describe.
Before creating a new module or abstraction, inspect the nearest operation with
the same endpoint and result lifetime.

## Request lifecycle

A representative operation follows this path:

```text
Public Database/domain-handle method and TypeScript options
-> Database.request prefixes /_db/<encoded database name>
-> Connection.request merges defaults and request options
-> headers/body/content type are normalized and a task is queued
-> Connection._runQueue selects a host and calls the host Fetch wrapper
-> the response body or ArangoDB error envelope is parsed
-> an operation-specific transform returns a value, handle, cursor, or job
```

`Database.request` normally returns `parsedBody`; callers can supply a transform
or request the processed response. Database child objects retain a `Database`
reference and send requests through it. New `Database` objects created from an
existing database share its `Connection`; cached database and domain handles are
therefore part of identity and lifecycle behavior.

Dynamic database names are encoded in `Database.request`. Individual operations
remain responsible for their own endpoint paths, encoded path segments, query
parameters, headers, and bodies. Use `src/lib/util.ts` and neighboring operations
rather than assembling subtly different paths or headers.

## Connection and transport

`Connection` owns a bounded task queue. `_runQueue` chooses an explicit host,
dirty-read host, round-robin host, or active host according to request options
and configuration. It also records server queue-time headers, converts response
errors, and schedules the next queued task.

The normal transport uses the runtime's global `fetch`, `Request`, `Response`,
and `Headers`. When `agentOptions` are supplied, `createHost` lazily imports the
optional `undici` peer dependency and creates an Undici `Agent`. Unix-domain
sockets also require this path. Changes here must account for Node and browser
globals, lazy optional dependency loading, cancellation, hooks, and connection
cleanup.

Retry behavior is intentionally layered:

- a `503` with `x-arango-endpoint` redirects follow-up work to the leader;
- conflicts retry only when `retryOnConflict` permits it;
- network or ArangoDB failures retry only when the error is marked safe, no
  explicit host pins the request, and the configured budget permits it;
- host rotation and dirty-read host selection follow different paths.

Read `src/errors.ts`, the actual request defaults, and the retry regression tests
before changing any of these conditions. Apparent HTTP idempotence alone is not
proof that replay is safe after a request may have reached the server.

## Stateful operations

`BatchCursor` retains the server cursor ID, optional next-batch ID, host URL, and
dirty-read flag. Continuation requests use that state so they reach the correct
server context. `Cursor` supplies item-wise iteration over the same batches.
Preserve lazy fetching, exhaustion, explicit close/disposal, and error behavior.

`Job` retains a database, server job ID, response/error transforms, and cached
load state. `Database.createJob` traps one request and turns the stored async ID
into a `Job`; result polling, cancellation, and deletion are separate endpoints.
Transactions likewise carry server-side state and headers across operations.

## Build and documentation boundaries

TypeScript source deliberately imports sibling modules with `.js` extensions so
emitted ESM resolves correctly. The configs produce:

- `build/esm/` from `tsconfig.esm.json`;
- `build/cjs/` from `tsconfig.cjs.json`, including its local CommonJS
  `package.json`;
- declarations and declaration maps under `build/` from `tsconfig.dts.json`.

The build also derives a publishable `build/package.json`, substitutes the
package version in emitted connection files through lifecycle hooks, and copies
license/Markdown files. Treat all of `build/` as generated. `tsdoc/` is generated
by TypeDoc using `typedoc.json`; public TSDoc in `src/` is the editing point.

The browser smoke test bundles `build/esm/index.js` with esbuild and calls a live
server through a same-origin proxy in headless Chrome. A Node-only build does not
prove browser compatibility.
