# Graph API

These functions implement the
[HTTP API for manipulating graphs](https://www.arangodb.com/docs/stable/http/gharial.html).

## graph.get

`async graph.get(): object`

Retrieves general information about the graph.

**Examples**

```js
const db = new Database();
const graph = db.graph("some-graph");
const data = await graph.get();
// data contains general information about the graph
```

## graph.create

`async graph.create(properties): object`

Creates a graph with the given _properties_ for this graph's name, then returns
the server response.

**Arguments**

- **properties**: `object`

  For more information on the _properties_ object, see
  [the HTTP API documentation for creating graphs](https://www.arangodb.com/docs/stable/http/gharial-management.html).

**Examples**

```js
const db = new Database();
const graph = db.graph("some-graph");
const info = await graph.create({
  edgeDefinitions: [
    {
      collection: "edges",
      from: ["start-vertices"],
      to: ["end-vertices"],
    },
  ],
});
// graph now exists
```

## graph.drop

`async graph.drop(dropCollections?): boolean`

Deletes the graph from the database.

**Arguments**

- **dropCollections**: `boolean` (optional)

  If set to `true`, the collections associated with the graph will also be
  deleted.

**Examples**

```js
const db = new Database();
const graph = db.graph("some-graph");
await graph.drop();
// the graph "some-graph" no longer exists
```
