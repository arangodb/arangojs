# Migrating

## v9 to v10

Version 10 changes the error handling to make it easier to diagnose network
issues and distinguish between different error conditions.

If you previously inspected errors other than `ArangoError` and `HttpError`
directly, you should now expect to see `NetworkError` or a subclass thereof
instead. The originating error can be found using the `cause` property of the
`NetworkError` error:

```js
try {
  await db.collection("my-collection").get();
} catch (err) {
  if (err instanceof NetworkError) console.log(err.cause);
}
```

### Module name changes

Module names referring to resource types such as analyzers, collections,
databases, or views have been changed to use the plural form:

```diff
-import { Database } from "arangojs/database";
+import { Database } from "arangojs/databases";
```

Note that the `aql` module and `foxx-manifest` modules have not been renamed
as these are utility modules.

### Type imports

Types that were previously exported by the `database` module but are not
related to managing databases have been moved to separate modules:

```diff
-import type {
-  ParseResult,
-  TransactionOptions,
-  VersionInfo
-} from "arangojs/database";
+import type { VersionInfo } from "arangojs/administration";
+import type { TransactionOptions } from "arangojs/transactions";
+import type { ParseResult } from "arangojs/queries";
```

Additionally, some types were renamed. For a full list of changes, see the
[changelog](./CHANGELOG.md).

## v8 to v9

Version 9 reverts the automatic NFC normalization introduced in v7.7.0. This
means that arangojs will no longer automatically normalize unicode names and
identifiers of collections, graphs, indexes, views, users, databases and so on.

If you want to continue using NFC normalization, you can use the `normalize`
method available on all JavaScript strings:

```diff
 import { Database } from "arangojs";

 const db = new Database();
-const collection = db.collection(myUnicodeName);
+const collection = db.collection(myUnicodeName.normalize("NFC"));
```

Note that ArangoDB may reject non-normalized unicode names and identifiers.
This change is intended to make it easier to recognize normalization issues in
code interacting with ArangoDB that were previously masked by arangojs.

### Simple queries

Simple queries like the `removeByExample` and `firstExample` methods have been
removed from the collections API. These methods were deprecated in ArangoDB 3.4
and can be replaced with AQL queries. For examples for replicating each
method's behavior in AQL, see the documentation for these methods in ArangoJS 8.

### Request and Response changes

Version 9 now uses native `fetch` in all environments. This means that the
request and response objects exposed by ArangoJS now extend the fetch API's
`Request` and `Response` objects rather than those from Node's `http` module
and ArangoJS no longer provides the `agentOptions` or `agent` config options.

#### Config changes

The relevant `agentOptions` have been moved up into the `config` type and
in most cases renamed:

```diff
  const db = new Database({
    url: "http://localhost:8529",
-   agentOptions: {
-     maxSockets: 10,
-     keepAlive: true,
-     before: (req) => console.log(String(new Date()), 'requesting', req.url),
-     after: (res) => console.log(String(new Date()), 'received', res.request.url)
-   }
+   poolSize: 10,
+   keepalive: true,
+   beforeRequest: (req) => console.log(String(new Date()), 'requesting', req.url),
+   afterResponse: (res) => console.log(String(new Date()), 'received', res.request.url)
  });
```

If you need to modify the request agent beyond what is possible using the fetch
API, you can override Node's default `fetch` Agent using the `undici` module:

```js
const { Agent, setGlobalDispatcher } = require("undici");

setGlobalDispatcher(
  new Agent({
    // your agent options here
  })
);
```

Note that you will have to add `undici` as a dependency to your project. There
is currently no built-in way to override these options in Node.js without this
module.

#### Request and Response objects

This change mostly affects code that uses the `db.route` API to perform
arbitrary requests to the ArangoDB HTTP API.

The fetch API `Request` and `Response` objects are a bit different from the
equivalent objects previously exposed by these methods. Note that while this
means response objects still provide a `body` property, its semantics are very
different as the fetch API expects the `blob`, `json` and `text` methods to be
used instead. ArangoJS will use the relevant method during response handling
and store the result in the `parsedBody` method:

```diff
  const myFoxxApi = db.route('my/foxx');
  const res = await myFoxxApi.get();
- const token = res.headers['x-auth-token'];
- if (res.statusCode === 200) console.log(res.body);
+ const token = res.headers.get('x-auth-token');
+ if (res.status === 200) console.log(res.parsedBody);
```

## v7 to v8

Version 8 drops support for Internet Explorer 11 and Node.js 10 and 12. If you
need to continue supporting Internet Explorer, you can try transpiling arangojs
as a dependency using Babel with the relevant polyfills.

### General

In TypeScript the type `Dict<T>` has been removed from the `connection` module.
The built-in type `Record<string, T>` can be used as a replacement:

```diff
 import { Database } from "arangojs";
-import type { Dict } from "arangojs/connection";

 const db = new Database();
-let deps: Dict<string | string[] | undefined>;
+let deps: Record<string, string | string[] | undefined>;
 deps = await db.getServiceDependencies("/my-foxx-service", true);
```

### Default URL

The default URL has been changed to `http://127.0.0.1:8529` to match the ArangoDB
default. Previously the default URL was `http://localhost:8529`, which on some
systems would resolve to the IPv6 address `::1` instead.

If you don't want to use the IPv4 address `127.0.0.1` and instead want to continue
letting the operating system resolve `localhost`, you can pass the URL explicitly:

```diff
 import { Database } from "arangojs";

 const db = new Database({
+  url: "http://localhost:8529"
 });
```

### Databases

Previously arangojs allowed changing the database using the deprecated
`db.useDatabase` method. This could make it difficult to remember which
database you were interacting with. Instead, you should create a new `Database`
instance for each database you want to interact with using the `db.database`
method:

```diff
 import { Database } from "arangojs";

 const db = new Database();
-db.useDatabase("database2");
+const db2 = db.database("database2");
```

### Queries

The functions `aql.literal` and `aql.join` are no longer available as methods
on the `aql` template handler and need to be imported separately:

```diff
 import { aql } from "arangojs";
+import { join } from "arangojs/aql";

-const filters = aql.join([
+const filters = join([
   aql`FILTER size == 'big'`,
   aql`FILTER color == 'yellow'`
 ]);
```

### Users

The return values of `db.getUserDatabases` and `db.getUserAccessLevel` have
been changed to match the documented return types:

```diff
 import { Database } from "arangojs";

 const db = new Database();
-const dbs = (await db.getUserDatabases("ash")).result;
+const dbs = await db.getUserDatabases("ash");
for (const [db, obj] of Object.entries(dbs)) {
  console.log(`${db}: ${obj.permission}`);
  for (const [col, access] of Object.entries(obj.collections)) {
    console.log(`${db}/${col}: ${access}`);
  }
}

-const access = (await db.getUserAccessLevel("ash", "pokemons")).result;
+const access = await db.getUserAccessLevel("ash", "pokemons");
 if (access === "rw") {
   db.collection("pokemons").save({ name: "Pikachu" });
 }
```

### Graphs

In TypeScript the type `GraphCreateOptions` has been renamed to
`CreateGraphOptions`:

```diff
-import type { GraphCreateOptions } from "arangojs/graph";
+import type { CreateGraphOptions } from "arangojs/graph";
```

### Enum re-exports

Previously the `CollectionStatus`, `CollectionType` and `ViewType` enums
were re-exported by the arangojs main module and could be imported from the
`arangojs` package:

```diff
-import { CollectionStatus, CollectionType } from "arangojs";
+import { CollectionStatus, CollectionType } from "arangojs/collection";
```

Note that the `ViewType` enum has been removed completely:

````diff
-import { ViewType } from "arangojs";
-
-const ArangoSearchViewType = ViewType.ARANGOSEARCH_VIEW;
+const ArangoSearchViewType = "arangosearch";

## v6 to v7

### Configuration changes

The `db.useDatabase` method has been deprecated in v7.

Previously the primary use of this method was to set the database name of the
arangojs instance. The database name can now be specified using the
`databaseName` option in the arangojs configuration:

```diff
 const db = new Database({
   url: "http://127.0.0.1:8529",
+  databaseName: "my_database",
 });
-db.useDatabase("my_database");
````

### Shared connection pool

It is now possible to have multiple `Database` objects using the same
underlying connection pool:

```diff
-const db1 = new Database();
-db1.useDatabase("database1");
-const db2 = new Database();
-db2.useDatabase("database2");
+const db1 = new Database({ databaseName: "database1" });
+const db2 = db1.database("database2");
```

### Indexes

The helper methods for creating specific index types, e.g. `createHashIndex`,
have been removed and replaced with the generic `ensureIndex` method (which
was previously called `createIndex`):

```diff
-await collection.createGeoIndex(["lat", "lng"]);
+await collection.ensureIndex({ type: "geo", fields: ["lat", "lng"] });
```

### Document and edge collections

Version 7 no longer provides different methods for accessing document and edge
collections as both types are now implemented using the same underlying class:

```diff
 const myDocumentCollection = db.collection("documents");
-const myEdgeCollection = db.edgeCollection("edges");
+const myEdgeCollection = db.collection("edges");
```

When using TypeScript the collection instances can still be cast to the more
specific `DocumentCollection` and `EdgeCollection` interfaces:

```ts
interface EdgeType {
  color: string;
}
const myEdgeCollection = db.collection("edges") as EdgeCollection<EdgeType>;
```

### Saving edge documents

The `save` method no longer supports positional arguments for `_from` and `_to`
values. These now need to be supplied as part of the document data:

```diff
 await edges.save(
-  "vertices/start",
-  "vertices/end",
-  { color: "red" }
+  { _from: "vertices/start", _to: "vertices/end", color: "red" }
 );
```

### Accessing documents

The `edge` method has been removed from the low-level collection API as it was
an alias for the `document` method, which still exists:

```diff
-const edges = db.edgeCollection("edges");
-const edge = await edges.edge("my-edge");
+const edges = db.collection("edges");
+const edge = await edges.document("my-edge");
```

Graph vertex and edge collections instead only retain their specific `vertex`
and `edge` methods which access the collection using the high-level graph API:

```diff
 const vertices = graph.vertexCollection("vertices");
-const vertex = await vertices.document("my-vertex");
+const vertex = await vertices.vertex("my-vertex");

 const edges = graph.edgeCollection("edges");
-const edge = await edges.document("my-edge");
+const edge = await edges.edge("my-edge");
```

### Graph collections

Graph vertex and edge collections no longer implement the generic collection
API methods to avoid confusion between operations that are aware of the graph
definition (and can trigger graph-related side-effects) and those that directly
access low-level operations.

As a convenience both graph collection types still provide access to the
low-level collection interface via the `collection` property:

```diff
 const graphEdges = graph.edgeCollection("edges");
-const outEdges = graphEdges.outEdges("vertices/start");
+const outEdges = graphEdges.collection.outEdges("vertices/start");
```

### Cursor methods

The method `each` is now called `forEach`. The method `hasNext` has been
replaced with a getter.

The methods `some` and `every` have been removed. These methods previously
allowed iterating over cursor results in order to derive a boolean value by
applying a callback function to each value in the result.

In most cases these methods can be avoided by writing a more efficient AQL
query:

```diff
-const cursor = await db.query(aql`
-  FOR bowl IN porridges
-  RETURN bowl
-`);
-const someJustRight = await cursor.some(
-  (bowl) => bowl.temperature < TOO_HOT && bowl.temperature > TOO_COLD
-);
+const cursor = await db.query(aql`
+  FOR bowl IN porridges
+  FILTER bowl.temperature < ${TOO_HOT}
+  FILTER bowl.temperature > ${TOO_COLD}
+  LIMIT 1
+  RETURN 1
+`);
+const someJustRight = Boolean(await cursor.next());
```

If this is not an option, the old behavior can be emulated using the `forEach`
method (previously called `each`) instead:

```diff
-const someJustRight = await cursor.some(
-  (bowl) => bowl.temperature < TOO_HOT && bowl.temperature > TOO_COLD
-);
+const someJustRight = !(await cursor.forEach(
+  (bowl) => bowl.temperature === TOO_HOT || bowl.temperature === TOO_COLD
+));
```

### Batch cursor API

Cursors now provide a low-level API for iterating over the result batches
instead of individual items, which is exposed via the `batches` property.

The methods `hasMore` and `nextBatch` have been replaced with the getter
`batches.hasMore` and the method `batches.next`:

```diff
-if (cursor.hasMore()) {
-  return await cursor.nextBatch();
+if (cursor.batches.hasMore) {
+  return await cursor.batches.next();
 }
```

### Simple queries

Collection methods for using simple queries (e.g. `all`, `any` and `list`)
have been deprecated in ArangoDB 3.0 and are now also deprecated in arangojs.

See the documentation of each method for an example for how to perform the same
query using an AQL query instead.

Additionally the `list` method now returns a cursor instead of an array.

### ArangoSearch Views

The database methods `arangoSearchView` and `createArangoSearchView` have been
renamed to `view` and `createView` respectively as there currently is no other
view type available in ArangoDB:

```diff
-await db.createArangoSearchView("my-view");
-const view = db.arangoSearchView("my-view");
+await db.createView("my-view");
+const view = db.view("my-view");
```

### Query options

The `options` argument of `db.query` has been flattened. Options that were
previously nested in an `options` property of that argument are now specified
directly on the argument itself:

```diff
 const cursor = await db.query(
   aql`
     FOR doc IN ${collection}
     RETURN doc
   `,
   {
     cache: false,
-    options: { fullCount: true },
+    fullCount: true,
   }
 );
```

### Bulk imports

The default value of the `type` option now depends on the input type instead
of always defaulting to `"auto"`. If you previously relied on the default
value being set to `"auto"`, you may now need to explicitly set this option:

```diff
-await collection.import(data);
+await collection.import(data, { type: "auto" });
```

### Bulk operations

The collection method `bulkUpdate` has been removed and the methods
`save`, `update`, `replace` and `remove` no longer accept arrays as input.

Bulk operations can now be performed using the dedicated methods
`saveAll`, `updateAll`, `replaceAll` and `removeAll`:

```diff
-await collection.save([{ _key: "a" }, { _key: "b" }]);
+await collection.saveAll([{ _key: "a" }, { _key: "b" }]);
```

### Cross-collection operations

Collection methods no longer accept document IDs from other collections.
Previously passing a document ID referring to a different collection would
result in the collection performing a request to that collection instead. Now
mismatching IDs will result in an error instead:

```js
const collection1 = db.collection("collection1");
const doc = await collection1.document("collection2/xyz"); // ERROR
```

### Creating graphs

The signatures of `db.createGraph` and `graph.create` have changed to always
take an array of edge definitions as the first argument instead of taking the
edge definitions as a property of the `properties` argument.

Additionally the `properties` and `options` arguments have been merged:

```diff
 await graph.create(
+  [{ collection: "edges", from: ["a"], to: ["b"] }],
   {
-    edgeDefinitions: [{ collection: "edges", from: ["a"], to: ["b"] }],
     isSmart: true,
-  },
-  {
     waitForSync: true,
   }
 );
```

### Transactions

The transaction method `run` has been renamed to `step` to make it more obvious
that it is intended to only perform a single "step" of the transaction.

See the method's documentation for examples of how to use the method correctly.

Additionally the method `transaction` no longer acts as an alias for
`executeTransaction`:

```diff
-const result = await db.transaction(collections, action);
+const result = await db.executeTransaction(collections, action);
```

### Service development mode

The methods `enableServiceDevelopmentMode` and `disableServiceDevelopmentMode`
have been replaced with the method `setServiceDevelopmentMode`:

```diff
-await db.enableServiceDevelopmentMode("/my-foxx");
+await db.setServiceDevelopmentMode("/my-foxx", true);
```

### System services

The default value of the method `listServices` option `excludeSystem` has been
changed from `false` to `true`:

```diff
-const services = await db.listServices(true);
+const services = await db.listServices();
```

### Query tracking

The method `setQueryTracking` has been merged into `queryTracking`:

```diff
-await db.setQueryTracking({ enabled: true });
+await db.queryTracking({ enabled: true });
```

### Collection properties

The method `setProperties` has been merged into `properties`:

```diff
-await collection.setProperties({ waitForSync: true });
+await collection.properties({ waitForSync: true });
```

### View properties

The View method `setProperties` has been renamed to `updateProperties`:

```diff
-await view.setProperties({ consolidationIntervalMsec: 234 });
+await view.updateProperties({ consolidationIntervalMsec: 234 });
```

### Truncating collections

The `db.truncate` method has been removed. The behavior can still be mimicked
using the `db.collections` and `collection.truncate` methods:

```diff
-await db.truncate();
+await Promise.all(
+  db.collections().map((collection) => collection.truncate())
+);
```
