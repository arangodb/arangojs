# Accessing views

These functions implement the
[HTTP API for accessing views](https://docs.arangodb.com/latest/HTTP/Views/Getting.html).

{% hint 'info' %}
Views were introduced in ArangoDB 3.4 and are not supported by earlier versions
of ArangoDB.
{% endhint %}

## database.arangoSearchView

`database.arangoSearchView(viewName): ArangoSearchView`

Returns a _ArangoSearchView_ instance for the given view name.

**Arguments**

- **viewName**: `string`

  Name of the arangosearch view.

**Examples**

```js
const db = new Database();
const view = db.arangoSearchView("potatoes");
```

## database.listViews

`async database.listViews(): Array<Object>`

Fetches all views from the database and returns an array of view
descriptions.

**Examples**

```js
const db = new Database();

const views = await db.listViews();
// views is an array of view descriptions
```

## database.views

`async database.views([excludeSystem]): Array<View>`

Fetches all views from the database and returns an array of
_ArangoSearchView_ instances for the views.

**Examples**

```js
const db = new Database();

const views = await db.views();
// views is an array of ArangoSearchView instances
```
