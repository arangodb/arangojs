# Accessing Views

These functions implement the
[HTTP API for accessing Views](https://www.arangodb.com/docs/stable/http/views.html).

{% hint 'info' %}
Views were introduced in ArangoDB 3.4 and are not supported by earlier versions
of ArangoDB.
{% endhint %}

## database.view

`database.view(viewName): ArangoSearchView`

Returns a _ArangoSearchView_ instance for the given View name.

**Arguments**

- **viewName**: `string`

  Name of the ArangoSearch View.

**Examples**

```js
const db = new Database();
const view = db.view("potatoes");
```

## database.listViews

`async database.listViews(): Array<object>`

Fetches all Views from the database and returns an array of View
descriptions.

**Examples**

```js
const db = new Database();

const views = await db.listViews();
// views is an array of View descriptions
```

## database.views

`async database.views(excludeSystem?): Array<ArangoSearchView>`

Fetches all Views from the database and returns an array of
_ArangoSearchView_ instances for the Views.

**Examples**

```js
const db = new Database();

const views = await db.views();
// views is an array of ArangoSearch View instances
```
