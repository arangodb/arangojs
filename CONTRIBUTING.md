# Contributing

Please check out and build arangojs from source:

```sh
git clone https://github.com/arangodb/arangojs.git
cd arangojs
npm install
npm run build
```

## TypeScript versions

arangojs is built with **TypeScript 7** (`npx tsc`). Customers do **not** need
TypeScript 7 to use the published package.

TypeDoc and typescript-eslint still need the TypeScript **6** compiler API, so
`package.json` keeps both:

- `@typescript/native` → TypeScript 7 (used for `tsc` / `npm run build`)
- `typescript` → `@typescript/typescript6` (used by TypeDoc and eslint)

After `npm install`, check:

```sh
npx tsc --version    # TypeScript 7.x
npx tsc6 --version   # TypeScript 6.x
```

CircleCI also typechecks a small sample app (`compat-test/`) with TypeScript
5.4, 6.0, and 7.0 against the packed npm tarball.

## Testing

Run the tests using the `npm test` or `yarn test` commands:

```sh
npm test
# - or -
yarn test
```

By default the tests will be run against a server listening on
`http://127.0.0.1:8529` (using username `root` with no password). To
override this, you can set the environment variable `TEST_ARANGODB_URL` to
something different:

```sh
TEST_ARANGODB_URL=http://myserver.local:8530 npm test
# - or -
TEST_ARANGODB_URL=http://myserver.local:8530 yarn test
```

To run tests against a cluster, you can use multiple comma-separated URLs or
append a comma to the URL. The tests will automatically attempt to acquire a
host list and use round robin load balancing.

For development arangojs tracks the development build of ArangoDB. This means
tests may reflect behavior that does not match any existing public release of
ArangoDB.

To run tests for a specific release of ArangoDB other than the latest
development build, use the environment variable `ARANGO_VERSION`, e.g. for 3.3:

```sh
ARANGO_VERSION=30300 npm test
# - or -
ARANGO_VERSION=30300 yarn test
```

The value follows the same format as the `arangoVersion` config option,
i.e. XYYZZ where X is the major version, YY is the two digit minor version
and ZZ is the two digit patch version (both zero filled to two digits).

Any incompatible tests will appear as skipped (not failed) in the test result.

## Releases

Releases of arangojs are manually
[published on NPM](https://www.npmjs.com/package/arangojs).

Releases can only be published by authorized ArangoDB staff.
For more information see the internal documentation on
[Releasing ArangoJS](https://github.com/arangodb/documents/blob/2a5f7c7/Driver/JavaScript/ReleasingArangojs.md).
