# Analyzer API

These functions implement the
[HTTP API for manipulating analyzers](https://docs.arangodb.com/latest/HTTP/Analyzers/index.html).

{% hint 'info' %}
Analyzers were introduced in ArangoDB 3.5 and are not supported by earlier
versions of ArangoDB.
{% endhint %}

## analyzer.exists

`async analyzer.exists(): boolean`

Checks whether the analyzer exists.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("some-analyzer");
const result = await analyzer.exists();
// result indicates whether the analyzer exists
```

### analyzer.get

`async analyzer.get(): Object`

Retrieves the analyzer definition for the analyzer.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("some-analyzer");
const definition = await analyzer.get();
// definition contains the analyzer definition
```

## analyzer.create

`async analyzer.create([options]): Object`

Creates an analyzer with the given _options_, then returns the new analyzer
definition.

**Arguments**

- **options**: `Object` (optional)

  An object with the following properties:

  - **features**: `string` (optional)

    The features to enable for this analyzer.

  - **type**: `string`

    The type of analyzer to create.
    Can be `"identity"`, `"delimiter"`, `"stem"`, `"norm"`, `"ngram"` or
    `"text"`.

  - **properties**: `any`

    Additional properties for the given analyzer type.

    If the type is `"identity"`, the _properties_ are optional or can be
    `undefined` or `null`.

    If the type is `"delimiter"`, the _properties_ must be an object with the
    following property:

    - **delimiter**: `string`

      TODO

    If the type is `"stem"`, the _properties_ must be an object with the
    following property:

    - **locale**: `string`

      TODO

    If the type is `"norm"`, the _properties_ must be an object with the
    following properties:

    - **locale**: `string`

      TODO

    - **case**: `string` (Default: TODO)

      Can be `"lower"`, `"none"` or `"upper"`.

    - **accent**: `boolean` (Default: TODO)

      TODO

    If the type is `"ngram"`, the _properties_ must be an object with the
    following properties:

    - **max**: `number`

      TODO

    - **min**: `number`

      TODO

    - **preserveOriginal**: `boolean`

      TODO

    If the type is `"text"`, the _properties_ must be an object with the
    following properties:

    - **locale**: `string`

      TODO

    - **case**: `string` (Default: TODO)

      TODO

    - **stopwords**: `Array<string>` (optional)

      TODO

    - **stopwordsPath**: `string` (optional)

      TODO

    - **accent**: `boolean` (Default: TODO)

      TODO

    - **stemming**: `boolean` (Default: TODO)

      TODO

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("potatoes");
await analyzer.create({ type: "identity" });
// the identity analyzer "potatoes" now exists
```

## analyzer.drop

`async analyzer.drop(): Object`

Deletes the analyzer from the database, then returns an object with the _name_
of the analyzer that was dropped.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("some-analyzer");
await analyzer.drop();
// the analyzer "some-analyzer" no longer exists
```
