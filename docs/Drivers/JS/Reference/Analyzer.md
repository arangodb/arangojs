# Analyzer API

These functions implement the
[HTTP API for manipulating Analyzers](https://www.arangodb.com/docs/stable/http/analyzers.html).

{% hint 'info' %}
Analyzers were introduced in ArangoDB 3.5 and are not supported by earlier
versions of ArangoDB.
{% endhint %}

## analyzer.exists

`async analyzer.exists(): boolean`

Checks whether the Analyzer exists.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("some-analyzer");
const result = await analyzer.exists();
// result indicates whether the Analyzer exists
```

### analyzer.get

`async analyzer.get(): object`

Retrieves the Analyzer definition for the Analyzer.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("some-analyzer");
const definition = await analyzer.get();
// definition contains the Analyzer definition
```

## analyzer.create

`async analyzer.create(options): object`

Creates an Analyzer with the given _options_ for this instance's name,
then returns the new Analyzer definition.

This is a shorthand for calling `database.createAnalyzer` with this Analyzer's
name and the given _options_, but returning the Analyzer properties instead of
a new _Analyzer_ instance.

## analyzer.drop

`async analyzer.drop(): object`

Deletes the Analyzer from the database, then returns an object with the _name_
of the Analyzer that was dropped.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("some-analyzer");
await analyzer.drop();
// the Analyzer "some-analyzer" no longer exists
```
