# Change guide

Read only the sections that touch the task. Paths are repository-relative.

## Public APIs and wire mapping

For a new or changed endpoint, trace a neighboring operation with the same
request and response shape. Update the applicable pieces together:

- public option, selector, description, result, and generic types;
- the method on `Database` or the appropriate domain handle;
- overloads, public exports, TSDoc links, examples, and deprecation/version
  notes;
- request method, path, query, headers, body, binary flags, and response
  transform;
- focused regression coverage in the corresponding numbered test area.

Do not copy an endpoint from another language driver without checking the
current ArangoDB HTTP API and nearby arangojs conventions. Server endpoints may
differ by version, topology, edition, or response envelope.

Preserve omitted values versus explicit `false`, zero, empty strings, and
`null`. An omitted option can ask the server to choose a default; serializing an
explicit value can be a different contract. Build conditional query/body fields
the same way neighboring operations do.

Encode every user-controlled path segment with the established helpers or
`encodeURIComponent` at the same boundary as adjacent methods. Keep database
prefixing in `Database.request`. Pass query data through `search`, request
headers through `headers`, and payloads through `body`; do not move values
between locations because they appear equivalent.

`Connection.request` JSON-stringifies ordinary object bodies, assigns content
types, handles binary data, Blob/FormData details, and optionally forces content
length. Avoid pre-serializing user data unless the neighboring API requires a
raw representation. Check empty, multibyte, binary, and form payload behavior
when changing request shaping.

Response transforms commonly return `parsedBody`, unwrap an envelope, construct
a handle/cursor/job, or use headers/status. Preserve the raw-response path for
operations that depend on status or headers. For `HEAD`, binary, empty, and
non-JSON responses, follow `Connection` parsing rules rather than assuming a
JSON body.

### Errors and hooks

JSON error responses with an ArangoDB error envelope become `ArangoError`;
other HTTP failures become `HttpError`; transport failures become the relevant
`NetworkError` subtype. Preserve response, request, status, ArangoDB error
number, cause, and retry-safety information. Do not catch and replace errors in
a domain method unless its documented contract requires a transformation.

Request/response hooks can be asynchronous. Preserve when they run and whether
they receive a response or error, including timeout, abort, redirect, and Fetch
failure paths. Never expose credentials or bearer tokens in diagnostics or
tests.

Some endpoints report failures inside an otherwise successful response. Check
neighboring operations for per-document errors in bulk results, silent-result
options, conditional status codes, transaction envelopes, and dirty-read
metadata before simplifying a return type or transform. Preserve item order and
the distinction between a top-level request failure and an item-level error.

### Server capabilities

If behavior differs by server version, topology, or edition, isolate only the
actual difference. Use current live-version helpers in tests when the server is
the authority. Do not turn a temporary failure into a broad skip. For cluster
features, assess coordinator choice, dirty reads, propagation, and leader
behavior as applicable.

## Connection, retries, and transport

Before changing `src/connection.ts`, identify which layer owns the behavior:

- `createHost` owns Fetch implementation choice, Undici agent creation,
  per-host URL/socket behavior, cancellation, and low-level hooks;
- `Connection.request` merges defaults, normalizes headers and bodies, attaches
  transaction/dirty-read headers, and enqueues work;
- `_runQueue` owns concurrency, host selection, response parsing, error
  conversion, retry decisions, and task completion;
- `setHostList`, `addToHostList`, `acquireHostList`, and propagation logic own
  discovery and host-list changes.

For configuration changes, trace the value from its public type in
`src/configuration.ts`, through `Database` and `Connection` construction, into
`_commonRequestOptions`, `_commonFetchOptions`, or the consuming request path.
Confirm whether a per-request value overrides, merges with, or inherits the
connection default; do not rely on type-level exposure alone.

Distinguish a failure known to occur before sending from an ambiguous failure
after sending. Preserve `isSafeToRetry`, explicit-host behavior, retry budgets,
round-robin semantics, leader redirects, and conflict retry accounting. Test a
single host and multiple hosts where the change affects both. Never make all
network failures retryable as a convenience.

Keep the task pool moving on success, retry, hook failure, and rejection. Check
that queued work settles exactly once and that abort controllers, timers, and
connections are cleaned up. Preserve user-provided `fetchOptions`, headers,
authentication, and hook behavior.

Changes involving `agentOptions` or Unix sockets must test missing Undici and
the lazily loaded Undici path. HTTP/2 behavior is exercised through Undici's
`allowH2`; it is not equivalent to the default global-Fetch path. Changes to
web globals or Node-only APIs also require a browser-bundling assessment.

## Stateful operations

For cursors, preserve server cursor IDs, next-batch IDs, host affinity,
dirty-read routing, count/extra metadata, lazy item and batch iteration,
exhaustion, and cleanup. Check both batch and item views. A change that works for
the initial query may still break continuation or disposal.

For asynchronous jobs, preserve the trapped request's response and error
transforms, async ID header, pending `204` behavior, loaded-result cache,
cancellation, and deletion. Test the original operation's result shape as well
as job management endpoints.

For transactions, preserve transaction headers and the ownership/lifetime of
the shared `Database` and `Connection`. For cached collection, graph, analyzer,
view, and database handles, do not accidentally change identity or invalidate
the wrong cache entry.

## Packaging, dependencies, and runtimes

Check `package.json`, all TypeScript configs, package exports, and the actual
emitted layouts together. A change is incomplete if it works only in ESM,
CommonJS, or declarations. Preserve `.js` source import specifiers and validate
both `import` and `require` when entry points or module wiring changes.

Use the Node.js versions in `.circleci/config.yml` for development validation;
the current matrix exercises Node.js 22 and 24. `package.json#engines` still
declares `>=20`, which remains a published packaging contract until maintainers
explicitly change it. Do not introduce a runtime API or dependency that violates
that declared range, and do not raise the range as an incidental part of another
change. The driver normally relies on web-platform globals and has minimal
production dependencies. Keep Undici optional unless the requested contract
deliberately changes that model.

Dependency changes can affect TypeScript declarations, package size, browser
bundling, optional peer installation, and CommonJS interop even when compilation
passes. Inspect the built package metadata and run the prepare/import checks
when applicable. Do not edit `build/package.json` directly.

When public behavior changes, update source TSDoc and relevant README or
migration guidance. Change `CHANGELOG.md` or package version only when the task
or release process explicitly requires it; do not revise released entries.
