# Accessing graphs

These functions implement the
[HTTP API for accessing general graphs](https://www.arangodb.com/docs/stable/http/gharial.html).

## database.graph

`database.graph(graphName): Graph`

Returns a `Graph` instance representing the graph with the given graph name.

## database.createGraph

`async database.createGraph(graphName, edgeDefinitions?, options?): Graph`

`async database.createGraph(graphName, options?): Graph`

Creates a graph with the given _graphName_ and _edgeDefinitions_, then returns
a `Graph` instance for the new graph.

**Arguments**

- **graphName**: `string`

  Name of the graph to be created.

- **edgeDefinitions**: `Array<object>` (optional)

  An array of edge definitions as objects with the following attributes:

  - **collection**: `string`

    Name of the collection containing the edges.

  - **from**: `Array<string>`

    Array of names of collections containing the start vertices.

  - **to**: `Array<string>`

    Array of names of collections containing the end vertices.

- **options**: `object` (optional)

  An object with the following properties:

  - **waitForSync**: `boolean` (optional)

    If set to `true`, the request will wait until everything is synced to
    disk before returning successfully.

  If ArangoDB is running in a cluster configuration, the object has the
  following additional properties:

  - **numberOfShards**: `number` (optional)

    Number of shards to distribute each collection in this graph across.

  - **shardKeys**: `Array<string>` (Default: `["_key"]`)

    Document attributes to use to determine the target shard for each document.

  - **replicationFactor**: `number` (Default: `1`)

    How many copies of each document should be kept in the cluster.

  If ArangoDB is running in an Enterprise Edition cluster configuration, the
  object has the following additional properties:

  - **isSmart**: `boolean` (Default: `false`)

    If set to `true`, the graph will be created as a SmartGraph.

  - **smartGraphAttribute**: `string` (optional)

    Attribute containing the shard key value to use for smart sharding.

    **Note**: _isSmart_ must be set to `true`.

## database.listGraphs

`async database.listGraphs(): Array<object>`

Fetches all graphs from the database and returns an array of graph descriptions.

**Examples**

```js
const db = new Database();
const graphs = await db.listGraphs();
// graphs is an array of graph descriptions
```

## database.graphs

`async database.graphs(): Array<Graph>`

Fetches all graphs from the database and returns an array of `Graph` instances
for those graphs.

**Examples**

```js
const db = new Database();
const graphs = await db.graphs();
// graphs is an array of Graph instances
```
