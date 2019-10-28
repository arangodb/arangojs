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

`async analyzer.get(): Object`

Retrieves the Analyzer definition for the Analyzer.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("some-analyzer");
const definition = await analyzer.get();
// definition contains the Analyzer definition
```

## analyzer.create

`async analyzer.create(options?): Object`

Creates an Analyzer with the given _options_, then returns the new Analyzer
definition.

**Arguments**

- **options**: `object` (optional)

  An object with the following properties:

  - **features**: `string` (optional)

    The features to enable for this Analyzer.

  - **type**: `string`

    The type of Analyzer to create.

    One of `"identity"`, `"delimiter"`, `"stem"`, `"norm"`, `"ngram"` or
    `"text"`.

  - **properties**: `any`

    Additional properties for the given Analyzer type.

    If the type is `"identity"`, the _properties_ are optional or can be
    `undefined` or `null`.

    If the type is `"delimiter"`, the _properties_ is an object with the
    following property:

    - **delimiter**: `string`

      Delimiter to use to split text into tokens as specified in RFC 4180,
      without starting new records on newlines.

    If the type is `"stem"`, the _properties_ is an object with the
    following property:

    - **locale**: `string`

      Text locale. Format: `language[_COUNTRY][.encoding][@variant]`.

    If the type is `"norm"`, the _properties_ is an object with the
    following properties:

    - **locale**: `string`

      Text locale. Format: `language[_COUNTRY][.encoding][@variant]`.

    - **case**: `string` (Default: `"lower"`)

      Case conversion. Can be `"lower"`, `"none"` or `"upper"`.

    - **accent**: `boolean` (Default: `false`)

      Preserve accent in returned words.

    If the type is `"ngram"`, the _properties_ is an object with the
    following properties:

    - **max**: `number`

      Maximum n-gram length.

    - **min**: `number`

      Minimum n-gram length.

    - **preserveOriginal**: `boolean`

      Output the original value as well.

    If the type is `"text"`, the _properties_ is an object with the
    following properties:

    - **locale**: `string`

      Text locale. Format: `language[_COUNTRY][.encoding][@variant]`.

    - **case**: `string` (Default: `"lower"`)

      Case conversion. Can be `"lower"`, `"none"` or `"upper"`.

    - **stopwords**: `Array<string>` (optional)

      Words to omit from result. Defaults to the words loaded from the file at
      _stopwordsPath_.

    - **stopwordsPath**: `string` (optional)

      Path with a `language` sub-directory containing files with words to omit.

      Defaults to the path specified in the server-side environment variable
      `IRESEARCH_TEXT_STOPWORD_PATH` or the current working directory of the
      ArangoDB process.

    - **accent**: `boolean` (Default: `false`)

      Preserve accent in returned words.

    - **stemming**: `boolean` (Default: `true`)

      Apply stemming on returned words.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("potatoes");
await analyzer.create({ type: "identity" });
// the identity Analyzer "potatoes" now exists
```

## analyzer.drop

`async analyzer.drop(): Object`

Deletes the Analyzer from the database, then returns an object with the _name_
of the Analyzer that was dropped.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("some-analyzer");
await analyzer.drop();
// the Analyzer "some-analyzer" no longer exists
```
