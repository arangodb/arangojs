# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [6.2.4] - 2018-04-27

### Fixed

* Ensure `res.body` is an empty string instead of null in the browser version

## [6.2.3] - 2018-04-03

### Fixed

* Fixed `collection.update(documentHandle, newValue, opts)` missing return value
* Fixed `collection.removeByKeys(keys, options)` missing return value
* Fixed `collection.replaceByExample(example, newValue, opts)` missing return value
* Fixed `collection.updateByExample(example, newValue, opts)` missing return value

## [6.2.2] - 2018-03-21

### Fixed

* Replaced `Object.values` use to improve Node version compatibility

  This allows using arangojs in Node.js 6 LTS without a polyfill.

## [6.2.1] - 2018-03-21

### Changed

* Moved most documentation out of the README ([#123](https://github.com/arangodb/arangojs/issues/123))

  This is a necessary step to integrate arangojs with the Drivers book in the official ArangoDB documentation.

* Replaced internal use of async functions with callbacks

  This removes some unnecessary layers of indirection, which should increase overall performance.

### Fixed

* Increased test coverage ([#34](https://github.com/arangodb/arangojs/issues/34)).

## [6.2.0] - 2018-03-06

### Changed

* Extended `db.transaction` arguments ([@f5io](https://github.com/f5io) in [#494](https://github.com/arangodb/arangojs/pull/494))

  It's now possible to pass additional transaction options.

### Fixed

* Fixed `db.acquireHostList` request path ([@jcambass](https://github.com/jcambass) in [#504](https://github.com/arangodb/arangojs/pull/504))

* Fixed a typo ([@lodestone](https://github.com/lodestone) in [#506](https://github.com/arangodb/arangojs/pull/506))

* Fixed `graphEdgeCollection.edge` return value ([@Hunter21007](https://github.com/Hunter21007) in [#501](https://github.com/arangodb/arangojs/pull/501))

* Fixed graph API sending incorrect requests resulting in HTTP 400 errors ([@casdevs](https://github.com/casdevs) in [#513](https://github.com/arangodb/arangojs/pull/513))

## [6.1.0] - 2018-02-12

### Removed

* Removed ES modules build

  This should solve compatibility problems with `es6-error`. The cjs
  build now should also work with emulated ES module imports.

### Changed

* Use `cpy-cli` for build process

  Should help with cross-platform compatibility.

### Fixed

* Fixed `db.uninstallService(mount, opts)` opts default value

* Fixed `db.getServiceConfiguration(mount, minimal)` minimal representation

* Fixed `db.getServiceDependencies(mount, minimal)` minimal representation

* Fixed `db.updateServiceConfiguration(mount, cfg, minimal)` non-minimal representation

* Fixed `db.replaceServiceConfiguration(mount, cfg, minimal)` non-minimal representation

* Fixed `db.updateServiceDependencies(mount, cfg, minimal)` non-minimal representation

* Fixed `db.replaceServiceDependencies(mount, cfg, minimal)` non-minimal representation

* Fixed handling of non-json responses

## [6.0.1] - 2018-01-22

### Changed

* Use `rimraf` for build process

  Should help with cross-platform compatibility.

### Fixed

* Fixed some imports broken during the TypeScript rewrite

  If you were previously seeing errors involving a `default` property,
  this should make those go away.

## [6.0.0] - 2018-01-11

### Removed

* Removed `retryConnection` config.

  It is not possible to reliably determine whether retrying a request
  is safe or not at the driver level. If you need automatic retry, you
  should implement your own logic, e.g. using the
  [retry](https://yarnpkg.com/en/package/retry) package.

* Removed `promise` config.

  If you want to use an alternative promise implementation
  you need to overwrite the `Promise` global variable directly.

* Asynchronous functions no longer support node-style callbacks.

  All asynchronous functions now return promises.

* Removed support for credentials in `url` config.

  Use `db.useBasicAuth` or `db.useBearerAuth` to pass credentials instead.

* Removed bower support.

  Use yarn/npm instead.

### Changed

* The `url` config can now also be an array of URLs.

  The behaviour depends on the load balancing strategy (see API docs).

* The `databaseName` config has been replaced with `isAbsolute`.

  If you previously used `databaseName: false`, the same behaviour can now
  be achived using `isAbsolute: true`. If you want to use a specific
  database you can still switch databases with `db.useDatabase` at any time.

* Browser: maximum number of parallel connections behaves differently.

  As keep-alive does not work reliably in the browser, the maximum number
  of parallel connections now matches `agentOptions.maxSockets` exactly.

* TypeScript: ported arangojs to TypeScript.

  The generated typings are now included in the NPM release and should
  be more reliable than the community maintained typings included with
  earlier versions of arangojs.
  See also [#480](https://github.com/arangodb/arangojs/issues/480).

### Added

* Added ES Modules and browser build to NPM release.

  * ES Modules files live under `lib/esm/`
  * CommonJS files live under `lib/cjs/`
  * Precompiled browser build lives at `lib/web.js`

* Added support for load balancing and failover.

  See API documentation for details.

* Added `acquireHostList` method.

  See API documentation for details.

* Added support for leader/follower failover.

  Connections to a follower responding with an endpoint redirect
  will now be transparently redirected to the indicated leader.

### Fixed

* Fixed [#354](https://github.com/arangodb/arangojs/issues/354)

  Graph methods now only return the relevant part of the response body.
