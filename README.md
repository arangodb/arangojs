# ArangoDB JavaScript Driver

The official ArangoDB low-level JavaScript client.

[![license - APACHE-2.0](https://img.shields.io/npm/l/arangojs.svg)](http://opensource.org/licenses/APACHE-2.0)
[![Dependencies](https://img.shields.io/david/arangodb/arangojs.svg)](https://david-dm.org/arangodb/arangojs)
[![Build status](https://img.shields.io/travis/arangodb/arangojs.svg)](https://travis-ci.org/arangodb/arangojs)

[![NPM status](https://nodei.co/npm/arangojs.png?downloads=true&stars=true)](https://npmjs.org/package/arangojs)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

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
db
  .query({
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

## Documentation

[Latest Documentation](https://docs.arangodb.com/devel/Drivers/JS/)

## License

The Apache License, Version 2.0. For more information, see the accompanying
LICENSE file.
