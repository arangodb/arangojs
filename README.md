# ArangoDB JavaScript Driver

The official ArangoDB low-level JavaScript client.

[![license - APACHE-2.0](https://img.shields.io/npm/l/arangojs.svg)](http://opensource.org/licenses/APACHE-2.0)
[![Dependencies](https://img.shields.io/david/arangodb/arangojs.svg)](https://david-dm.org/arangodb/arangojs)

[![NPM status](https://nodei.co/npm/arangojs.png?downloads=true&stars=true)](https://npmjs.org/package/arangojs)

## Install

### With Yarn or NPM

```sh
yarn add arangojs
## - or -
npm install --save arangojs
```

### From source

```sh
git clone https://github.com/arangodb/arangojs.git
cd arangojs
npm install
npm run dist
```

## Basic usage example

```js
// Modern JavaScript
import { Database, aql } from "arangojs";
const db = new Database();
(async function() {
  const now = Date.now();
  try {
    const cursor = await db.query(aql`RETURN ${now}`);
    const result = await cursor.next();
    // ...
  } catch (err) {
    // ...
  }
})();

// or plain old Node-style
var arangojs = require("arangojs");
var db = new arangojs.Database();
var now = Date.now();
db.query({
  query: "RETURN @value",
  bindVars: { value: now }
})
  .then(function(cursor) {
    return cursor.next().then(function(result) {
      // ...
    });
  })
  .catch(function(err) {
    // ...
  });
```

## Common issues

### TypeScript `error TS2304: Cannot find name 'Blob'.`

Even if your project doesn't contain any browser code, you need to add `"dom"` to the `"lib"` array in your `tsconfig.json` to make arangojs work. This is a known limitation because the library supports both browser and Node environments and there is no common binary format that works in both environments:

```diff
// tsconfig.json
- "lib": ["es6"],
+ "lib": ["es6", "dom"],
```

## Documentation

[Latest Documentation](https://docs.arangodb.com/devel/Drivers/JS/)

## Testing

Run the tests using the `yarn test` or `npm test` commands:

```sh
yarn test
# - or -
npm test
```

By default the tests will be run against a server listening on
`http://localhost:8529` (using username `root` with no password). To
override this, you can set the environment variable `TEST_ARANGODB_URL` to
something different:

```sh
TEST_ARANGODB_URL=http://myserver.local:8530 yarn test
# - or -
TEST_ARANGODB_URL=http://myserver.local:8530 npm test
```

For development arangojs tracks the development build of ArangoDB. This means
tests may reflect behavior that does not match any existing public release of
ArangoDB.

To run tests for a specific release of ArangoDB other than the latest
development build, use the environment variable `ARANGO_VERSION`, e.g. for 3.3:

```sh
ARANGO_VERSION=30300 yarn test
# - or -
ARANGO_VERSION=30300 npm test
```

The value follows the same format as the `arangoVersion` config option,
i.e. XYYZZ where X is the major version, YY is the two digit minor version
and ZZ is the two digit patch version (both zero filled to two digits).

Any incompatible tests will appear as skipped (not failed) in the test result.

To run the resilience/failover tests you need to set the environment variables
`RESILIENCE_ARANGO_BASEPATH` (to use a local build of ArangoDB) or
`RESILIENCE_DOCKER_IMAGE` (to use a docker image by name):

```sh
RESILIENCE_ARANGO_BASEPATH=../arangodb yarn test
# - or -
RESILIENCE_ARANGO_BASEPATH=../arangodb npm test
```

This runs only the resilience/failover tests, without running any other tests.

Note that these tests are generally a lot slower than the regular test suite
because they involve shutting down and restarting individual ArangoDB server
instances.

## License

The Apache License, Version 2.0. For more information, see the accompanying
LICENSE file.
