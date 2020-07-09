# ArangoDB JavaScript Driver

The official ArangoDB low-level JavaScript client.

**Note:** if you are looking for the ArangoDB JavaScript API in
[Foxx](https://foxx.arangodb.com) (or the `arangosh` interactive shell) please
refer to the documentation about the
[`@arangodb` module](https://www.arangodb.com/docs/stable/foxx-reference-modules.html#the-arangodb-module)
instead; specifically
[the `db` object exported by the `@arangodb` module](https://www.arangodb.com/docs/stable/appendix-references-dbobject.html).
The JavaScript driver is **only** meant to be used when accessing ArangoDB from
**outside** the database.

[![license - APACHE-2.0](https://img.shields.io/npm/l/arangojs.svg)](http://opensource.org/licenses/APACHE-2.0)
[![Continuous Integration](https://github.com/arangodb/arangojs/workflows/Continuous%20Integration/badge.svg)](https://github.com/arangodb/arangojs/actions?query=workflow:"Continuous+Integration")

[![npm package status](https://nodei.co/npm/arangojs.png?downloads=true&stars=true)](https://npmjs.org/package/arangojs)

## Install

### With Yarn or npm

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
npm run build
```

### For browsers

When using modern JavaScript tooling with a bundler and compiler (e.g. Babel),
arangojs can be installed using Yarn or npm like any other dependency.

For use without a compiler like Babel, the npm release comes with a precompiled browser build:

```js
var arangojs = require("arangojs/web");
```

You can also use [unpkg](https://unpkg.com) during development:

```html
< !-- note the path includes the version number (e.g. 7.0.0) -- >
<script src="https://unpkg.com/arangojs@7.0.0/web.js"></script>
<script>
  var db = new arangojs.Database();
  // ...
</script>
```

If you are targetting browsers older than Internet Explorer 11 you may want to
use [babel](https://babeljs.io) with a
[polyfill](https://babeljs.io/docs/usage/polyfill) to provide missing
functionality needed to use arangojs.

When loading the browser build with a script tag make sure to load the polyfill first:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.26.0/polyfill.js"></script>
<script src="https://unpkg.com/arangojs@7.0.0/web.js"></script>
```

## Basic usage example

Modern JavaScript/TypeScript with async/await:

```js
// TS: import { Database, aql } from "arangojs";
const { Database, aql } = require("arangojs");

const db = new Database();
const pokemons = db.collection("my-pokemons");

async function main() {
  try {
    const pokemons = await db.query(aql`
      FOR pokemon IN ${pokemons}
      FILTER pokemon.type == "fire"
      RETURN pokemon
    `);
    console.log("My pokemons, let me show you them:");
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
  url: "http://localhost:8529",
  database: "pancakes",
  auth: { username: "root", password: "hunter2" },
});

// The database can be swapped at any time
db.useDatabase("waffles");
db.useBasicAuth("admin", "maplesyrup");
```

Old-school JavaScript with promises:

```js
var arangojs = require("arangojs");
var Database = arangojs.Database;

var db = new Database();
var pokemons = db.collection("pokemons");

db.query({
  query: "FOR p IN @@c FILTER p.type === 'fire' RETURN p",
  bindVars: { c: pokemons },
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

ArangoJS is compatible with the latest stable version of ArangoDB available at
the time of the driver release.

The `arangoVersion` option can be used to tell arangojs to target a specific
ArangoDB version. Depending on the version this may enable or disable certain
methods and change behavior to maintain compatibility with the given version.

**Note**: As of June 2018 ArangoDB 2.8 has reached its End of Life and is no
longer supported in arangojs 7 and later. If your code needs to work with
ArangoDB 2.8 you can continue using arangojs 6 and enable ArangoDB 2.8
compatibility mode by setting the option `arangoVersion: 20800`.

The yarn/npm distribution of arangojs maintains compatibility with the latest
Node.js version as well as the two most recent LTS releases by following
[the official Node.js long-term support schedule](https://github.com/nodejs/LTS).

The included browser build is compatible with recent versions of all modern
browsers (Edge, Chrome, Firefox and Safari).

Versions outside this range may be compatible but are not actively supported.

## Versions

**The version number of this driver does not indicate supported ArangoDB versions!**

For a list of changes between recent versions, see the
[CHANGELOG](https://arangodb.github.io/arangojs/CHANGELOG).

If you are getting unexpected errors or functions seem to be missing, make sure you
are using the latest version of the driver and following documentation written
for a compatible version. If you are following a tutorial written for an older
version of arangojs, you can install that version using the `<name>@<version>`
syntax:

```sh
# for version 6.x.x
yarn add arangojs@6
# - or -
npm install --save arangojs@6
```

## Common issues

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

### Node.js `ReferenceError: window is not defined`

If you compile your Node project using a build tool like Webpack, you may need
to tell it to
[target the correct environment](https://webpack.js.org/configuration/target/):

```diff
// webpack.config.js
+ "target": "node",
```

To support use in both browser and Node environments arangojs uses the
[`package.json` `browser` field](https://github.com/defunctzombie/package-browser-field-spec),
to substitute browser-specific implementations for certain modules.
Build tools like Webpack will respect this field when targetting a browser
environment and may need to be explicitly told you are targetting Node instead.

### Node.js with self-signed HTTPS certificates

If you need to support self-signed HTTPS certificates, you may have to add
your certificates to the `agentOptions`, e.g.:

```diff
  const { Database } = require("arangojs");

  const db = new Database({
    url: ARANGODB_SERVER,
+   agentOptions: {
+     ca: [
+       fs.readFileSync(".ssl/sub.class1.server.ca.pem"),
+       fs.readFileSync(".ssl/ca.pem")
+     ]
+   },
  });
```

Although this is **strongly discouraged**, it's also possible to disable
HTTPS certificate validation entirely, but note this has
**extremely dangerous** security implications:

```diff
  const { Database } = require("arangojs");

  const db = new Database({
    url: ARANGODB_SERVER,
+   agentOptions: {
+     rejectUnauthorized: false
+   },
  });
```

When using arangojs in the browser, self-signed HTTPS certificates need to
be trusted by the browser or use a trusted root certificate.

## Streaming transactions

When using the `transaction.step` method it is important to be aware of the
limitations of what a callback passed to this method is allowed to do or not.
Please refer to the examples in the documentation of that method.

## Error responses

If arangojs encounters an API error, it will throw an `ArangoError` with an
[`errorNum` error code](https://www.arangodb.com/docs/stable/appendix-error-codes.html)
as well as a `code` and `statusCode` property indicating the intended and
actual HTTP status code of the response.

For any other error responses (4xx/5xx status code), it will throw an
`HttpError` error with the status code indicated by the `code` and
`statusCode` properties.

If the server response did not indicate an error but the response body could
not be parsed, a `SyntaxError` may be thrown instead.

In all of these cases the error object will additionally have a `response`
property containing the server response object.

If the request failed at a network level or the connection was closed without
receiving a response, the underlying error will be thrown instead.

**Examples**

```js
// Using async/await
try {
  const info = await db.createDatabase("mydb");
  // database created
} catch (err) {
  console.error(err.stack);
}

// Using promises with arrow functions
db.createDatabase("mydb").then(
  (info) => {
    // database created
  },
  (err) => console.error(err.stack)
);
```

## License

The Apache License, Version 2.0. For more information, see the accompanying
LICENSE file.
