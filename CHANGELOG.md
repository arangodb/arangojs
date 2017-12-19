# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
