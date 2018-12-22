# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [6.10.0] - 2018-12-22

### Changed

- Changed Views API to match 3.4 GA implementation

  This release updates the Views API to the version implemented in the final
  ArangoDB 3.4 GA release. Please note that these changes may break code
  written for earlier ArangoDB 3.4 release candidates.

### Added

- Added `timeout` option to `db.query` and request methods ([#572](https://github.com/arangodb/arangojs/issues/572))

  Note that this merely cancels the request. Queries will still be executed
  and ArangoDB will still continue processing the request, this will merely
  result in the socket being forcefully disconnected.

- Added query management API ([#474](https://github.com/arangodb/arangojs/issues/474))

  This implements most endpoints of https://docs.arangodb.com/3.4/HTTP/AqlQuery/.

## [6.9.0] - 2018-11-07

### Changed

- Restored support for credentials in URLs

  If the server URL includes credentials, arangojs will now use them instead of
  the default username "root" and an empty password. Any credentials explicitly
  set using `useBasicAuth` or `useBearerAuth` will still override the default
  credentials as before.

## [6.8.0] - 2018-11-07

### Changed

- Added `any[]` to allowed types for AQL bind parameters

  This should help in some cases where the previous TypeScript annotation
  was too restrictive.

### Added

- Added support for UNIX socket URLs ([#405](https://github.com/arangodb/arangojs/issues/405))

  In addition to the `unix:///socket/path` and `http+unix:///socket/path`
  URL formats recognized by ArangoDB, arangojs also supports the format
  `http://unix:/socket/path` commonly supported in the Node ecosystem and
  automatically converts ArangoDB endpoint URLs between them.

## [6.7.0] - 2018-10-24

### Changed

- No longer emitting `undefined` values in `aql` template strings

  Previously using `undefined` values in an aql template string would result
  in a bind parameter being added with no value, which would always lead to an
  error response when ArangoDB executes the query.
  Now undefined values will simply be omitted, also easing the conditional
  insertion of query fragments.

- Changed experimental Views API

  This release updates the experimental support for the Views API to the version
  implemented in the ArangoDB 3.4 release candidate. Please note that this API
  is still subject to change and may indeed still change until the 3.4.0 GA release.

- Updated TypeScript to version 3

  This may result in type signatures that are incompatible with TypeScript 2
  being added in future releases (including patch releases).

### Added

- Added nesting support for `aql` template strings ([#481](https://github.com/arangodb/arangojs/issues/481))

  It is now possible to use aql queries as values in `aql` template strings:

  ```js
  function createQuery(flowers, color) {
    const filter = color ? aql`FILTER flower.color == ${color}` : undefined;
    return aql`FOR flower IN ${flowers} ${filter} RETURN flower`;
  }
  createQuery(db.collection("flowers", "green"));
  // FOR flower IN @@value0 FILTER @value1 RETURN flower
  // {"@value0": "flowers", "value1": "green"}
  createQuery(db.collection("flowers"));
  // FOR flower IN @@value0  RETURN flower
  // {"@value0": "flowers"}
  ```

  Previously aql fragments could only be created with `aql.literal`, which
  does not support bind parameters:

  ```js
  aql.literal("FILTER flower.color == " + JSON.stringify(color));
  // Note that we had to rely on JSON.stringify to correctly escape the value
  // because the value is part of the literal, not a bind parameter
  ```

- Added support for `undefined` and AQL literals to `aql.literal`

  Passing undefined to `aql.literal` will now result in an empty literal as
  would be expected. Passing an AQL literal back into `aql.literal` will return
  the existing literal rather than the string `[object Object]`.

- Added `aql.join` function

  The function `aql.join` can be used to convert an array of `aql` queries into
  a combined query:

  ```js
  const users = db.collection("users");
  const keys = ["a", "b", "c"];
  const fragments = keys.map(key => aql`DOCUMENT(${users}, ${key})`);
  const combined = aql`[${aql.join(fragments, ", ")}]`;
  // [DOCUMENT(@@value0, @value1), DOCUMENT(@@value0, @value2), \
  // DOCUMENT(@@value0, @value3)]
  // {"@value0": "users", "value1": "a", "value2": "b", "value3": "c"}
  const query = aql`FOR user IN ${combined} RETURN user.email`;
  // FOR user IN [DOCUMENT(@@value0, @value1), DOCUMENT(@@value0, @value2), \
  // DOCUMENT(@@value0, @value3)] RETURN user.email
  // {"@value0": "users", "value1": "a", "value2": "b", "value3": "c"}
  ```

- Added `allowDirtyRead` option to `db.query` and `collection.document`

  Dirty reads are supported in leader/follower replication setups and require
  ArangoDB 3.4 or later. When performing a request that permits dirty reads,
  arangojs will load balance across all know leaders and followers and instruct
  ArangoDB to allow responding with stale or dirty response data. Note that
  data returned from a dirty read may be out of date or inconsistent.

## [6.6.0] - 2018-08-28

### Changed

- Reimplemented `collection.import`

  The previous implementation was broken. The new implementation should be backwards-compatible
  in cases where it previously wasn't broken but is more flexible and also handles buffers.

### Fixed

- Added missing dependency on `@types/node` ([#567](https://github.com/arangodb/arangojs/issues/567))

  This should solve TypeScript errors when the dependency was not already added.

## [6.5.1] - 2018-08-15

### Fixed

- Fixed `edgeCollection.save` not respecting options ([#554](https://github.com/arangodb/arangojs/issues/554))

- Fixed `database.createDatabase` TypeScript signature ([#561](https://github.com/arangodb/arangojs/issues/561))

## [6.5.0] - 2018-08-03

### Changed

- Requests that fail because a server can not be reached are now automatically
  retried if other servers are available

  This behavior can be controlled using the `maxRetries` option.

- Renamed `EdgeCollection#edge` to `EdgeCollection#document`

  `EdgeCollection#edge` is now an alias for the `document` method.

- Renamed `GraphEdgeCollection#edge` to `GraphEdgeCollection#document`

  `GraphEdgeCollection#edge` is now an alias for the `document` method.

- Renamed `GraphVertexCollection#vertex` to `GraphVertexCollection#document`

  `GraphVertexCollection#vertex` is now an alias for the `document` method.

### Added

- Added `maxRetries` option to configuration to control retry behavior

- Added `collection.documentExists` method

- Added `graceful` option to `collection.document`

## [6.4.0] - 2018-07-06

### Changed

- Added TypeScript validation for `opts` in `DocumentCollection#save`

### Added

- Added `ArangoError` and `CollectionType` to public exports

- Added `database.close` method

- Added `opts` parameter to `EdgeCollection#save`

## [6.3.0] - 2018-06-20

### Added

- Added `database.version` method

- Added `database.login` method

- Added `database.exists` method

- Added `collection.exists` method

- Added `graph.exists` method

- Added `aql.literal` function

- Exposed typings for collections and graphs ([@samrg472](https://github.com/samrg472) in [#538](https://github.com/arangodb/arangojs/pull/538))

### Fixed

- Fixed synchronous errors during request creation not being handled

  Internal errors thrown while a request is created (e.g. malformed URIs) would
  result in unhandled errors, which could result in termination of the process
  or promises never being rejected. These errors are now handled normally and
  will result in async rejections as expected.

## [6.2.4] - 2018-04-27

### Fixed

- Ensure `res.body` is an empty string instead of null in the browser version

## [6.2.3] - 2018-04-03

### Fixed

- Fixed `collection.update(documentHandle, newValue, opts)` missing return value

- Fixed `collection.removeByKeys(keys, options)` missing return value

- Fixed `collection.replaceByExample(example, newValue, opts)` missing return value

- Fixed `collection.updateByExample(example, newValue, opts)` missing return value

## [6.2.2] - 2018-03-21

### Fixed

- Replaced `Object.values` use to improve Node version compatibility

  This allows using arangojs in Node.js 6 LTS without a polyfill.

## [6.2.1] - 2018-03-21

### Changed

- Moved most documentation out of the README ([#123](https://github.com/arangodb/arangojs/issues/123))

  This is a necessary step to integrate arangojs with the Drivers book in the official ArangoDB documentation.

- Replaced internal use of async functions with callbacks

  This removes some unnecessary layers of indirection, which should increase overall performance.

### Fixed

- Increased test coverage ([#34](https://github.com/arangodb/arangojs/issues/34)).

## [6.2.0] - 2018-03-06

### Changed

- Extended `db.transaction` arguments ([@f5io](https://github.com/f5io) in [#494](https://github.com/arangodb/arangojs/pull/494))

  It's now possible to pass additional transaction options.

### Fixed

- Fixed `db.acquireHostList` request path ([@jcambass](https://github.com/jcambass) in [#504](https://github.com/arangodb/arangojs/pull/504))

- Fixed a typo ([@lodestone](https://github.com/lodestone) in [#506](https://github.com/arangodb/arangojs/pull/506))

- Fixed `graphEdgeCollection.edge` return value ([@Hunter21007](https://github.com/Hunter21007) in [#501](https://github.com/arangodb/arangojs/pull/501))

- Fixed graph API sending incorrect requests resulting in HTTP 400 errors ([@casdevs](https://github.com/casdevs) in [#513](https://github.com/arangodb/arangojs/pull/513))

## [6.1.0] - 2018-02-12

### Removed

- Removed ES modules build

  This should solve compatibility problems with `es6-error`. The cjs
  build now should also work with emulated ES module imports.

### Changed

- Use `cpy-cli` for build process

  Should help with cross-platform compatibility.

### Fixed

- Fixed `db.uninstallService(mount, opts)` opts default value

- Fixed `db.getServiceConfiguration(mount, minimal)` minimal representation

- Fixed `db.getServiceDependencies(mount, minimal)` minimal representation

- Fixed `db.updateServiceConfiguration(mount, cfg, minimal)` non-minimal representation

- Fixed `db.replaceServiceConfiguration(mount, cfg, minimal)` non-minimal representation

- Fixed `db.updateServiceDependencies(mount, cfg, minimal)` non-minimal representation

- Fixed `db.replaceServiceDependencies(mount, cfg, minimal)` non-minimal representation

- Fixed handling of non-json responses

## [6.0.1] - 2018-01-22

### Changed

- Use `rimraf` for build process

  Should help with cross-platform compatibility.

### Fixed

- Fixed some imports broken during the TypeScript rewrite

  If you were previously seeing errors involving a `default` property,
  this should make those go away.

## [6.0.0] - 2018-01-11

### Removed

- Removed `retryConnection` config.

  It is not possible to reliably determine whether retrying a request
  is safe or not at the driver level. If you need automatic retry, you
  should implement your own logic, e.g. using the
  [retry](https://yarnpkg.com/en/package/retry) package.

- Removed `promise` config.

  If you want to use an alternative promise implementation
  you need to overwrite the `Promise` global variable directly.

- Asynchronous functions no longer support node-style callbacks.

  All asynchronous functions now return promises.

- Removed support for credentials in `url` config.

  Use `db.useBasicAuth` or `db.useBearerAuth` to pass credentials instead.

- Removed bower support.

  Use yarn/npm instead.

### Changed

- The `url` config can now also be an array of URLs.

  The behavior depends on the load balancing strategy (see API docs).

- The `databaseName` config has been replaced with `isAbsolute`.

  If you previously used `databaseName: false`, the same behavior can now
  be achieved using `isAbsolute: true`. If you want to use a specific
  database you can still switch databases with `db.useDatabase` at any time.

- Browser: maximum number of parallel connections behaves differently.

  As keep-alive does not work reliably in the browser, the maximum number
  of parallel connections now matches `agentOptions.maxSockets` exactly.

- TypeScript: ported arangojs to TypeScript.

  The generated typings are now included in the NPM release and should
  be more reliable than the community maintained typings included with
  earlier versions of arangojs.
  See also [#480](https://github.com/arangodb/arangojs/issues/480).

### Added

- Added ES Modules and browser build to NPM release.

  - ES Modules files live under `lib/esm/`
  - CommonJS files live under `lib/cjs/`
  - Precompiled browser build lives at `lib/web.js`

- Added support for load balancing and failover.

  See API documentation for details.

- Added `acquireHostList` method.

  See API documentation for details.

- Added support for leader/follower failover.

  Connections to a follower responding with an endpoint redirect
  will now be transparently redirected to the indicated leader.

### Fixed

- Fixed [#354](https://github.com/arangodb/arangojs/issues/354)

  Graph methods now only return the relevant part of the response body.

[6.10.0]: https://github.com/arangodb/arangojs/compare/v6.9.0...v6.10.0
[6.9.0]: https://github.com/arangodb/arangojs/compare/v6.8.0...v6.9.0
[6.8.0]: https://github.com/arangodb/arangojs/compare/v6.7.0...v6.8.0
[6.7.0]: https://github.com/arangodb/arangojs/compare/v6.6.0...v6.7.0
[6.6.0]: https://github.com/arangodb/arangojs/compare/v6.5.1...v6.6.0
[6.5.1]: https://github.com/arangodb/arangojs/compare/v6.5.0...v6.5.1
[6.5.0]: https://github.com/arangodb/arangojs/compare/v6.4.0...v6.5.0
[6.4.0]: https://github.com/arangodb/arangojs/compare/v6.3.0...v6.4.0
[6.3.0]: https://github.com/arangodb/arangojs/compare/v6.2.4...v6.3.0
[6.2.4]: https://github.com/arangodb/arangojs/compare/v6.2.3...v6.2.4
[6.2.3]: https://github.com/arangodb/arangojs/compare/v6.2.2...v6.2.3
[6.2.2]: https://github.com/arangodb/arangojs/compare/v6.2.1...v6.2.2
[6.2.1]: https://github.com/arangodb/arangojs/compare/v6.2.0...v6.2.1
[6.2.0]: https://github.com/arangodb/arangojs/compare/v6.1.0...v6.2.0
[6.1.0]: https://github.com/arangodb/arangojs/compare/v6.0.1...v6.1.0
[6.0.1]: https://github.com/arangodb/arangojs/compare/v6.0.0...v6.0.1
[6.0.0]: https://github.com/arangodb/arangojs/compare/v5.8.0...v6.0.0
