# Accessing Views

These functions implement the
[HTTP API for accessing Views](https://www.arangodb.com/docs/stable/http/views-arangosearch.html).

{% hint 'info' %}
Views were introduced in ArangoDB 3.4 and are not supported by earlier versions
of ArangoDB.
{% endhint %}

## database.view

`database.view(viewName): ArangoSearchView`

Returns an `ArangoSearchView` instance for the given View name.

**Arguments**

- **viewName**: `string`

  Name of the ArangoSearch View.

**Examples**

```js
const db = new Database();
const view = db.view("potatoes");
```

## database.createArangoSearchView

`async database.createArangoSearchView(viewName, options?): ArangoSearchView`

Creates a new ArangoSearch View with the given _viewName_ and _options_, then
returns an `ArangoSearchView` instance for the new View.

**Arguments**

- **viewName**: `string`

  Name of the ArangoSearch View.

- **options**: `object` (optional)

  An object with the following properties:

  - **cleanupIntervalStep**: `number` (Default: `2`)

    How many commits to wait between removing unused files.

  - **consolidationIntervalMsec**: `number` (Default: `10000`)

    How long to wait between applying the _consolidationPolicy_.

  - **commitIntervalMsec**: `number` (Default: `1000`)

    How long to wait between commiting View data store changes and making
    documents visible to queries.

  - **writebufferIdle**: `number` (Default: `64`)

    Maximum number of writers cached in the pool.

  - **writebufferActive**: `number` (Default: `0`)

    Maximum number of concurrent active writers that perform a transaction.

  - **writebufferSizeMax**: `number` (Default: `33554432`, i.e. 32 MiB)

    Maximum memory byte size per writer before a writer flush is triggered.

  - **consolidationPolicy**: `object` (optional)

    An object with the following property:

    - **type**: `string`

      One of `"bytes_accum"` or `"tier"`.

    If the type is `"bytes_accum"`, the object has the following additional
    properties:

    - **threshold**: `number` (optional)

      Must be in the range of `0.0` to `1.0`.

    If the type is `"tier"`, the object has the following additional
    properties:

    - **segmentsBytesFloor**: `number` (Default: `2097152`, i.e. 2 MiB)

      Defines the value to treat all smaller segments as equal for consolidation selection.

    - **segmentsBytesMax**: `number` (Default: `5368709120`, i.e. 5 GiB)

      Maximum allowed size of all consolidated segments.

    - **segmentsMax**: `number` (Default: `10`)

      The maximum number of segments that will be evaluated as candidates for
      consolidation.

    - **segmentsMin**: `number` (Default: `1`)

      The minimum number of segments that will be evaluated as candidates for
      consolidation

    - **minScore**: `number` (Default: `0`)

      The minimum score.

  - **primarySort**: `Array<object>` (optional)

    An array of objects with the following properties:

    - **field**: `string`

      The attribute path for the value of each document to use for sorting.

    - **asc**: `boolean` or **direction**: `string`

      If _asc_ is set to `true` or _direction_ is set to `"asc"`,
      the primary sorting order will be ascending.

      If _asc_ is set to `false` or _direction_ is set to `"desc"`,
      the primary sorting order will be descending.

  - **links**: `object` (optional)

    An object mapping names of linked collections to link definitions as
    objects with the following format:

    - **analyzers**: `Array<string>` (Default: `["identity"]`)

      A list of names of Analyzers to apply to values of processed document
      attributes.

    - **fields**: `object` (optional)

      An object mapping names of attributes to process for each document to
      link definitions.

    - **includeAllFields**: `boolean` (Default: `false`)

      If set to `true`, all document attributes will be processed, otherwise
      only the attributes in _fields_ will be processed.

    - **trackListPositions**: `boolean` (Default: `false`)

      If set to `true`, the position of values in array values will be tracked,
      otherwise all values in an array will be treated as equal alternatives.

    - **storeValues**: `string` (Default: `"none"`)

      Controls how the view should keep track of the attribute values.

      One of `"none"` or `"id"`.

**Examples**

```js
const db = new Database();
const view = await db.createArangoSearchView("potatoes");
// the ArangoSearch View "potatoes" now exists
```

## database.listViews

`async database.listViews(): Array<object>`

Fetches all Views from the database and returns an array of View descriptions.

**Examples**

```js
const db = new Database();

const views = await db.listViews();
// views is an array of View descriptions
```

## database.views

`async database.views(excludeSystem?): Array<ArangoSearchView>`

Fetches all Views from the database and returns an array of
`ArangoSearchView` instances for the Views.

**Examples**

```js
const db = new Database();

const views = await db.views();
// views is an array of ArangoSearch View instances
```
