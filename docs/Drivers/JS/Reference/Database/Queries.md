# Queries

These functions implements the
[HTTP API for single round-trip AQL queries](https://www.arangodb.com/docs/stable/http/aql-query-cursor-query-results.html)
as well as the
[HTTP API for managing queries](https://www.arangodb.com/docs/stable/http/aql-query.html).

For collection-specific queries see [Simple Queries](../Collection/SimpleQueries.md).

For AQL please check out the [aql template tag](../Reference/Database/Queries.md#aql) for writing parametrized
AQL queries without making your code vulnerable to injection attacks.

## database.explain

`async database.explain(query, bindVars, options?): object`

`async database.explain(query, options?): object`

Explains a database query using the given _query_ and _bindVars_.

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

  - **optimizer**: `object` (optional)

    An object with the following property:

    - **rules**: `Array<string>`

      A list of optimizer rules to be included or excluded by the optimizer
      for this query. Prefix a rule name with `+` to include it, or `-` to
      exclude it. The name `all` acts as an alias matching all optimizer rules.

  - **maxNumberOfPlans**: `number` (optional)

    Maximum number of plans that the optimizer is allowed to generate.
    Setting this to a low value limits the amount of work the optimizer does.

  - **allPlans**: `boolean` (Default: `false`)

    If set to true, all possible execution plans will be returned
    as the _plans_ property. Otherwise only the optimal execution plan will
    be returned as the _plan_ property.

## database.parse

`async database.parse(query): object`

Parses the given query and returns the result.

**Arguments**

- **query**: `string | AqlQuery | AqlLiteral`

  An AQL query as a string,
  [`AqlQuery` object](../Aql.md#aql) or
  [`AqlLiteral` object](../Aql.md#aqlliteral).

  If the query is an `AqlQuery` object, its _bindVars_ will be ignored.

## database.queryTracking

`async database.queryTracking(): object`

Fetches the query tracking properties.

## database.setQueryTracking

`async database.setQueryTracking(options?): void`

Modifies the query tracking properties.

**Arguments**

- **options**: `object` (optional)

  An object with the following properties:

  - **enabled**: `boolean` (optional)

    If set to `false`, neither queries nor slow queries will be tracked.

  - **maxQueryStringLength**: `number` (optional)

    The maximum query string length in bytes that will be kept in the list.

  - **maxSlowQueries**: `number` (optional)

    The maximum number of slow queries to be kept in the list.

  - **slowQueryThreshold**: `number` (optional)

    The threshold execution time in seconds for when a query will be considered
    slow.

  - **trackBindVars**: `boolean` (optional)

    If set to `true`, bind parameters will be tracked along with queries.

  - **trackSlowQueries**: `boolean` (optional)

    If set to `true` and _enabled_ is also set to `true`, slow queries will be
    tracked if their execution time exceeds _slowQueryThreshold_.

**Examples**

```js
// track up to 5 slow queries exceeding 5 seconds execution time
await db.setQueryTracking({
  enabled: true,
  trackSlowQueries: true,
  maxSlowQueries: 5,
  slowQueryThreshold: 5
});
```

## database.listRunningQueries

`async database.listRunningQueries(): Array<object>`

Fetches a list of information for all currently running queries.

## database.listSlowQueries

`async database.listSlowQueries(): Array<object>`

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
