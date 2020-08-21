# Migrating

## v6 to v7

### Configuration changes

The `db.useDatabase` method has been deprecated in v7.

Previously the primary use of this method was to set the database name of the
arangojs instance. The database name can now be specified using the
`databaseName` option in the arangojs configuration:

```diff
 const db = new Database({
   url: "http://localhost:8529",
+  databaseName: "my_database",
 });
-db.useDatabase("my_database");
```

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
