# ArangoDB JavaScript Driver

The official ArangoDB JavaScript client for Node.js and the browser.

[![license - APACHE-2.0](https://img.shields.io/npm/l/arangojs.svg)](http://opensource.org/licenses/APACHE-2.0)
[![Tests](https://github.com/arangodb/arangojs/workflows/Tests/badge.svg)](https://github.com/arangodb/arangojs/actions?query=workflow:Tests)

[![npm package status](https://nodei.co/npm/arangojs.png?downloads=true&stars=true)](https://npmjs.org/package/arangojs)

## Links

- [API Documentation](https://arangodb.github.io/arangojs/latest/modules/index.html)

- [Changelog](https://arangodb.github.io/arangojs/CHANGELOG)

- [Migration Guide](http://arangodb.github.io/arangojs/MIGRATING)

## Install

### With npm or yarn

```sh
npm install --save arangojs
## - or -
yarn add arangojs
```

### For browsers

When using modern JavaScript tooling with a bundler and compiler (e.g. Babel),
arangojs can be installed using `npm` or `yarn` like any other dependency.

You can also use [jsDelivr CDN](https://www.jsdelivr.com) during development:

```html
<script type="importmap">
  {
    "imports": {
      "arangojs": "https://cdn.jsdelivr.net/npm/arangojs@9.0.0/esm/index.js?+esm"
    }
  }
</script>
<script type="module">
  import { Database } from "arangojs";
  const db = new Database();
  // ...
</script>
```

## Basic usage example

Modern JavaScript/TypeScript with async/await and ES Modules:

```js
import { Database, aql } from "arangojs";

const db = new Database();
const Pokemons = db.collection("my-pokemons");

async function main() {
  try {
    const pokemons = await db.query(aql`
      FOR pokemon IN ${Pokemons}
      FILTER pokemon.type == "fire"
      RETURN pokemon
    `);
    console.log("My pokemans, let me show you them:");
    for await (const pokemon of pokemons) {
      console.log(pokemon.name);
    }
  } catch (err) {
    console.error(err.message);
  }
}

main();
```

Using a different database:

```js
const db = new Database({
  url: "http://127.0.0.1:8529",
  databaseName: "pancakes",
  auth: { username: "root", password: "hunter2" },
});

// The credentials can be swapped at any time
db.useBasicAuth("admin", "maplesyrup");
```

Old-school JavaScript with promises and CommonJS:

```js
var arangojs = require("arangojs");
var Database = arangojs.Database;

var db = new Database();
var pokemons = db.collection("pokemons");

db.query({
  query: "FOR p IN @@c FILTER p.type == 'fire' RETURN p",
  bindVars: { "@c": "pokemons" },
})
  .then(function (cursor) {
    console.log("My pokemons, let me show you them:");
    return cursor.forEach(function (pokemon) {
      console.log(pokemon.name);
    });
  })
  .catch(function (err) {
    console.error(err.message);
  });
```

**Note**: The examples throughout this documentation use `async`/`await`
and other modern language features like multi-line strings and template tags.
When developing for an environment without support for these language features,
substitute promises for `await` syntax as in the above example.

## Compatibility

The arangojs driver is compatible with the latest stable version of ArangoDB
available at the time of the driver release and remains compatible with the
two most recent Node.js LTS versions in accordance with the official
[Node.js long-term support schedule](https://github.com/nodejs/LTS). Versions
of ArangoDB that have reached their [end of life](https://arangodb.com/subscriptions/end-of-life-notice/)
by the time of a driver release are explicitly not supported.

For a list of changes between recent versions of the driver, see the
[CHANGELOG](https://arangodb.github.io/arangojs/CHANGELOG).

**Note:** arangojs is only intended to be used in Node.js or a browser to access
ArangoDB **from outside the database**. If you are looking for the ArangoDB
JavaScript API for [Foxx](https://foxx.arangodb.com) or for accessing ArangoDB
from within the `arangosh` interactive shell, please refer to the documentation
of the [`@arangodb` module](https://www.arangodb.com/docs/stable/foxx-reference-modules.html#the-arangodb-module)
and [the `db` object](https://www.arangodb.com/docs/stable/appendix-references-dbobject.html) instead.

## Error responses

If arangojs encounters an API error, it will throw an `ArangoError` with
an `errorNum` property indicating the ArangoDB error code and the `code`
property indicating the HTTP status code from the response body.

For any other non-ArangoDB error responses (4xx/5xx status code), it will throw
an `HttpError` error with the status code indicated by the `code` property.

If the server response did not indicate an error but the response body could
not be parsed, a regular `SyntaxError` may be thrown instead.

In all of these cases the server response object will be exposed as the
`response` property on the error object.

If the request failed at a network level or the connection was closed without
receiving a response, the underlying system error will be thrown instead.

## Common issues

### Unexpected server errors

Please make sure you are using the latest version of this driver and that the
version of the arangojs documentation you are reading matches that version.

Changes in the major version number of arangojs (e.g. 8.x.y -> 9.0.0) indicate
backwards-incompatible changes in the arangojs API that may require changes in
your code when upgrading your version of arangojs.

Additionally please ensure that your version of Node.js (or browser) and
ArangoDB are supported by the version of arangojs you are trying to use. See
the [compatibility section](#compatibility) for additional information.

### No code intelligence when using require instead of import

If you are using `require` to import the `arangojs` module in JavaScript, the
default export might not be recognized as a function by the code intelligence
of common editors like Visual Studio Code, breaking auto-complete and other
useful features.

As a workaround, use the `arangojs` function exported by that module instead
of calling the module itself:

```diff
  const arangojs = require("arangojs");

- const db = arangojs({
+ const db = arangojs.arangojs({
    url: ARANGODB_SERVER,
  });
```

Alternatively you can use the `Database` class directly:

```diff
  const arangojs = require("arangojs");
+ const Database = arangojs.Database;

- const db = arangojs({
+ const db = new Database({
    url: ARANGODB_SERVER,
  });
```

Or using object destructuring:

```diff
- const arangojs = require("arangojs");
+ const { Database } = require("arangojs");

- const db = arangojs({
+ const db = new Database({
    url: ARANGODB_SERVER,
  });
```

### Error stack traces contain no useful information

Due to the async, queue-based behavior of arangojs, the stack traces generated
when an error occur rarely provide enough information to determine the location
in your own code where the request was initiated.

Using the `precaptureStackTraces` configuration option, arangojs will attempt
to always generate stack traces proactively when a request is performed,
allowing arangojs to provide more meaningful stack traces at the cost of an
impact to performance even when no error occurs.

```diff
  const { Database } = require("arangojs");

  const db = new Database({
    url: ARANGODB_SERVER,
+   precaptureStackTraces: true,
  });
```

Note that arangojs will attempt to use `Error.captureStackTrace` if available
and fall back to generating a stack trace by throwing an error. In environments
that do not support the `stack` property on error objects, this option will
still impact performance but not result in any additional information becoming
available.

### Node.js with self-signed HTTPS certificates

If you need to support self-signed HTTPS certificates in Node.js, you may have
to override the global fetch agent. At the time of this writing, there is no
official way to do this for the native `fetch` implementation in Node.js.

However as Node.js uses the `undici` module for its `fetch` implementation
internally, you can override the global agent by adding `undici` as a
dependency to your project and using its `setGlobalDispatcher` as follows:

```js
import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(
  new Agent({
    ca: [
      fs.readFileSync(".ssl/sub.class1.server.ca.pem"),
      fs.readFileSync(".ssl/ca.pem"),
    ],
  })
);
```

Although this is **strongly discouraged**, it's also possible to disable
HTTPS certificate validation entirely, but note this has
**extremely dangerous** security implications:

```js
import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(
  new Agent({
    rejectUnauthorized: false,
  })
);
```

This is a [known limitation](https://github.com/orgs/nodejs/discussions/44038#discussioncomment-5701073)
of Node.js at the time of this writing.

When using arangojs in the browser, self-signed HTTPS certificates need to
be trusted by the browser or use a trusted root certificate.

### Streaming transactions leak

When using the `transaction.step` method it is important to be aware of the
limitations of what a callback passed to this method is allowed to do.

```js
const collection = db.collection(collectionName);
const trx = db.transaction(transactionId);

// WARNING: This code will not work as intended!
await trx.step(async () => {
  await collection.save(doc1);
  await collection.save(doc2); // Not part of the transaction!
});

// INSTEAD: Always perform a single operation per step:
await trx.step(() => collection.save(doc1));
await trx.step(() => collection.save(doc2));
```

Please refer to the [documentation of the `transaction.step` method](https://arangodb.github.io/arangojs/latest/classes/transaction.Transaction.html#step)
for additional examples.

### Streaming transactions timeout in cluster

Example messages: `transaction not found`, `transaction already expired`.

Transactions have
[different guarantees](https://www.arangodb.com/docs/stable/transactions-limitations.html#in-clusters)
in a cluster.

When using arangojs in a cluster with load balancing, you may need to adjust
the value of `config.poolSize` to accommodate the number of transactions
you need to be able to run in parallel. The default value is likely to be too
low for most cluster scenarios involving frequent streaming transactions.

**Note**: When using a high value for `config.poolSize` you may have
to adjust the maximum number of threads in the ArangoDB configuration using
[the `server.maximal-threads` option](https://www.arangodb.com/docs/3.7/programs-arangod-server.html#server-threads)
to support larger numbers of concurrent transactions on the server side.

## License

The Apache License, Version 2.0. For more information, see the accompanying
LICENSE file.

Includes code from [x3-linkedlist](https://github.com/x3cion/x3-linkedlist)
used under the MIT license.
