# Accessing analyzers

These functions implement the
[HTTP API for accessing analyzers](https://docs.arangodb.com/latest/HTTP/Analyzers/index.html).

{% hint 'info' %}
Analyzers were introduced in ArangoDB 3.5 and are not supported by earlier
versions of ArangoDB.
{% endhint %}

## database.analyzer

`database.analyzer(analyzerName): Analyzer`

Returns an _Analyzer_ instance representing the analyzer with the given analyzer
name.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("some-analyzer");
const info = await analyzer.get();
```

## database.listAnalyzers

`async database.listAnalyzers(): Array<Object>`

Fetches all analyzers visible in the database and returns an array of analyzer
descriptions.

**Examples**

```js
const db = new Database();
const analyzers = await db.listAnalyzers();
// analyzers is an array of analyzer descriptions
```

## database.analyzers

`async database.analyzers(): Array<Analyzer>`

Fetches all analyzers visible in the database and returns an array of _Analyzer_
instances for those analyzers.

**Examples**

```js
const db = new Database();
const analyzers = await db.analyzers();
// analyzers is an array of Analyzer instances
```
