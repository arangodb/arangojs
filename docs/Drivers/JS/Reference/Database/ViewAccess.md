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

`async database.createArangoSearchView(viewName: string, options?): ArangoSearchView`

Creates a new ArangoSearch View with the given _viewName_ and _options_, then
returns an `ArangoSearchView` instance for the new View.

**Arguments**

- **viewName**: `string`

  Name of the ArangoSearch View.

- **options**: `object` (optional)

  An object with the following properties:

  - **cleanupIntervalStep**: `number` (optional)

    TODO

  - **consolidationIntervalMsec**: `number` (optional)

    TODO

  - **commitIntervalMsec**: `number` (optional)

    TODO

  - **writebufferIdle**: `number` (optional)

    TODO

  - **writebufferActive**: `number` (optional)

    TODO

  - **writebufferSizeMax**: `number` (optional)

    TODO

  - **consolidationPolicy**: `object` (optional)

    An object with the following property:

    - **type**: `string`

      One of `"bytes_accum"` or `"tier"`.

    If the type is `"bytes_accum"`, the object has the following additional
    properties:

    TODO

    If the type is `"tier"`, the object has the following additional
    properties:

    TODO

  - **primarySort**: `object` (optional)

    An object with the following properties:

    - **field**: `string`

      TODO

    - **asc**: `boolean` or **direction**: `string`

      If _asc_ is set to `true` or _direction_ is set to `"asc"`,
      the primary sorting order will be ascending.

      If _asc_ is set to `false` or _direction_ is set to `"desc"`,
      the primary sorting order will be descending.

  - **links**: `object` (optional)

    An object TODO

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
