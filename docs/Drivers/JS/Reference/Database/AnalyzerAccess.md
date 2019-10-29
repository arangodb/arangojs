# Accessing Analyzers

These functions implement the
[HTTP API for accessing Analyzers](https://www.arangodb.com/docs/stable/http/analyzers.html).

{% hint 'info' %}
Analyzers were introduced in ArangoDB 3.5 and are not supported by earlier
versions of ArangoDB.
{% endhint %}

## database.analyzer

`database.analyzer(analyzerName): Analyzer`

Returns an `Analyzer` instance representing the Analyzer with the given
_analyzerName_.

**Examples**

```js
const db = new Database();
const analyzer = db.analyzer("some-analyzer");
const info = await analyzer.get();
```

## database.createAnalyzer

`async database.createAnalyzer(analyzerName, options): Analyzer`

Creates a new Analyzer with the given _analyzerName_ and _options_, then
returns an `Analyzer` instance for the new Analyzer.

**Arguments**

- **analyzerName**: `string`

  Name of the Analyzer.

- **options**: `object`

  An object with the following properties:

  - **features**: `Array<string>` (optional)

    Features to enable for this analyzer.

    Any of `"frequency"`, `"norm"` and/or `"position"`.

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
const analyzer = await db.createAnalyzer("potatoes", { type: "identity" });
// the identity Analyzer "potatoes" now exists
```

## database.listAnalyzers

`async database.listAnalyzers(): Array<object>`

Fetches all Analyzers visible in the database and returns an array of Analyzer
descriptions.

**Examples**

```js
const db = new Database();
const analyzers = await db.listAnalyzers();
// analyzers is an array of Analyzer descriptions
```

## database.analyzers

`async database.analyzers(): Array<Analyzer>`

Fetches all Analyzers visible in the database and returns an array of
`Analyzer` instances for those Analyzers.

**Examples**

```js
const db = new Database();
const analyzers = await db.analyzers();
// analyzers is an array of Analyzer instances
```
