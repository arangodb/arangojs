# Queries

These functions implements the
[HTTP API for single round-trip AQL queries](https://www.arangodb.com/docs/stable/http/aql-query-cursor-query-results.html)
as well as the
[HTTP API for managing queries](https://www.arangodb.com/docs/stable/http/aql-query.html).

For collection-specific queries see [Simple Queries](../Collection/SimpleQueries.md).

## database.query

`async database.query(query, bindVars, options?): Cursor`

`async database.query(query, options?): Cursor`

Performs a database query using the given _query_ and _bindVars_, then returns
a [new `Cursor` instance](../Cursor.md) for the result set.

**Arguments**

- **query**: `string | AqlQuery | AqlLiteral`

  An AQL query as a string,
  [`AqlQuery` object](../Aql.md#aql) or
  [`AqlLiteral` object](../Aql.md#aqlliteral).

- **bindVars**: `object` (optional)

  An object defining the variables to bind the query to.

  If the _query_ is an `AqlQuery` object or an object with the properties
  _query_ and _bindVars_, this argument will be treated as the
  _options_ argument instead.

- **options**: `object` (optional)

  An object with the following properties:

  - **allowDirtyRead**: `boolean` (optional)

    {% hint 'info' %}
    Dirty reads were introduced in ArangoDB 3.4 and are not supported by earlier
    versions of ArangoDB.
    {% endhint %}

    If set to `true`, the query will be executed with support for dirty reads
    enabled, permitting ArangoDB to return a potentially dirty or stale result
    and arangojs will load balance the request without distinguishing between
    leaders and followers.

    Note that dirty reads are only supported for read-only queries, not data
    modification queries (e.g. using `INSERT`, `UPDATE`, `REPLACE` or `REMOVE`).

  - **timeout**: `number` (optional)

    Maximum time in milliseconds arangojs will wait for a server response.
    Exceeding this value will result in the request being cancelled

  - **count**: `boolean` (Default: `true`)

    If set to `true`, the number of result values in the result set will be
    returned in the `count` attribute. This may be disabled by default in a
    future version of ArangoDB if calculating this value has a performance
    impact for some queries.

  - **batchSize**: `number` (optional)

    The number of result values to be transferred by the server in each
    network roundtrip (or "batch").

    Must be greater than zero.

  - **ttl**: `number` (Default: `30`)

    The time-to-live for the cursor in seconds.

  - **cache**: `boolean` (Default: `true`)

    If set to `false`, the AQL query results cache lookup will be skipped for
    this query.

  - **memoryLimit**: `number` (Default: `0`)

    The maximum memory size in bytes that the query is allowed to use.
    Exceeding this value will result in the query failing with an error.

    If set to `0`, the memory limit is disabled.

  - **fullCount**: `boolean` (optional)

    If set to `true` and the query has a `LIMIT` clause, the total number of
    values matched before the last top-level `LIMIT` in the query was applied
    will be returned in the `extra.stats.fullCount` attribute.

  - **profile**: `boolean | number` (optional)

    If set to `1` or `true`, additional query profiling information will be
    returned in the `extra.profile` attribute if the query is not served from
    the result cache.

    If set to `2`, the query will return execution stats per query plan node
    in the `extra.stats.nodes` attribute. Additionally the query plan is
    returned in `extra.plan`.

  - **stream**: `boolean` (optional)

    If set to `true`, the query will be executed as a streaming query.

  - **optimizer**: `object` (optional)

    An object with the following property:

    - **rules**: `Array<string>`

      A list of optimizer rules to be included or excluded by the optimizer
      for this query. Prefix a rule name with `+` to include it, or `-` to
      exclude it. The name `all` acts as an alias matching all optimizer rules.

  - **maxPlans**: `number` (optional)

    Limits the maximum number of plans that will be created by the AQL query
    optimizer.

  - **maxWarningsCount**: `number` (optional)

    Limits the maximum number of warnings a query will return.

  - **failOnWarning**: `boolean` (optional)

    If set to `true`, the query will throw an exception and abort if it would
    otherwise produce a warning.

  If ArangoDB is using the RocksDB storage engine, the object has the following
  additional properties:

  - **maxTransactionSize**: `number` (optional)

    Maximum size of transactions in bytes.

  - **intermediateCommitCount**: `number` (optional)

    Maximum number of operations after which an intermediate commit is
    automatically performed.

  - **intermediateCommitSize**: `number` (optional)

    Maximum total size of operations in bytes after which an intermediate
    commit is automatically performed.

  If ArangoDB is running in an Enterprise Edition cluster configuration, the
  object has the following additional properties:

  - **skipInaccessibleCollections**: `boolean` (optional)

    If set to `true`, collections inaccessible to the current user will result
    in an access error instead of being treated as empty.

  - **satelliteSyncWait**: `number` (Default: `60.0`)

    Limits the maximum time in seconds a DBServer will wait to bring satellite
    collections involved in the query into sync. Exceeding this value will
    result in the query being stopped.

**Examples**

```js
const db = new Database();
const active = true;

// Using the aql template tag
const cursor = await db.query(aql`
  FOR u IN _users
  FILTER u.authData.active == ${active}
  RETURN u.user
`);
// cursor is a cursor for the query result

// -- or --

// Old-school JS with explicit bindVars:
db.query("FOR u IN _users FILTER u.authData.active == @active RETURN u.user", {
  active: true
}).then(function(cursor) {
  // cursor is a cursor for the query result
});
```

## aql

`aql(strings, ...args): AqlQuery`

Template string handler (aka template tag) for AQL queries. Converts a template
string to an object that can be passed to `database.query` by converting
arguments to bind variables.

**Note**: If you want to pass a collection name as a bind variable, you need to
pass a _Collection_ instance (e.g. what you get by passing the collection name
to `db.collection`) instead. If you see the error `"array expected as operand to FOR loop"`,
you're likely passing a collection name instead of a collection instance.

Returns an object with `query` and `bindVars` properties that can be passed to
the `db.query` method.

**Examples**

```js
const userCollection = db.collection("_users");
const role = "admin";

const query = aql`
  FOR user IN ${userCollection}
  FILTER user.role == ${role}
  RETURN user
`;

// -- is equivalent to --
const query = {
  query: "FOR user IN @@value0 FILTER user.role == @value1 RETURN user",
  bindVars: { "@value0": userCollection.name, value1: role }
};
```

Note how the aql template tag automatically handles collection references
(`@@value0` instead of `@value0`) for you so you don't have to worry about
counting at-symbols.

Because the aql template tag creates actual bindVars instead of inlining values
directly, it also avoids injection attacks via malicious parameters:

```js
// malicious user input
const email = '" || (FOR x IN secrets REMOVE x IN secrets) || "';

// DON'T do this!
const query = `
  FOR user IN users
  FILTER user.email == "${email}"
  RETURN user
`;
// FILTER user.email == "" || (FOR x IN secrets REMOVE x IN secrets) || ""

// instead do this!
const query = aql`
  FOR user IN users
  FILTER user.email == ${email}
  RETURN user
`;
// FILTER user.email == @value0
```

## database.explain

`async database.explain(query, bindVars, options?): ExplainResult`

`async database.explain(query, options?): ExplainResult`

Explains a database query using the given _query_ and _bindVars_ and
returns one or more plans.

**Arguments**

- **query**: `string | AqlQuery | AqlLiteral`

  An AQL query as a string or
  [AQL query object](../Aql.md#aql) or
  [AQL literal](../Aql.md#aqlliteral).

  If the query is an AQL query object, the second argument is treated as the
  _options_ argument instead of _bindVars_.

- **bindVars**: `object` (optional)

  An object defining the variables to bind the query to.

- **options**: `object` (optional)

  - **optimizer**: `object` (optional)

    An object with a single property **rules**, a string array of optimizer
    rules to be used for the query.

  - **maxNumberOfPlans**: `number` (optional)

    Maximum number of plans that the optimizer is allowed to generate.
    Setting this to a low value limits the amount of work the optimizer does.

  - **allPlans**: `boolean` (Default: `false`)

    If set to true, all possible execution plans will be returned
    as the _plans_ property. Otherwise only the optimal execution plan will
    be returned as the _plan_ property.

## database.parse

`async database.parse(query): ParseResult`

Parses the given query and returns the result.

**Arguments**

- **query**: `string | AqlQuery | AqlLiteral`

  An AQL query as a string or
  [AQL query object](../Aql.md#aql) or
  [AQL literal](../Aql.md#aqlliteral).
  If the query is an AQL query object, its bindVars (if any) will be ignored.

## database.queryTracking

`async database.queryTracking(): QueryTrackingProperties`

Fetches the query tracking properties.

## database.setQueryTracking

`async database.setQueryTracking(props): void`

Modifies the query tracking properties.

**Arguments**

- **props**: `Partial<QueryTrackingProperties>`

  Query tracking properties with new values to set.

## database.listRunningQueries

`async database.listRunningQueries(): Array<QueryStatus>`

Fetches a list of information for all currently running queries.

## database.listSlowQueries

`async database.listSlowQueries(): Array<SlowQueryStatus>`

Fetches a list of information for all recent slow queries.

## database.clearSlowQueries

`async database.clearSlowQueries(): void`

Clears the list of recent slow queries.

## database.killQuery

`async database.killQuery(queryId): void`

Kills a running query with the given ID.

**Arguments**

- **queryId**: `string`

  The ID of a currently running query.
