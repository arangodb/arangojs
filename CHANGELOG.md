# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

This driver uses semantic versioning:

- A change in the bugfix version (e.g. X.Y.0 -> X.Y.1) indicates internal
  changes and should always be safe to upgrade.
- A change in the minor version (e.g. X.1.Z -> X.2.0) indicates additions and
  backwards-compatible changes that should not affect your code.
- A change in the major version (e.g. 1.Y.Z -> 2.0.0) indicates _breaking_
  changes that require changes in your code to upgrade.

## [10.1.2] - 2025-06-30

### Added

- Added vector index support

## [10.1.1] - 2025-01-13

### Changed

- Removed `File` from `source` option types in Foxx CRUD methods ([#818](https://github.com/arangodb/arangojs/issues/818))

  The `source` option type already includes `Blob`, which `File` extends.

## [10.1.0] - 2025-01-13

### Added

- Added `ignoreRevs` option to `RemoveDocumentOptions` type (DE-947)

  This affects the `collection.remove` and `collection.removeAll` methods.

## [10.0.0] - 2025-01-06

This is a major release and breaks backwards compatibility.

See [the migration guide](./MIGRATING.md#v9-to-v10) for detailed instructions
for upgrading your code to arangojs v10.

### Removed

- Removed unused `CreateUserOptions` type

  The actual type used by the `db.createUser` method is still `UserOptions`.

- Removed unused `IndexDetails` type

  This type was intended to be returned by `collection.indexes` when the
  `withStats` option is set to `true` but the `figures` property is already
  included in the current return type.

- Removed Node.js 18 support

  Node.js 18 will reach its end of life in May 2025, so arangojs will no
  longer support this version of Node.js going forward.

  For more information, see [the Node.js release schedule](https://nodejs.dev/en/about/releases/).

### Changed

- Closing a connection now closes all open requests

  Previously in certain situations only the most recent request would be
  closed per server. Note that this still merely aborts the requests but
  does not guarantee the underlying connections are closed as these are
  handled by Node.js or the browser natively. need to be installed
  otherwise.

- Moved fetch-specific `config` options from into `config.fetchOptions`

  The following options were moved: `credentials`, `headers` and `keepalive`.

- `db.setUserAccessLevel` now takes `grant` as a separate parameter

  The parameter was previously passed as an additional property in the
  `options` parameter.

#### Error handling

- Errors encountered before a request completes are now wrapped in a
  `NetworkError` or a subclass thereof

  This should help making it easier to diagnose network issues and distinguish
  the relevant error conditions.

  The originating error can still be accessed using the `cause` property of the
  `NetworkError` error.

- `HttpError` now extends the `NetworkError` class

  This allows treating all non-`ArangoError` errors as one category of errors,
  even when there is no server response available.

- `db.waitForPropagation` now throws a `PropagationTimeoutError` error when
  invoked with a `timeout` option and the timeout duration is exceeded

  The method would previously throw the most recent error encountered while
  waiting for replication. The originating error can still be accessed using
  the `cause` property of the `PropagationTimeoutError` error.

- `db.waitForPropagation` now respects the `timeout` option more strictly

  Previously the method would only time out if the timeout duration was
  exceeded after the most recent request failed. Now the timeout is
  recalculated and passed on to each request, preventing it from exceeding
  the specified duration.

  If the propagation timed out due to an underlying request exceeding the
  timeout duration, the `cause` property of the `PropagationTimeoutError`
  error will be a `ResponseTimeoutError` error.

- `config.beforeRequest` and `config.afterResponse` callbacks can now return
  promises

  If the callback returns a promise, it will be awaited before the request
  and response cycle proceeds. If either callback throws an error or returns
  a promise that is rejected, that error will be thrown instead.

- `config.afterResponse` callback signature changed

  The callback signature previously used the internal `ArangojsResponse` type.
  The new signature uses the `Response` type of the Fetch API with an
  additional `request` property to more accurately represent the actual value
  it receives as the `parsedBody` property will never be present.

- `response` property on `ArangoError` is now optional

  This property should always be present but this allows using the error in
  situations where a response might not be available.

#### General type changes

- Changed `GraphVertexCollection` and `GraphEdgeCollection` generic types to
  take separate `EntryResultType` and `EntryInputType` type parameters

- Changed `db.collection`, `db.createCollection` and `db.createEdgeCollection`
  methods to take separate `EntryResultType` and `EntryInputType` type
  parameters

  These type parameters are used to narrow the the returned collection type.

- Changed `db.removeUser` method return type to `Promise<void>`

  The previous return type served no purpose.

- Changed `QueueTimeMetrics` type to an interface

- Changed `CursorExtras` and `CursorStats` interfaces to types

#### Low-level request/route changes

- Renamed `path` option to `pathname` in `RequestOptions` type

  This affects the `db.waitForPropagation` and `route.request` methods.

- Removed `basePath` option from `RequestOptions` type

  This affects the `db.waitForPropagation` and `route.request` methods.

- Renamed `route.path` property to `route.pathname`

#### Renamed methods

- Renamed various methods for consistency:

  Methods that return an array now follow the `listNouns` pattern, methods that
  return a "list of nouns" wrapped in an object have been renamed to follow the
  `getNouns` pattern to avoid confusion:

  - `db.listServiceScripts` -> `db.getServiceScripts`
  - `db.listHotBackups` -> `db.getHotBackups`
  - `db.listFunctions` -> `db.listUserFunctions`
  - `db.getLogMessages` -> `db.listLogMessages`

- Renamed AQL user function management methods:

  - `db.createFunction` -> `db.createUserFunction`
  - `db.dropFunction` -> `db.dropUserFunction`

#### Module renaming

- Renamed most modules to plural form for consistency

  The following modules were renamed:

  - `arangojs/analyzer` -> `arangojs/analyzers`
  - `arangojs/collection` -> `arangojs/collections`
  - `arangojs/cursor` -> `arangojs/cursors`
  - `arangojs/database` -> `arangojs/databases`
  - `arangojs/error` -> `arangojs/errors`
  - `arangojs/graph` -> `arangojs/graphs`
  - `arangojs/job` -> `arangojs/jobs`
  - `arangojs/route` -> `arangojs/routes`
  - `arangojs/transaction` -> `arangojs/transactions`
  - `arangojs/view` -> `arangojs/views`

- Moved internal utility functions to new `arangojs/lib/util` module

  These methods are all still marked as internal and should not be used
  directly.

#### Moved types

- Moved document related types from `arangojs/collection` module to
  `arangojs/documents` module

  The following types were moved: `DocumentOperationFailure`,
  `DocumentOperationMetadata`, `DocumentExistsOptions`,
  `CollectionReadOptions`, `CollectionBatchReadOptions`,
  `CollectionInsertOptions`, `CollectionReplaceOptions`,
  `CollectionUpdateOptions`, `CollectionRemoveOptions`,
  `CollectionImportOptions`, `CollectionEdgesOptions`,
  `CollectionImportResult` and `CollectionEdgesResult`

- Moved index related types from `arangojs/collection` module to
  `arangojs/indexes` module

  The following types were moved: `IndexListOptions`.

- Moved transaction related types from `arangojs/database` module to
  `arangojs/transactions` module

  The following types were moved: `TransactionCollections`,
  `TransactionOptions` and `TransactionDetails`.

- Moved cluster related types from `arangojs/database` module to new
  `arangojs/clusters` module

  The following types were moved: `ClusterImbalanceInfo`,
  `ClusterRebalanceState`, `ClusterRebalanceOptions`, `ClusterRebalanceMove`
  and `ClusterRebalanceResult`.

- Moved hot backup related types from `arangojs/database` module to new
  `arangojs/hot-backups` module

  The following types were moved: `HotBackupOptions`, `HotBackupResult` and
  `HotBackupList`.

- Moved query related types from `arangojs/database` module to new
  `arangojs/queries` module

  The following types were moved: `QueryOptions`, `ExplainOptions`,
  `ExplainPlan`, `ExplainStats`, `SingleExplainResult`, `MultiExplainResult`,
  `AstNode`, `ParseResult`, `QueryCachePropertiesOptions`, `QueryCacheEntry`,
  `QueryCacheProperties`, `QueryOptimizerRule`, `QueryTracking`,
  `QueryTrackingOptions`, `QueryInfo` and `AqlUserFunction`.

- Moved service related types from `arangojs/database` module to new
  `arangojs/services` module

  The following types were moved: `InstallServiceOptions`,
  `ReplaceServiceOptions`, `UpgradeServiceOptions`, `UninstallServiceOptions`,
  `ServiceSummary`, `ServiceInfo`, `ServiceConfiguration`,
  `SingleServiceDependency`, `MultiServiceDependency`, `ServiceTestStats`,
  `ServiceTestStreamTest`, `ServiceTestStreamReport`, `ServiceTestSuiteTest`,
  `ServiceTestSuite`, `ServiceTestSuiteReport`, `ServiceTestXunitTest`,
  `ServiceTestXunitReport`, `ServiceTestTapReport`, `ServiceTestDefaultTest`,
  `ServiceTestDefaultReport` and `SwaggerJson`.

- Moved user related types from `arangojs/database` module to new
  `arangojs/users` module

  The following types were moved: `AccessLevel`, `ArangoUser`, `UserOptions`,
  `UserAccessLevelOptions` and `CreateDatabaseUser`.

- Moved server administration related types from `arangojs/database` module to
  new `arangojs/administration` module

  The following types were moved: `CompactOptions`, `EngineInfo`,
  `EngineStatsInfo`, `LicenseInfo`, `QueueTimeMetrics`, `ServerAvailability`,
  `ServerStatusInformation`, `SingleServerSupportInfo`, `ClusterSupportInfo`
  and `VersionInfo`.

- Moved configuration related types to new `arangojs/config` module

  The following types were moved: `Config`, `LoadBalancingStrategy`,
  `BasicAuthCredentials` and `BearerAuthCredentials`.

- Moved `ArangoErrorResponse` type to `arangojs/connection` module

  The type is now also no longer marked as internal.

- Moved configuration related types to new `arangojs/configuration` module

  The following types were moved: `ConfigOptions`, `LoadBalancingStrategy`,
  `BasicAuthCredentials` and `BearerAuthCredentials`.

#### Renamed types

- Renamed `Index` types to `IndexDescription` for consistency

  The specific index types were also renamed accordingly:

  - `Index` -> `IndexDescription`
  - `GeoIndex` -> `GeoIndexDescription`
  - `PersistentIndex` -> `PersistentIndexDescription`
  - `PrimaryIndex` -> `PrimaryIndexDescription`
  - `EdgeIndex` -> `EdgeIndexDescription`
  - `TtlIndex` -> `TtlIndexDescription`
  - `FulltextIndex` -> `FulltextIndexDescription`
  - `MdiIndex` -> `MdiIndexDescription`
  - `MdiPrefixedIndex` -> `MdiPrefixedIndexDescription`
  - `InvertedIndex` -> `InvertedIndexDescription`
  - `InternalArangosearchIndex` -> `ArangosearchIndexDescription`
  - `InternalIndex` -> `InternalIndexDescription`
  - `HiddenIndex` -> `HiddenIndexDescription`

  Note that the "Internal" prefix was dropped from `ArangosearchIndexDescription`
  to more accurately reflect the index type name. The index type still refers
  to an internal index, however.

- Renamed various types for consistency:

  Types representing an instance of a specific entity type in ArangoDB like a
  collection, graph or query now follow the `NounDescription` naming pattern:

  - `AqlUserFunction` -> `UserFunctionDescription`
  - `CollectionMetadata` -> `CollectionDescription`
  - `DatabaseInfo` -> `DatabaseDescription`
  - `GraphInfo` -> `GraphDescription`
  - `ServiceInfo` -> `ServiceDescription`
  - `QueryInfo` -> `QueryDescription`
  - `TransactionDetails` -> `TransactionDescription`

  Note that the `TransactionDescription` type used by `db.listTransactions`
  is slightly different from the `TransactionInfo` type used by methods of
  `Transaction` objects due to implementation details of ArangoDB.

  Types representing general information rather than an instance of something
  now generally follow the `NounInfo` naming pattern, whereas types
  representing the result of an operation generally follow the `NounResult`
  or `VerbNounResult` naming pattern:

  - `QueryTracking` -> `QueryTrackingInfo`
  - `ServerStatusInformation` -> `ServerStatusInfo`
  - `CollectionImportResult` -> `ImportDocumentsResult`
  - `CollectionEdgesResult` -> `DocumentEdgesResult`

  Types for options passed to methods now generally follow the `NounOptions`,
  `VerbNounOptions` or `VerbNounAttributeOptions` naming patterns:

  - `Config` -> `ConfigOptions`
  - `TransactionCollections` -> `TransactionCollectionOptions`
  - `CreateDatabaseUser` -> `CreateDatabaseUserOptions`
  - `CollectionDropOptions` -> `DropCollectionOptions`
  - `CollectionTruncateOptions` -> `TruncateCollectionOptions`
  - `IndexListOptions` -> `ListIndexesOptions`

  - Collection document operations:

    - `DocumentExistsOptions` -> `DocumentExistsOptions`
    - `CollectionReadOptions` -> `ReadDocumentOptions`
    - `CollectionBatchReadOptions` -> `BulkReadDocumentsOptions`
    - `CollectionInsertOptions` -> `InsertDocumentOptions`
    - `CollectionReplaceOptions` -> `ReplaceDocumentOptions`
    - `CollectionUpdateOptions` -> `UpdateDocumentOptions`
    - `CollectionRemoveOptions` -> `RemoveDocumentOptions`
    - `CollectionImportOptions` -> `ImportDocumentsOptions`
    - `CollectionEdgesOptions` -> `DocumentEdgesOptions`

  - Graph collection document operation:

    - `GraphCollectionReadOptions` -> `ReadGraphDocumentOptions`
    - `GraphCollectionInsertOptions` -> `CreateGraphDocumentOptions`
    - `GraphCollectionReplaceOptions` -> `ReplaceGraphDocumentOptions`
    - `GraphCollectionRemoveOptions` -> `RemoveGraphDocumentOptions`
    - `ViewPatchPropertiesOptions` -> `UpdateViewPropertiesOptions`

  - View operations:

    - `ArangoSearchViewPatchPropertiesOptions` -> `UpdateArangoSearchViewPropertiesOptions`
    - `SearchAliasViewPatchPropertiesOptions` -> `UpdateSearchAliasViewPropertiesOptions`
    - `SearchAliasViewPatchIndexOptions` -> `UpdateSearchAliasViewIndexOptions`
    - `ArangoSearchViewStoredValueOptions` -> `CreateArangoSearchViewStoredValueOptions`

- Renamed `ArrayCursor` and `BatchedArrayCursor` classes to `Cursor` and
  `BatchCursor` respectively

  The previous name was misleading because it conflicted with how the ArangoDB
  distinguishes between array cursors and streaming cursors in the interactive
  shell. This distinction does not apply to the driver.

- Renamed various types to reduce ambiguity:

  - `ObjectWithId` (in `indexes` module) -> `ObjectWithIndexId`
  - `ObjectWithId` (in `documents` module) -> `ObjectWithDocumentId`
  - `ObjectWithKey` (in `documents` module) -> `ObjectWithDocumentKey`

### Added

- Restored support for Unix domain sockets

  Using Unix domain sockets requires the `undici` library to be installed.

- Restored support for `config.agentOptions`

  The `config.agentOptions` option can now be used to create a custom `undici`
  agent if the `undici` library is installed.

- Added `config.fetchOptions` option

  This option can now be used to specify default options for the `fetch`
  function used by arangojs like `headers`, `credentials`, `keepalive` and
  `redirect`.

- Added `BatchCursor#itemsView` property and `BatchCursorItemsView` interface

  This property provides a low-level interface for consuming the items of the
  cursor and is used by the regular item-wise `Cursor` class internally.

- Added `SystemIndexDescription` type

  This type represents either of the system index types `primary` and `edge`
  and can be used to cast indexes returned by `collection.indexes`.

- Added `ProcessedResponse` type

  This type replaces the previously internal `ArangojsResponse` type and
  extends the native `Response` type with additional properties.

#### Error handling

- Added `config.onError` option (DE-955)

  This option can be used to specify a callback function that will be invoked
  whenever a request results in an error. Unlike `afterResponse`, this callback
  will be invoked even if the request completed but returned an error status.
  In this case the error will be the `HttpError` or `ArangoError` representing
  the error response.

  If the `onError` callback throws an error or returns a promise that is
  rejected, that error will be thrown instead.

- Added support for `config.fetchOptions.redirect` option ([#613](https://github.com/arangodb/arangojs/issues/613))

  This option can now be used to specify the redirect mode for requests.

  When set to `"manual"`, arangojs will throw an `HttpError` wrapping the
  redirect response instead of automatically following redirects.

  Note that when set to `"error"`, the native fetch API will throw a
  non-specific error (usually a `TypeError`) that arangojs will wrap in a
  `FetchFailedError` instead.

- Added optional `ArangoError#request` property

  This property is always present if the error has a `response` property. In
  normal use this should always be the case.

- Added `NetworkError` class

  This is the common base class for all errors (including `HttpError`) that
  occur while making a request. The originating error can be accessed using the
  `cause` property. The request object can be accessed using the `request`
  property.

  Note that `ArangoError` and the new `PropagationTimeoutError` error type
  do not extend `NetworkError` but may wrap an underlying error, which can
  be accessed using the `cause` property.

- Added `ResponseTimeoutError` class

  This error extends `NetworkError` and is thrown when a request deliberately
  times out using the `timeout` option.

- Added `RequestAbortedError` class

  This error extends `NetworkError` and is thrown when a request is aborted
  by using the `db.close` method.

- Added `FetchFailedError` class

  This error extends `NetworkError` and is thrown when a request fails because
  the underlying `fetch` call fails (usually with a `TypeError`).

  In Node.js the root cause of this error (e.g. a network failure) can often be
  found in the `cause` property of the originating error, i.e. the `cause`
  property of the `cause` property of this error.

  In browsers the root cause is usually not exposed directly but can often
  be diagnosed by examining the developer console or network tab.

- Added `PropagationTimeoutError` class

  This error does not extend `NetworkError` but wraps the most recent error
  encountered while waiting for replication, which can be accessed using the
  `cause` property. This error is only thrown when `db.waitForPropagation`
  is invoked with a `timeout` option and the timeout duration is exceeded.

## [9.3.0] - 2025-01-06

### Added

- Added `db.compact` method (DE-906)

- Added `db.engineStats` method (DE-932)

- Added `db.getLicense` and `db.setLicense` methods (DE-949)

- Added `db.listQueryCacheEntries` method (DE-149)

- Added `db.clearQueryCache` method (DE-148)

- Added `db.getQueryCacheProperties` method (DE-150)

- Added `db.setQueryCacheProperties` method (DE-151)

- Added `collection.shards` method (DE-939)

- Added support for `mdi-prefixed` indexes (DE-956)

- Restored `fulltext` index type support (DE-957)

  The `fulltext` index type is still no longer supported for creating new
  indexes but can be used to cast existing indexes from `Index`.

- Added support for `edge` indexes (DE-958)

  The `Index` type now can also be cast to the `EdgeIndex` type.

## [9.2.0] - 2024-11-27

### Added

- Added `db.availability` method

- Added `db.engine` method (DE-931)

- Added `db.status` method ([#811](https://github.com/arangodb/arangojs/issues/811))

- Added `db.supportInfo` method

- Added `keepNull` option to `CollectionInsertOptions` type (DE-946)

  This option was previously missing from the type.

- Added `allowDirtyRead` option to `DocumentExistsOptions` type (DE-945)

  This option was previously missing from the type.

- Added `ignoreRevs` option to `CollectionBatchReadOptions` type (DE-947)

  This option was previously missing from the type.

- Added `options` argument to `CollectionTruncateOptions` type (DE-940)

  There was previously no way to pass options to the `truncate` method.

- Added `database` property to `Analyzer`, `ArrayCursor`, `BatchedArrayCursor`,
  `Collection`, `Graph`, `Job`, `Route`, `Transaction` and `View` (DE-935)

  This property can be used to access the database instance a given object
  belongs to.

- Added `Route#headers` and `Route#path` properties

  These properties can be used to access the headers and path used when creating
  the route.

- Added `ArrayCursor#id` and `BatchedArrayCursor#id` properties (DE-936)

  This property can be used to access the ID of the cursor.

## [9.1.0] - 2024-09-25

### Changed

- Removed `progress` property from `Index` type

  This property is only available when fetching indexes with the `withHidden`
  option set to `true`.

### Added

- Added `HiddenIndex` type (DE-849)

  This type is used to represent an index returned by `collection.indexes` when
  the `withHidden` option is set to `true` and includes the `progress` property
  in addition to internal indexes.

## [9.0.0] - 2024-07-31

This is a major release and breaks backwards compatibility.

See [the migration guide](./MIGRATING.md#v8-to-v9) for detailed instructions
for upgrading your code to arangojs v9.

### Removed

- Removed Node.js 14 and Node.js 16 support

  With Node.js 14 and 16 having reached their end of life, arangojs will no
  longer support these versions of Node.js going forward.

  For more information, see [the Node.js release schedule](https://nodejs.dev/en/about/releases/).

- Removed `Params` and `Headers` types

  These can mostly be replaced with the native `URLSearchParams` and `Headers`
  types but most public methods still accept the equivalent `Record` types for
  convenience.

- Removed deprecated `FulltextIndex` and related types

  Fulltext indexes have been deprecated in ArangoDB 3.10 and should be replaced
  with ArangoSearch.

- Removed browser build

  The browser build has been removed from the repository and will no longer be
  published to npm. The npm package can still be used in the browser by using
  common frontend tooling like webpack or rollup.

- Removed `Collection` methods for simple queries: `list`, `all`, `any`,
  `byExample`, `firstExample`, `removeByExample`, `replaceByExample`,
  `updateByExample`, `lookupByKeys`, `removeByKeys`, `fulltext`

  Simple queries were deprecated in ArangoDB 3.4 and can be replicated with AQL.

### Changed

- Replaced request logic with native `fetch` API ([#788](https://github.com/arangodb/arangojs/issues/788), DE-578, DE-758)

  The node-specific request logic using the `http` and `https` modules has been
  replaced with all-new logic using the web standard `fetch` API, which should
  work in Node.js, browsers and other conformant environments.

- Unicode names are now **no longer** automatically NFC normalized (DE-65)

  This change affects all database, collection, graph, view and analyzer names
  using unicode characters. Starting with arangojs v7.7.0 these names were
  automatically NFC normalized. This behavior has now been reverted to match
  the behavior of other ArangoDB drivers and help detect normalization issues
  in user code.

- Changed return type of `aql` and the AQL `join` helper function to `AqlQuery`

  Previously the internal `GeneratedAqlQuery` type was exposed as the return
  type of these functions, leading to complexity when handling generic type
  arguments.

- Removed dependency on Node `path` module or its browserify equivalent

  This change should be backwards-compatible but may produce different results
  when using non-normalized paths and base-paths in custom `routes`. This
  should help support more environments and reduce the size of the browser
  bundle.

- Inlined `x3-linkedlist` dependency

  Inlining this dependency should help make arangojs more portable.

- Split the Collection type parameter into result and input types ([#807](https://github.com/arangodb/arangojs/issues/807))

  It is now possible to specify a separate type for the data passed when
  creating or modifying documents in addition to the type of the data returned
  when fetching documents. This allows excluding computed properties from
  the input type while still including them in the result type.

### Added

- Added ESM support (DE-236)

  The driver now supports being imported as an ES module or CommonJS module
  and provides exports for both types of environments. This change should be
  backwards-compatible.

- Added support for `withHidden` option in `collection.indexes`

  This option was introduced in ArangoDB 3.10.13 and 3.11.7 and allows
  fetching the progress information of indexes that are in the building phase.

- Added support for `withStats` option in `collection.indexes`

  This method now takes an object with `withStats` and `withHidden` options
  instead of a boolean flag.

- Added readonly `Job#id` property

  This property was not previously exposed.

- Added `skipFastLockRound` option for streaming transactions

  This option was introduced in 3.12.1 and allows skipping the fast lock round.

- Added non-specific `EnsureIndexOptions` type and `ensureIndex` method
  signature ([#778](https://github.com/arangodb/arangojs/issues/778))

  This allows creating indexes without narrowing the index type.

## [8.8.1] - 2024-03-20

### Added

- Added the `versionAttribute` option to the document operation options types (DE-783)

## [8.8.0] - 2024-03-12

### Changed

- Renamed ZKD index type to MDI (DE-744)

  The ZKD index type was previously marked as experimental and has now been
  finalized and renamed to MDI in ArangoDB 3.12.

- Added `DocumentOperationMetadata` and `DocumentOperationFailure` types (DE-693)

  The return types of document and edge operations on collections have been
  modified to correctly represent the return values of bulk operations and
  single document/edge operations using the `overwriteMode` option.

### Deprecated

- Deprecated active failover support (DE-746)

  Active failover is no longer be supported in ArangoDB 3.12 and later. This
  functionality will be removed from the driver in a future release.

### Added

- Added support for `multi_delimiter` analyzer type (DE-753)

- Added support for `wildcard` analyzer type (DE-750)

## [8.7.0] - 2024-02-14

### Changed

- Made `options` argument in `collection.edges`, `inEdges` and `outEdges` optional ([#802](https://github.com/arangodb/arangojs/issues/802))

### Deprecated

- Deprecated `db.getLogMessages`

  This API was deprecated in ArangoDB 3.8 and should no longer be used.
  Use `db.getLogEntries` instead.

### Fixed

- Fixed `db.getLogEntries` using the wrong API endpoint

## [8.6.0] - 2023-10-24

### Added

- Added `db.createJob` method to convert arbitrary requests into async jobs (DE-610)

  This method can be used to set the `x-arango-async: store` header on any
  request, which will cause the server to store the request in an async job:

  ```js
  const collectionsJob = await db.createJob(() => db.collections());
  // once loaded, collectionsJob.result will be an array of Collection instances
  const numbersJob = await db.createJob(() =>
    db.query(aql`FOR i IN 1..1000 RETURN i`)
  );
  // once loaded, numbersJob.result will be an ArrayCursor of numbers
  ```

## [8.5.0] - 2023-10-09

### Added

- Implemented hot backup API (DE-576)

- Implemented logging API (DE-144, DE-145, DE-146, DE-147)

- Implemented async jobs management (DE-339)

- Added `db.shutdown` to initiate a clean shutdown of the server

- Added `db.time` method to retrieve the server's system time

## [8.4.1] - 2023-09-15

### Fixed

- Fixed default return type of AQL queries being `undefined` instead of `any` ([#797](https://github.com/arangodb/arangojs/issues/797))

## [8.4.0] - 2023-07-10

### Changed

- Fetching additional cursor results now uses `POST` instead of `PUT` (DE-605)

  The `PUT` route was deprecated and the `POST` route is supported in all
  actively maintained versions of ArangoDB.

- User management methods now use database-relative URLs (DE-606)

  Previously these methods would make requests without a database prefix,
  implicitly using the `_system` database.

- `aql` template strings now take a generic type argument

  This allows explictly setting the item type of the `ArrayCursor` returned by
  `db.query` when using `aql` template strings. Note that like when setting
  the type on `db.query` directly, arangojs can make no guarantees that the
  type matches the actual data returned by the query.

  ```ts
  const numbers = await db.query(aql<{ index: number; squared: number }>`
    FOR i IN 1..1000
    RETURN {
      index: i,
      squared: i * i
    }
  `);
  const first = await numbers.next(); // { index: number; squared: number; }
  console.log(first.index, first.squared); // 1 1
  ```

### Fixed

- Fixed `listUsers` behavior ([#782](https://github.com/arangodb/arangojs/issues/782))

- Fixed `graph.create` not correctly handling `isDisjoint` option

### Added

- Added missing attributes to `QueryInfo` and `MultiExplainResult.stats` types (DE-607)

- Added cluster rebalancing methods to `Database` (DE-583)

- Added `db.withTransaction` helper method for streaming transactions ([#786](https://github.com/arangodb/arangojs/discussions/786))

  This method allows using streaming transactions without having to manually
  begin and commit or abort the transaction.

  ```ts
  const vertices = db.collection("vertices");
  const edges = db.collection("edges");
  const info = await db.withTransaction([vertices, edges], async (step) => {
    const start = await step(() => vertices.document("a"));
    const end = await step(() => vertices.document("b"));
    return await step(() => edges.save({ _from: start._id, _to: end._id }));
  });
  ```

## [8.3.1] - 2023-06-05

### Changed

- Added note that Simple Queries traversals are removed in ArangoDB 3.12.

## [8.3.0] - 2023-05-11

### Fixed

- Fixed `updateUser` and `replaceUser` behavior ([#783](https://github.com/arangodb/arangojs/issues/783))

### Added

- Added `renewAuthToken` method to `Database` ([#784](https://github.com/arangodb/arangojs/issues/784))

  This method allows refreshing the authentication token passed to the
  `useBearerAuth` method or used by the `login` method. Note that ArangoDB
  will currently only return a new token if the token is going to expire
  in the next 150 seconds.

- Added `returnOld` and `mergeObjects` to `CollectionInsertOptions` type

  These options are only available when using `overwriteMode`.

- Added caching options to `InvertedIndex` and `ArangoSearchView` types

  These options were added in ArangoDB 3.10.2.

- Added support for `ArangoSearchView` type `storedValues` shorthand notation

  Instead of using an object, attributes can also be defined as arrays of
  strings and arrays of arrays of strings. This was added in ArangoDB 3.10.3.

- Added `peakMemoryUsage` and `executionTime` to `SingleExplainResult.stats` type

  These attributes were added in ArangoDB 3.10.4.

- Added `geo_s2` Analyzer types

  This Analyzer was added in ArangoDB 3.10.5.

- Added `refillIndexCaches` option to document operation options types

  This option was added in ArangoDB 3.11.

- Added `optimizeTopK` to `ArangoSearchView` and `InvertedIndex` types

  This option was added in ArangoDB 3.11.

- Added support for `allowRetry` option in `db.query`

  This feature was added in ArangoDB 3.11.

- Added `x-arango-driver` header

  The arangojs driver now correctly identifies itself to ArangoDB, allowing the
  ArangoGraph Insights Platform to take advantage of the driver's support for
  cloud-optimized behaviors.

## [8.2.1] - 2023-04-05

### Fixed

- Fixed a bug in search parameter handling in the browser version

  Previously the browser version would incorrectly handle search parameters,
  which could result in invalid request URLs in many cases.

## [8.2.0] - 2023-03-29

### Changed

- Index names are now automatically NFC-normalized (DE-506)

  This change affects all index names using unicode characters. **The change
  has no effect when using non-unicode (ASCII) names.**

  Any names used when creating/ensuring indexes or passed to any methods that
  expect an `IndexSelector` will automatically be NFC normalized.

- Internal querystring handling logic now uses `URLSearchParams` instead of
  node `querystring` module

  This change should be backwards compatible but may produce different results
  when relying on undefined behavior in custom (e.g. Foxx) routes.

## [8.1.0] - 2022-12-19

### Added

- Added support for new ArangoDB 3.9.5 `cache` field in ArangoSearch types

## [8.0.0] - 2022-10-25

This is a major release and breaks backwards compatibility.

See [the migration guide](./MIGRATING.md#v7-to-v8) for detailed instructions
for upgrading your code to arangojs v8.

### Removed

- Removed Node.js 10 and Node.js 12 support

  With Node.js 10 and 12 having reached their end of life, arangojs will no
  longer support these versions of Node.js going forward.

- Removed Internet Explorer and older browser support

  As of version 8 arangojs uses the [Browserlist `defaults`](https://browsersl.ist/#q=defaults)
  list to generate the pre-built browser bundle, which excludes older browsers
  and specifically all versions of Internet Explorer.

  You may still be able to use arangojs in some of the excluded browsers when
  bundling arangojs yourself but this may require polyfills and additional
  transformations.

- Removed `Dict` type from `connection` module

  The `Dict<T>` type was identical to `Record<string, T>` and has been replaced
  with this built-in type across arangojs.

- Removed workaround for ArangoDB pre-3.2.8 Foxx HTTP API responses

  When fetching or modifying the configuration or dependencies of a Foxx
  service using ArangoDB 3.2.7 and earlier, arangojs would perform additional
  operations to convert the server response to a compatible format. All
  affected versions of ArangoDB have reached End of Life since December 2018.

- Removed deprecated `db.useDatabase` method

  The method was previously deprecated and can be replaced with `db.database`,
  which returns a new `Database` object instead of modifying the existing one.

- Removed deprecated MMFiles methods and types

  The MMFiles storage engine was removed in ArangoDB 3.7.

- Removed deprecated `minReplicationFactor` option from collection and
  database related types

  This option was renamed to `writeConcern` in ArangoDB 3.6.

- Removed deprecated `overwrite` option from `CollectionInsertOptions` type

  This option was deprecated in ArangoDB 3.7 and should be replaced with the
  `overwriteMode` option.

- Removed internal `request.host` attribute

  This attribute has been replaced with `request.hostUrl`.

- Removed internal `response.arangojsHostId` attribute

  This attribute has been replaced with `response.arangojsHostUrl`.

- Removed `CollectionStatus` and `CollectionType` enum re-exports

  Previously these would be re-exported by the arangojs module for backwards
  compatibility. If you still need to access these enums, you can import them
  from the `collection` sub-module instead. Note that the `ViewType` enum
  has been removed completely.

### Changed

- Changed default URL to `http://127.0.0.1:8529` to match ArangoDB default

  Previously arangojs would use `localhost` which on some systems resolves to
  the IPv6 address `::1` instead, resulting in confusing connection errors.

- Changed TypeScript compilation target to ES2020

  Since all evergreen browsers including Firefox ESR and all active Node.js LTS
  releases fully support ES2020, the compilation target for the browser bundle
  and Node.js has been moved from ES2016 and ES2018 respectively to ES2020.

- Updated TypeScript to version 4.8

  This may result in type signatures that are incompatible with TypeScript 3
  being added in future releases (including patch releases).

- Changed default behavior of _internal_ `db.request` method

  Previously this method would always return the full response object if no
  `transform` callback was provided. The method now defaults to a `transform`
  callback that extracts the response body instead. The previous behavior can
  still be forced by passing `false` instead of a callback function.

  This change has no effect on other methods like `route.request`.

- Replaced node core module polyfills with native APIs in browser build

  As part of upgrading to webpack 5, arangojs now no longer requires node core
  modules to be polyfilled to work in the browser. This also drastically
  reduces the file size of the pre-built browser bundle `arangojs/web`.

- `db.query` now supports a generic return type ([#764](https://github.com/arangodb/arangojs/issues/764))

  This allows explictly setting the item type of the `ArrayCursor` returned by
  the query without using a type assertion on the promise result. Note that
  arangojs can make no guarantees that the type matches the actual data
  returned by the query.

  ```ts
  const numbers = await db.query<{ index: number; squared: number }>(aql`
    FOR i IN 1..1000
    RETURN {
      index: i,
      squared: i * i
    }
  `);
  const first = await numbers.next(); // { index: number; squared: number; }
  console.log(first.index, first.squared); // 1 1
  ```

- Moved `aql.literal` and `aql.join` into `aql` module

  Previously these were available as methods on the `aql` function. Now they
  need to be imported from the `aql` module.

- Changed return values of `db.getUserAccessLevel` and `db.getUserDatabases`
  to match documented return types

- Retry requests resulting in status 503 `ArangoError` ([#710](https://github.com/arangodb/arangojs/issues/710))

  Unless retries are explicitly disabled by setting `config.maxRetries` to
  `false`, requests will now also be retried if the server responded with a
  503 `ArangoError`, which ArangoDB uses to indicate the server is running in
  maintenance mode. Previously this would always result in an error.

- Extended `CursorExtras` type in TypeScript

  The types of the attributes `plan`, `profile`, and `stats` are now defined
  more explicitly.

- Changed behavior of `collection.removeAll` for non-string arrays

  Previously `collection.removeAll` would always convert its argument into an
  array of document IDs and fail with an error if passed any documents had an
  ID not matching the collection name. Now the selector argument is passed
  as-is, bypassing this validation but allowing `ignoreRevs` to be respected
  by the server.

- Extracted type `ArangoSearchViewLinkOptions` from `ArangoSearchViewLink`

  Note that `ArangoSearchViewLink` now represents the type of the value
  returned by the server, marking several properties as required.

- Extracted type `CreateArangoSearchView` from
  `ArangoSearchViewPropertiesOptions`

  Note that `ArangoSearchViewPropertiesOptions` now includes only those options
  that can be updated/replaced whereas `CreateArangoSearchView` also includes
  options that can only be set during creation of a view.

- Renamed type `GraphCreateOptions` to `CreateGraphOptions`

- Renamed type `PrimarySortCompression` to `Compression`

- Replaced type `AnalyzerInfo` and all its constituent types

  Previously each type of Analyzer was represented by an `AnalyzerInfo` type
  and (where relevant) an `AnalyzerProperties` type, which were used for both
  creating and fetching Analyzers. The new types more closely follow the
  pattern already used for index types, providing pairs of
  `CreateAnalyzerOptions` and `AnalyzerDescription` types.

- Removed enum `ViewType`, type `ArangoSearchView` and changed `View` class to
  be non-generic

  The `View` class now behaves analogous to the `Analyzer` class. The various
  types related to different view types have been restructured to more closely
  follow the pattern used for indexes and analyzers.

### Deprecated

- Deprecated `EnsureFulltextIndexOptions` and `FulltextIndex` types

  Fulltext indexes have been deprecated in ArangoDB 3.10 and should be replaced
  with ArangoSearch.

- Deprecated `BytesAccumConsolidationPolicy` type

  The `bytes_accum` consolidation policy for views was deprecated in
  ArangoDB 3.7 and should be replaced with the `tier` consolidation policy.
  The type is also no longer supported in `ArangoSearchViewPropertiesOptions`.

### Added

- Added `toJSON` method to system errors

  ArangoJS already adds the `request` object to system errors encountered
  while attempting to make network requests. This change makes it easier
  to serialize these error objects to JSON the same way `ArangoError` and
  `HttpError` objects can already be serialized.

- Added `allowDirtyRead` option to `db.beginTransaction`, `trx.commit`,
  `trx.abort`, `collection.edges`, `collection.inEdges`, `collection.outEdges`

  The option is only respected by read-only requests.

- Added support for `ifMatch` and `ifNoneMatch` options ([#707](https://github.com/arangodb/arangojs/issues/707))

- Added `overwrite` option to `db.acquireHostList` ([#711](https://github.com/arangodb/arangojs/issues/711))

  Setting this option to `true` will replace the current host list, removing any
  hosts no longer present in the cluster.

- Added new ArangoDB 3.10 `legacyPolygons` option to `EnsureGeoIndexOptions`
  and `GeoIndex` types

  Geo indexes created in ArangoDB pre-3.10 will implicitly default this option
  to `true`. ArangoDB 3.10 and later will default to `false` and use the new
  parsing rules for geo indexes.

- Added support for new ArangoDB 3.10 `cacheEnabled` and `storedValues` options
  in persistent indexes

- Added support for new ArangoDB 3.10 computed values in collections

- Added support for new ArangoDB 3.10 `InvertedIndex` type

- Added support for new ArangoDB 3.10 `offset` Analyzer feature

- Added support for new ArangoDB 3.10 `minhash`, `classification` and
  `nearest_neighbors` Analyzer types

- Added missing `replicationFactor` and `writeConcern` options to
  `CollectionPropertiesOptions` type

- Added missing `commitIntervalMsec` option to `ArangoSearchViewProperties`
  type

- Added missing `deduplicate` option to `EnsurePersistentIndexOptions` type
  ([#771](https://github.com/arangodb/arangojs/issues/771))

- Added missing `unique` option to `EnsureZkdIndexOptions` type

- Added missing `deduplicate` and `estimates` fields to `PersistentIndex` type

- Added new ArangoDB 3.10 `db.queryRules` method

- Added support for `Analyzer` in `aql` templates

  `Analyzer` objects can now be passed into `aql` templates like `View` and
  `ArangoCollection` objects.

- Added `retryOnConflict` option to `Config`

  If set to any number, this value will be used as the default value for all
  requests unless explicitly overridden when using `db.query` or
  `route.request`.

## [7.8.0] - 2022-05-19

### Added

- Added `retryOnConflict` option to `db.query` and `route.request`

  This option allows specifying the number of times the request will be retried
  if it results in a write-write conflict.

## [7.7.0] - 2022-01-26

### Changed

- Unicode names are now automatically NFC normalized

  This change affects all database, collection, graph, view and analyzer names
  using unicode characters. **The change has no effect when using non-unicode
  (ASCII) names.** At this time, ArangoDB does not support unicode characters
  in any of these names but experimental support for unicode database names is
  available in ArangoDB 3.9 using the `--database.extended-names-databases`
  startup option.

  Any names used to create `Database`, `Collection`, etc instances or passed to
  methods will automatically be NFC normalized. Additionally the collection
  name part of any value passed as a `DocumentSelector` and the collection name
  part of values returned by `collection.documentId` will automatically be NFC
  normalized.

### Deprecated

- Deprecated `EnsureHashIndexOptions` and `EnsureSkiplistIndexOptions` types

  The hash and skiplist index types have been deprecated in ArangoDB 3.9 and
  should be replaced with persistent indexes which behave identically.

- Deprecated all MMFiles related options and methods

  The MMFiles storage engine was removed in ArangoDB 3.7.

### Added

- Added support for new ArangoDB 3.9 `CollationAnalyzer` and
  `SegmentationAnalyzer` types

- Added support for new ArangoDB 3.9 (multi-dimensional) `ZkdIndex` type

- Added support for new ArangoDB 3.9 Hybrid SmartGraphs graph options

- Added support for new ArangoDB 3.9 response queue time reporting

  This adds the `db.queueTime` property, which provides methods for accessing
  queue time metrics reported by the most recently received server responses if
  the server supports this feature.

- Added `ArangoSearchViewLink#inBackground` ([#759](https://github.com/arangodb/arangojs/issues/759))

- Added `collection.compact` ([#630](https://github.com/arangodb/arangojs/issues/630))

## [7.6.1] - 2021-10-26

### Fixed

- Changed all uses of `Record<string, unknown>` to `Record<string, any>` ([#750](https://github.com/arangodb/arangojs/issues/750))

  This should allow using more specific types without having to implement
  index signatures.

## [7.6.0] - 2021-10-20

### Added

- Added `collection.documents` for fetching multiple documents

- Added support for `fillBlockCache` query option

- Added support for passing `Graph` objects in AQL queries ([#740](https://github.com/arangodb/arangojs/issues/740))

  This also adds the `isArangoGraph` helper function for type checking.

- Added User Management API ([#664](https://github.com/arangodb/arangojs/issues/664))

  This implements the endpoints of the
  [HTTP Interface for User Management](https://www.arangodb.com/docs/stable/http/user-management.html)

### Fixed

- Added missing `hex` option to `StopwordsAnalyzer` type ([#732](https://github.com/arangodb/arangojs/issues/732))

- Added missing `details` option to `collection.figures` ([#728](https://github.com/arangodb/arangojs/issues/728))

- Added missing `inBackground` option to index options ([#734](https://github.com/arangodb/arangojs/issues/734))

## [7.5.0] - 2021-04-22

### Added

- Added support for new ArangoDB 3.8 Analyzer types

  This adds the `PipelineAnalyzer`, `AqlAnalyzer`, `GeoJsonAnalyzer`,
  `GeoPointAnalyzer` and `StopwordsAnalyzer` types in TypeScript, as well as
  the Analyzer-specific properties types.

- Added support for new ArangoDB 3.8 `estimates` option for indexes

  This affects the `PersistentIndex`, `HashIndex` and `SkiplistIndex` types
  in TypeScript.

## [7.4.0] - 2021-04-09

### Added

- Implemented `toJSON` methods for `ArangoError` and `HttpError` ([#632](https://github.com/arangodb/arangojs/issues/632))

  This prevents an error where `JSON.stringify` would reliably throw if passed
  an instance of either of these error types generated by arangojs. Note that
  you may still want to implement your own JSON representation logic as system
  errors (e.g. `ECONNREFUSED`) are not wrapped by arangojs and thrown as-is.

### Fixed

- Stack traces are now improved for most errors when using `precaptureStackTraces` ([#722](https://github.com/arangodb/arangojs/issues/722))

  Previously this option would only affect network errors, making it far less
  useful than intended. Now parsing errors, `ArangoError` instances and HTTP
  errors also receive improved error stack traces when this option is enabled.

- Improved performance for `precaptureStackTraces` when no errors occur

  The generated stack is now only accessed on demand, allowing the runtime to
  delay generation of the stack trace string. Previously the stack would always
  be accessed prior to the request being sent, causing a noticeable delay even
  when no error occurs.

- Fixed document selector validation in `collection.edges` and its variants ([#704](https://github.com/arangodb/arangojs/issues/704))

  These methods previously only permitted start vertices that are documents
  within the edge collection itself. This behavior has now been corrected to
  permit start vertices outside the collection, as expected.

## [7.3.0] - 2021-03-08

### Changed

- Changed the default for `agentOptions.scheduling` to `"lifo"`

  This is already the default in Node v15.6 but can reduce latency caused by
  sockets expiring, especially with larger connection pools and infrequent
  requests.

- Removed `keepAlive`-specific throughput optimization

  Previously arangojs would allow `agentOptions.maxSockets * 2` concurrent
  requests, to optimize socket reuse by avoiding idle time. This behavior
  could trigger deadlocks when attempting to perform multiple transactions
  in parallel and only marginally improved throughput in some high-load
  scenarios. The connection pool size now always reflects the value set in
  `agentOptions.maxSockets` regardless of whether `keepAlive` is enabled.

- Changed `agentOptions.maxSockets` default value when using `ROUND_ROBIN`

  As the connection pool is shared across all server connections when using
  `ROUND_ROBIN` load balancing, the default value of `3` is too limiting for
  most scenarios involving multiple coordinators. When passing multiple URLs
  via the `url` option and specifying `ROUND_ROBIN` load balancing, arangojs
  will now default this value to `url.length * 3` instead.

## [7.2.0] - 2020-12-02

### Added

- Added `db.waitForPropagation` method

  This method helps with setting up databases in a cluster scenario by waiting
  for a request to succeed on every known coordinator.

## [7.1.1] - 2020-11-30

This is a maintenance release and contains no bugfixes or features.

## [7.1.0] - 2020-10-16

### Changed

- Killing a cursor now also drains it locally

### Fixed

- Fixed a potential memory leak in cursor batch handling

## [7.0.2] - 2020-09-25

### Fixed

- Fixed incorrect HTTP method call in `patch` method ([#687](https://github.com/arangodb/arangojs/pull/687))

- Fixed empty query results containing `[undefined]` ([#683](https://github.com/arangodb/arangojs/issues/683))

- Fixed `updateByExample` and `replaceByExample` new value parameter name

  Note that these methods are still deprecated. Previously the `newValue`
  parameter was incorrectly called `newData`, which prevented the methods from
  working at all.

## [7.0.1] - 2020-08-21

This is a maintenance release because the initial v7 release did not include
a README file.

## [7.0.0] - 2020-08-21

This is a major release and breaks backwards compatibility.

See [the migration guide](./MIGRATING.md#v6-to-v7) for detailed instructions
for upgrading your code to arangojs v7.

For a detailed list of changes between pre-release versions of v7 see the
[Changelog of the final v7 release candidate](https://github.com/arangodb/arangojs/blob/v7.0.0-rc.2/CHANGELOG.md).

### Removed

#### General

- Removed ArangoDB 2.8 support

  ArangoDB 2.8 has reached End of Life since mid 2018. Version 7 and above
  of arangojs will no longer support ArangoDB 2.8 and earlier.

- Removed Node.js 6/8 support

  As of version 7 arangojs now requires language support for async/await.
  This means arangojs requires Node.js 10 (LTS) or newer to function correctly.

- Removed support for absolute endpoint URLs

  This removes the `isAbsolute` option from the arangojs configuration.

- Removed `ArangoError` re-export

  The type can still be imported directly from the `error` module.

- Removed `statusCode` properties of `ArangoError` and `HttpError`

  Both of these error types still expose the HTTP status code as the `code`
  property. For `ArangoError` the true HTTP status code may be different and
  can still be accessed using the `response.statusCode` property.

#### Database API

- Removed `db.edgeCollection` method

  As arangojs 7 uses the same implementation for document and edge collections,
  this method is no longer necessary. Generic collection objects can still be
  cast to `DocumentCollection` or `EdgeCollection` types in TypeScript.

- Removed `db.truncate` convenience method

  This was a wrapper around `db.listCollections` and `collection.truncate`.
  The behavior of `db.truncate` can still be emulated by calling these methods
  directly.

#### Collection API

- Removed collection `createCapConstraint`, `createHashIndex`,
  `createSkipList`, `createPersistentIndex`, `createGeoIndex` and
  `createFulltextIndex` methods

  These methods are no longer part of the official ArangoDB API and can be
  replaced by using the `collection.ensureIndex` method.

- Removed `save(fromId, toId, edgeData)` method variants

  Methods for creating edges now require the `_to` and `_from` attributes to
  be specified in the edge (document) data and no longer accept these values
  as positional arguments.

- Removed `collection.bulkUpdate` method

  The new method `collection.updateAll` now provides this functionality.

- Removed `collection.edge` method

  This method was previously an alias for `collection.document`.

  The method `graphEdgeCollection.edge` is unaffected by this change.

- Removed `graphName` option for `edgeCollection.traversal`

  Graph traversals can still be performed via `graph.traversal`.

#### Graph API

- Removed generic collection methods from `GraphVertexCollection`

  All methods that are not part of the graph API have been removed.
  The underlying collection can still be accessed from the `collection`
  property.

- Removed generic collection methods from `GraphEdgeCollection`

  All methods that are not part of the graph API have been removed.
  The underlying collection can still be accessed from the `collection`
  property.

#### Cursor API

- Removed `cursor.some` and `cursor.every` methods

  These methods encouraged overfetching and should be replaced with more
  efficient AQL queries.

  The behavior can still be implemented by using the `next` method directly
  or iterating over the cursor using the `forEach` method or the `for await`
  syntax.

#### View API

- Removed `ViewResponse` type

  The type `ViewDescription` represents the same structure.

- Removed `ArangoSearchViewPropertiesResponse` type

  The type `ArangoSearchViewProperties & ViewDescription` can be used
  to represent the same structure.

### Deprecated

#### Database API

- Deprecated `db.useDatabase` method

  Using this method will affect `Collection`, `Graph` and other objects
  already created for the given database and change which database these
  refer to, which may cause unexpected behavior.

  As of arangojs 7 the `db.database` method can be used instead to create a
  new, separate `Database` object using the same connection pool.

#### Collection API

- Deprecated `Collection` methods for simple queries: `list`, `all`, `any`,
  `byExample`, `firstExample`, `removeByExample`, `replaceByExample`,
  `updateByExample`, `lookupByKeys`, `removeByKeys`, `fulltext`

  These methods were deprecated in ArangoDB 3.4 and should no longer be used.
  They will still behave correctly with versions of ArangoDB supporting these
  methods but may be removed in a future ArangoDB release.

  Their behavior can be emulated using AQL queries.

#### Graph API

- Deprecated `graph.traversal` and `collection.traversal`

  These methods were deprecated in ArangoDB 3.4 and should no longer be used.
  They will still behave correctly with versions of ArangoDB supporting these
  methods but may be removed in a future ArangoDB release.

  Their behavior can be emulated using AQL graph traversal.

### Changed

#### General

- Multiple `Database` objects can now share a single `Connection`

  All arangojs objects now reference a `Database` object rather than accessing
  the underlying `Connection` directly. This allows multiple `Database` objects
  to be created by using the `db.database` method while still allowing the
  creation of separate database objects with separate connection pools if
  desired.

- Memoized `Database`, `Collection`, `Graph`, `View` and `Analyzer`

  Database objects are now memoized per-connection and the other object types
  are memoized per-database. Using `useDatabase` de-memoizes the database
  object to prevent unexpected behavior.

- Added support for `View` in `aql` templates ([#667](https://github.com/arangodb/arangojs/issues/667))

  `View` (or `ArangoSearchView`) objects can now be passed into `aql` templates
  like `ArangoCollection` objects.

- Moved `collectionToString` helper into `collection` module

- Moved `Dict` type into `connection` module

- Moved `Patch` type into `documents` module

- Removed `Errback` type from public API

- Renamed `util/foxx-manifest` module to `foxx-manifest`

#### Database API

- Renamed method `db.arangoSearchView` to `db.view`

- Renamed method `db.createArangoSearchView` to `db.createView`

- Replaced methods `db.enableServiceDevelopmentMode` and
  `db.disableServiceDevelopmentMode` with `db.setServiceDevelopmentMode`

- Flattened database `query` method `options` argument

  The optional `options` argument previously contained an additional `options`
  object with additional query options. These options are now specified on the
  `options` argument itself directly.

  Before:

  ```js
  db.query(aql`FOR doc IN ${collection} RETURN doc`, {
    cache: false,
    options: { fullCount: true },
  });
  ```

  After:

  ```js
  db.query(aql`FOR doc IN ${collection} RETURN doc`, {
    cache: false,
    fullCount: true,
  });
  ```

- Changed `db.listServices` option `excludeSystem` default to `true`

  To be more consistent with the equivalent options in other methods,
  the default value has been changed from `false` to `true`.

- Changed `db.createDatabase` return type to `Database`

- Renamed `db.setQueryTracking` to `db.queryTracking`

  The method will now return the existing query tracking properties or set the
  new query tracking properties depending on whether an argument is provided.

- Method `db.transaction` no longer acts as an alias for `executeTransaction`

  The method now only allows looking up transactions by ID. Previously it would
  wrap `executeTransaction` if passed the arguments expected by that method.

#### Collection API

- Merged `DocumentCollection` and `EdgeCollection` APIs

  All collections are now implemented as generic `Collection` objects.
  In TypeScript the generic collection object can still be explicitly cast to
  `DocumentCollection` or `EdgeCollection` for stricter type safety.

- Renamed `collection.setProperties` to `collection.properties`

  The method will now return the existing properties or set the properties
  depending on whether an argument is provided.

- Removed `CollectionMetadata` fields from `CollectionProperties` type

  Methods that previously returned `CollectionProperties` now return
  `CollectionMetadata & CollectionProperties`.

- Collection methods `save`, `update`, `replace` and `remove` no longer take
  arrays as input

  The array versions have been renamed to `saveAll`, `updateAll`, `replaceAll`
  and `removeAll` to reduce the likelihood of mistakes and provide more helpful
  type signatures.

- Collection methods will now throw errors when passed documents or document
  IDs from different collections where a document key or ID for a document in
  the same collection is expected

  For example the following code will now result in an error rather than the
  document from a different collection being returned:

  ```js
  const aliceId = "alice/123"; // Document from collection "alice"
  const bobCol = db.collection("bob"); // Collection "bob"
  const doc = await bobCol.document(aliceId); // THROWS
  ```

- Changed `collection.import` option `type` behavior

  Previously this option would always default to `"auto"`.

  When passing a `string`, `Buffer` or `Blob` as data, the option now defaults
  to `undefined`. This matches the behavior in previous versions of setting
  the option explicitly to `null`.

  Additionally, the value `"array"` has been replaced with `"list"`.

  When passing an array as data, the option is now no longer supported as the
  corresponding value will be inferred from the array's contents:

  If the array's first item is also an array, it will match the behavior in
  previous versions of setting the option explicitly to `null`.

  Otherwise it will match the behavior in previous versions of setting the
  option explicitly to `"documents"` or `"auto"`, or omitting it entirely.

- Changed `collection.list` return type to `ArrayCursor`

#### Graph API

- Graph methods now also accept `ArangoCollection` instances instead of names

  This brings these methods behavior in line with that of the `beginTransaction`
  and `executeTransaction` methods of `Database` objects.

- Graph `create` method (and `db.createGraph`) signature changed

  The `graph.create` method now takes an array of edge definitions as the
  first argument and any additional options (not just the `waitForSync`
  option) as the second argument.

  Before:

  ```js
  await graph.create(
    {
      edgeDefinitions: [{ collection: "edges", from: ["a"], to: ["b"] }],
      isSmart: true,
    },
    { waitForSync: true }
  );
  ```

  After:

  ```js
  await graph.create([{ collection: "edges", from: ["a"], to: ["b"] }], {
    isSmart: true,
    waitForSync: true,
  });
  ```

- First argument to `graph.replaceEdgeDefinition` is now optional

  Since the new edge definition already includes the edge collection name
  that identifies the edge definition, it is now possible to specify only the
  new edge definition object without additionally specifying the collection
  name as the first argument.

  Before:

  ```js
  await graph.replaceEdgeDefinition("edges", {
    collection: "edges", // This is a bit redundant
    from: ["a"],
    to: ["b"],
  });
  ```

  After:

  ```js
  await graph.replaceEdgeDefinition({
    collection: "edges",
    from: ["a"],
    to: ["b"],
  });
  ```

- Graph collection return values now contain `old` and `new` properties when
  `returnOld` or `returnNew` options are used

  This behavior represents a compromise between remaining consistent with the
  behavior of the regular collection method equivalents and remaining
  compatible with the ArangoDB HTTP API response object quirks.

#### Cursor API

- Replaced `ArrayCursor` methods `hasNext` and `hasMore` with getters

- Renamed `ArrayCursor` method `each` to `forEach`

- Renamed `cursor.nextBatch` to `cursor.batches.next`

- Renamed `cursor.hasMore` to `cursor.batches.hasMore`

- In TypeScript `ArrayCursor` is now a generic type

  TypeScript users can now cast cursor instances to use a specific type for
  its values rather than `any` to aid type safety.

#### View API

- Renamed `view.setProperties` to `view.updateProperties`

- Renamed type `ArangoView` to `View`

#### Analyzer API

- Renamed type `ArangoAnalyzer` to `Analyzer`

#### Transaction API

- Renamed type `ArangoTransaction` to `Transaction`

- Renamed `transaction.run` to `transaction.step`

  This should hopefully make it more obvious that sequential calls to arangojs
  methods should be split into separate calls of this method.

### Added

#### General

- Added `databaseName` configuration option

  Setting this option to a database name will result in the initial `Database`
  object using this database instead of the default `_system` database.

- Added `auth` configuration option

  It is now possible to pass authentication credentials using the `auth`
  option in addition to calling `db.useBasicAuth` or `db.useBearerAuth`.

- Added `precaptureStackTraces` configuration option ([#599](https://github.com/arangodb/arangojs/issues/599))

  This option can be used to get more useful stack traces but results in a
  performance hit on every request.

- Added `before` and `after` to the `agentOptions` configuration option ([#585](https://github.com/arangodb/arangojs/issues/585))

  These methods can be used to track performance metrics for outgoing requests.

- Improved type signatures for TypeScript and inline documentation

  Most methods should now provide full type signatures for options and response
  objects and provide inline documentation in IDEs and editors that support
  this feature in TypeScript and JavaScript.

#### Database API

- Added `db.database` method

  This method replaces the use case for the deprecated `db.useDatabase`
  method.

- Added support for extended options in `db.createDatabase`

  This method now supports passing an extended options object instead of
  passing the users array directly.

- Added `db.createCollection` and `db.createEdgeCollection` methods

  These are convenience methods wrapping `collection.create`. In TypeScript
  `createEdgeCollection` will return a collection cast to the `EdgeCollection`
  type.

- Added `db.createGraph` method

  This is a convenience method wrapping `graph.create`.

- Added `db.createArangoSearchView` method

  This is a convenience method wrapping `view.create`.

- Added `db.createAnalyzer` method

  This is a convenience method wrapping `analyzer.create`.

- Added support for `db.createFunction` option `isDeterministic`

- Added support for `db.listServices` option `excludeSystem`

#### Collection API

- Added collection `saveAll`, `updateAll`, `replaceAll` and `removeAll` methods

  These methods replace the respective array versions of the collection
  methods `save`, `update`, `replace` and `remove`, which no longer accept
  arrays as inputs.

- Added `collection.documentId` method

  The method takes a document or a document key and returns a fully qualified
  document ID string for the document in the current collection.

- Added support for values `"ignore"` and `"conflict"` in `overwriteMode`
  option when saving documents using the Collection API

#### Graph API

- Added `graphVertexCollection.vertexExists` and
  `graphEdgeCollection.edgeExists` methods

  These mimic the behavior of the `collection.documentExists` method but using
  the Graph API.

- Added `graphVertexCollection.collection` and `graphEdgeCollection.collection`

  These properties now provide access to regular (non-graph) collection
  objects for these graph collections. These objects can be used to perform
  operations not available within the context of a graph (e.g. bulk imports
  or modifying the collection itself).

- Added support for `isDisjoint` option in Graph API

#### Cursor API

- Added `cursor.flatMap` method

  This method behaves similarly to the `Array` method `flatMap` but operates
  on the cursor directly like `cursor.map` does.

- Added `cursor.batches` to provide a batch-wise cursor API

- Added support for `for await` in `ArrayCursor` ([#616](https://github.com/arangodb/arangojs/pull/616))

  It is now possible to use `for await` to iterate over each item in a cursor
  asynchronously.

#### View API

- Added support for `primarySortCompression` and `storedValues` options in
  View API

### Fixed

#### General

- Removed TypeScript dependency on `dom` library

  If you are using arangojs in Node.js, you no longer need to add the `dom`
  library to your `tsconfig.json` configuration.

#### Database API

- Fixed `db.dropFunction` option `group` being ignored

- Fixed documentation of `db.runServiceTests`

  Previously the documentation incorrectly indicated that the default value
  of the `idiomatic` option is `true`. The correct default value is `false`.

## [6.14.1] - 2020-05-01

### Fixed

- Added `uuid` and `padded` to legal `KeyGeneratorType` values in TypeScript ([#656](https://github.com/arangodb/arangojs/issues/656))

- Added `overwrite` to `InsertOptions` type in TypeScript ([#657](https://github.com/arangodb/arangojs/issues/657))

## [6.14.0] - 2020-03-18

### Added

- Added `db.listTransactions` and `db.transactions` methods

## [6.13.0] - 2020-01-24

### Changed

- Empty querystring parameters are now omitted

  In some cases ArangoDB would be unable to correctly handle querystring
  parameters without values. Any paremeters set to `undefined` will now
  no longer be added to the querystring.

  This does not affect parameters set to empty string values.

### Added

- Added `maxRuntime` option to `db.query` method

### Fixed

- Replaced `linkedlist` dependency with `x3-linkedlist` ([#601](https://github.com/arangodb/arangojs/issues/601))

  The `linkedlist` dependency had a memory leak and was no longer maintained.
  The replacement should fix this issue.

## [6.12.0] - 2019-10-16

### Added

- Added `cursor.kill` method

  Cursors that have not yet been fully depleted can now be killed using the
  `cursor.kill` method. Note that this method has no effect if the cursor
  is already depleted.

- Added `cursor.nextBatch` method

  Cursors normally fetch additional batches as necessary while iterating
  over the individual results, this method allows consuming an entire batch
  at a time.

## [6.11.1] - 2019-08-30

### Fixed

- Fixed View properties not being passed correctly when creating Views ([#621](https://github.com/arangodb/arangojs/issues/621))

- Renamed internal `response.host` attribute to `response.arangojsHostId` ([#604](https://github.com/arangodb/arangojs/pull/604))

  In some environments the `host` attribute is already present and read-only.
  This should avoid a `TypeError` being thrown when a value is assigned by
  arangojs.

## [6.11.0] - 2019-08-16

### Changed

- Renamed `db.transaction` to `db.executeTransaction`

  The method for executing server-side transactions is now called
  `executeTransaction` and the `params` argument now must be passed via the
  `options` object.

  For backwards-compatibility the new `db.transaction` method will continue to
  behave like before when passed an `action` string as the second argument.
  Note that this behavior is deprecated and will be removed in arangojs 7.

### Added

- Added support for ArangoDB 3.5 streaming transactions

  New streaming transactions can be created using `db.beginTransaction` and
  existing streaming transactions can be accessed by passing the transaction ID
  to `db.transaction`.

  See the documentation of the `transaction.run` method for examples of using
  streaming transactions with arangojs.

- Added support for ArangoDB 3.5 Analyzers API

  See the documentation of the `db.analyzer` method and the `Analyzer`
  instances for information on using this API.

- Added `collection.getResponsibleShard` method

- Added support for new ArangoDB 3.5 collection properties

- Added support for new ArangoDB 3.5 View properties

### Fixed

- Fixed a problem causing empty nested AQL expressions to be converted to bind variables

  Nesting an empty AQL expression like the result of calling `aql.join` with an empty
  array would previously result in the AQL expression not being recognized and being
  converted to an object bind variable instead.

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

  This implements most endpoints of the
  [HTTP Interface for AQL Queries](https://www.arangodb.com/docs/stable/http/aql-query.html).

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
  const fragments = keys.map((key) => aql`DOCUMENT(${users}, ${key})`);
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

- Re-implemented `collection.import`

  The previous implementation was broken. The new implementation should be backwards-compatible
  in cases where it previously wasn't broken but is more flexible and also handles buffers.

### Fixed

- Added missing dependency on `@types/node` ([#567](https://github.com/arangodb/arangojs/issues/567))

  This should solve TypeScript errors when the dependency was not already added.

## [6.5.1] - 2018-08-15

### Fixed

- Fixed `edgeCollection.save` not respecting options ([#554](https://github.com/arangodb/arangojs/issues/554))

- Fixed `db.createDatabase` TypeScript signature ([#561](https://github.com/arangodb/arangojs/issues/561))

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

- Added `db.close` method

- Added `opts` parameter to `EdgeCollection#save`

## [6.3.0] - 2018-06-20

### Added

- Added `db.version` method

- Added `db.login` method

- Added `db.exists` method

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

- Removed `lib` path prefix

  All arangojs files can now be imported directly by name.

  Before:

  ```js
  import { DocumentCollection } from "arangojs/lib/collection";
  ```

  After:

  ```js
  import { DocumentCollection } from "arangojs/collection";
  ```

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

[10.1.2]: https://github.com/arangodb/arangojs/compare/v10.1.1...v10.1.2
[10.1.1]: https://github.com/arangodb/arangojs/compare/v10.1.0...v10.1.1
[10.1.0]: https://github.com/arangodb/arangojs/compare/v10.0.0...v10.1.0
[10.0.0]: https://github.com/arangodb/arangojs/compare/v9.3.0...v10.0.0
[9.3.0]: https://github.com/arangodb/arangojs/compare/v9.2.0...v9.3.0
[9.2.0]: https://github.com/arangodb/arangojs/compare/v9.1.0...v9.2.0
[9.1.0]: https://github.com/arangodb/arangojs/compare/v9.0.0...v9.1.0
[9.0.0]: https://github.com/arangodb/arangojs/compare/v8.8.1...v9.0.0
[8.8.1]: https://github.com/arangodb/arangojs/compare/v8.8.0...v8.8.1
[8.8.0]: https://github.com/arangodb/arangojs/compare/v8.7.0...v8.8.0
[8.7.0]: https://github.com/arangodb/arangojs/compare/v8.6.0...v8.7.0
[8.6.0]: https://github.com/arangodb/arangojs/compare/v8.5.0...v8.6.0
[8.5.0]: https://github.com/arangodb/arangojs/compare/v8.4.1...v8.5.0
[8.4.1]: https://github.com/arangodb/arangojs/compare/v8.4.0...v8.4.1
[8.4.0]: https://github.com/arangodb/arangojs/compare/v8.3.1...v8.4.0
[8.3.1]: https://github.com/arangodb/arangojs/compare/v8.3.0...v8.3.1
[8.3.0]: https://github.com/arangodb/arangojs/compare/v8.2.1...v8.3.0
[8.2.1]: https://github.com/arangodb/arangojs/compare/v8.2.0...v8.2.1
[8.2.0]: https://github.com/arangodb/arangojs/compare/v8.1.0...v8.2.0
[8.1.0]: https://github.com/arangodb/arangojs/compare/v8.0.0...v8.1.0
[8.0.0]: https://github.com/arangodb/arangojs/compare/v7.8.0...v8.0.0
[7.8.0]: https://github.com/arangodb/arangojs/compare/v7.7.0...v7.8.0
[7.7.0]: https://github.com/arangodb/arangojs/compare/v7.6.1...v7.7.0
[7.6.1]: https://github.com/arangodb/arangojs/compare/v7.6.0...v7.6.1
[7.6.0]: https://github.com/arangodb/arangojs/compare/v7.5.0...v7.6.0
[7.5.0]: https://github.com/arangodb/arangojs/compare/v7.4.0...v7.5.0
[7.4.0]: https://github.com/arangodb/arangojs/compare/v7.3.0...v7.4.0
[7.3.0]: https://github.com/arangodb/arangojs/compare/v7.2.0...v7.3.0
[7.2.0]: https://github.com/arangodb/arangojs/compare/v7.1.1...v7.2.0
[7.1.1]: https://github.com/arangodb/arangojs/compare/v7.1.0...v7.1.1
[7.1.0]: https://github.com/arangodb/arangojs/compare/v7.0.2...v7.1.0
[7.0.2]: https://github.com/arangodb/arangojs/compare/v7.0.1...v7.0.2
[7.0.1]: https://github.com/arangodb/arangojs/compare/v7.0.0...v7.0.1
[7.0.0]: https://github.com/arangodb/arangojs/compare/v6.14.1...v7.0.0
[6.14.1]: https://github.com/arangodb/arangojs/compare/v6.14.0...v6.14.1
[6.14.0]: https://github.com/arangodb/arangojs/compare/v6.13.0...v6.14.0
[6.13.0]: https://github.com/arangodb/arangojs/compare/v6.12.0...v6.13.0
[6.12.0]: https://github.com/arangodb/arangojs/compare/v6.11.1...v6.12.0
[6.11.1]: https://github.com/arangodb/arangojs/compare/v6.11.0...v6.11.1
[6.11.0]: https://github.com/arangodb/arangojs/compare/v6.10.0...v6.11.0
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
