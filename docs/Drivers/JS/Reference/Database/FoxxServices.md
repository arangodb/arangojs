# Managing Foxx services

These functions implement the
[HTTP API for managing Foxx services](https://www.arangodb.com/docs/stable/http/foxx.html)

## database.listServices

`async database.listServices(excludeSystem?): Array<object>`

Fetches a list of all installed service.

**Arguments**

- **excludeSystem**: `boolean` (Default: `false`)

  Whether system services should be excluded.

**Examples**

```js
const services = await db.listServices();

// -- or --

const services = await db.listServices(false);
```

## database.installService

`async database.installService(mount, source, options?): object`

Installs a new service.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **source**: `Buffer | Readable | Blob | string`

  The service bundle to install.

  This can be a `string` URL or (server-local) file path, a `Readable` stream,
  Node `Buffer` or browser `Blob` (e.g. `File`).

- **options**: `object` (optional)

  An object with any of the following properties:

  - **configuration**: `object` (optional)

    An object mapping configuration option names to values.

  - **dependencies**: `object` (optional)

    An object mapping dependency aliases to mount points.

  - **development**: `boolean` (Default: `false`)

    Whether the service should be installed in development mode.

  - **legacy**: `boolean` (Default: `false`)

    Whether the service should be installed in legacy compatibility mode.

    This overrides the `engines` option in the service manifest (if any).

  - **setup**: `boolean` (Default: `true`)

    Whether the setup script should be executed.

**Examples**

```js
const source = fs.createReadStream("./my-foxx-service.zip");
const info = await db.installService("/hello", source);

// -- or --

const source = fs.readFileSync("./my-foxx-service.zip");
const info = await db.installService("/hello", source);

// -- or --

const element = document.getElementById("my-file-input");
const source = element.files[0];
const info = await db.installService("/hello", source);
```

## database.replaceService

`async database.replaceService(mount, source, options?): object`

Replaces an existing service with a new service by completely removing the old
service and installing a new service at the same mount point.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **source**: `Buffer | Readable | Blob | string`

  The service bundle to replace the existing service.

  This can be a `string` URL or (server-local) file path, a `Readable` stream,
  Node `Buffer` or browser `Blob` (e.g. `File`).

- **options**: `object` (optional)

  An object with any of the following properties:

  - **configuration**: `object` (optional)

    An object mapping configuration option names to values.

    This configuration will replace the existing configuration.

  - **dependencies**: `object` (optional)

    An object mapping dependency aliases to mount points.

    These dependencies will replace the existing dependencies.

  - **development**: `boolean` (Default: `false`)

    Whether the new service should be installed in development mode.

  - **legacy**: `boolean` (Default: `false`)

    Whether the new service should be installed in legacy compatibility mode.

    This overrides the `engines` option in the service manifest (if any).

  - **teardown**: `boolean` (Default: `true`)

    Whether the teardown script of the old service should be executed.

  - **setup**: `boolean` (Default: `true`)

    Whether the setup script of the new service should be executed.

**Examples**

```js
const source = fs.createReadStream("./my-foxx-service.zip");
const info = await db.replaceService("/hello", source);

// -- or --

const source = fs.readFileSync("./my-foxx-service.zip");
const info = await db.replaceService("/hello", source);

// -- or --

const element = document.getElementById("my-file-input");
const source = element.files[0];
const info = await db.replaceService("/hello", source);
```

## database.upgradeService

`async database.upgradeService(mount, source, options?): object`

Replaces an existing service with a new service while retaining the old
service's configuration and dependencies.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **source**: `Buffer | Readable | Blob | string`

  The service bundle to install.

  This can be a `string` URL or (server-local) file path, a `Readable` stream,
  Node `Buffer` or browser `Blob` (e.g. `File`).

- **options**: `object` (optional)

  An object with any of the following properties:

  - **configuration**: `object` (optional)

    An object mapping configuration option names to values.

    This configuration will be merged into the existing configuration.

  - **dependencies**: `object` (optional)

    An object mapping dependency aliases to mount points.

    These dependencies will be merged into the existing dependencies.

  - **development**: `boolean` (Default: `false`)

    Whether the new service should be installed in development mode.

  - **legacy**: `boolean` (Default: `false`)

    Whether the new service should be installed in legacy compatibility mode.

    This overrides the `engines` option in the service manifest (if any).

  - **teardown**: `boolean` (Default: `false`)

    Whether the teardown script of the old service should be executed.

  - **setup**: `boolean` (Default: `true`)

    Whether the setup script of the new service should be executed.

**Examples**

```js
const source = fs.createReadStream("./my-foxx-service.zip");
const info = await db.upgradeService("/hello", source);

// -- or --

const source = fs.readFileSync("./my-foxx-service.zip");
const info = await db.upgradeService("/hello", source);

// -- or --

const element = document.getElementById("my-file-input");
const source = element.files[0];
const info = await db.upgradeService("/hello", source);
```

## database.uninstallService

`async database.uninstallService(mount, options?): void`

Completely removes a service from the database.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **options**: `object` (optional)

  An object with any of the following properties:

  - **teardown**: `boolean` (Default: `true`)

    Whether the teardown script should be executed.

**Examples**

```js
await db.uninstallService("/my-service");
// service was uninstalled
```

## database.getService

`async database.getService(mount): object`

Retrieves information about a mounted service.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

**Examples**

```js
const info = await db.getService("/my-service");
// info contains detailed information about the service
```

## database.getServiceConfiguration

`async database.getServiceConfiguration(mount, minimal?): object`

Retrieves an object with information about the service's configuration options
and their current values.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **minimal**: `boolean` (Default: `false`)

  If set to `true`, the result will only include each configuration option's
  current value and any warnings instead of the full definition of each option
  including additional information.

**Examples**

```js
const config = await db.getServiceConfiguration("/my-service");
// config contains information about the service's configuration
```

## database.replaceServiceConfiguration

`async database.replaceServiceConfiguration(mount, configuration, minimal?): object`

Replaces the configuration of the given service.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **configuration**: `object`

  An object mapping configuration option names to values.

- **minimal**: `boolean` (Default: `false`)

  If set to `true`, the result will only include each configuration option's
  current value and any warnings instead of the full definition of each option
  including additional information.

  **Note:** when using ArangoDB 3.2.8 or older, enabling this option avoids
  triggering a second request to the database.

**Examples**

```js
const config = { currency: "USD", locale: "en-US" };
const info = await db.replaceServiceConfiguration("/my-service", config);
// info.values contains information about the service's configuration
// info.warnings contains any validation errors for the configuration
```

## database.updateServiceConfiguration

`async database.updateServiceConfiguration(mount, configuration, minimal?): object`

Updates the configuration of the given service my merging the new values into
the existing ones.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **configuration**: `object`

  An object mapping configuration option names to values.

- **minimal**: `boolean` (Default: `false`)

  If set to `true`, the result will only include each configuration option's
  current value and any warnings instead of the full definition of each option
  including additional information.

  **Note:** when using ArangoDB 3.2.8 or older, enabling this option avoids
  triggering a second request to the database.

**Examples**

```js
const config = { locale: "en-US" };
const info = await db.updateServiceConfiguration("/my-service", config);
// info.values contains information about the service's configuration
// info.warnings contains any validation errors for the configuration
```

## database.getServiceDependencies

`async database.getServiceDependencies(mount, minimal?): object`

Retrieves an object with information about the service's dependencies and their
current mount points.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **minimal**: `boolean` (Default: `false`)

  If set to `true`, the result will only include each dependency's current
  value instead of the full definition of each dependency including additional
  information.

**Examples**

```js
const deps = await db.getServiceDependencies("/my-service");
// deps contains information about the service's dependencies
```

## database.replaceServiceDependencies

`async database.replaceServiceDependencies(mount, dependencies, minimal?): object`

Replaces the dependencies for the given service.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **dependencies**: `object`

  An object mapping dependency aliases to mount points.

- **minimal**: `boolean` (Default: `false`)

  If set to `true`, the result will only include each dependency's current
  value instead of the full definition of each dependency including additional
  information.

  **Note:** when using ArangoDB 3.2.8 or older, enabling this option avoids
  triggering a second request to the database.

**Examples**

```js
const deps = { mailer: "/mailer-api", auth: "/remote-auth" };
const info = await db.replaceServiceDependencies("/my-service", deps);
// info.values contains information about the service's dependencies
// info.warnings contains any validation errors for the dependencies
```

## database.updateServiceDependencies

`async database.updateServiceDependencies(mount, dependencies, minimal?): object`

Updates the dependencies for the given service by merging the new values into
the existing ones.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **dependencies**: `object`

  An object mapping dependency aliases to mount points.

- **minimal**: `boolean` (Default: `false`)

  If set to `true`, the result will only include each dependency's current
  value instead of the full definition of each dependency including additional
  information.

  **Note:** when using ArangoDB 3.2.8 or older, enabling this option avoids
  triggering a second request to the database.

**Examples**

```js
const deps = { mailer: "/mailer-api" };
const info = await db.updateServiceDependencies("/my-service", deps);
// info.values contains information about the service's dependencies
// info.warnings contains any validation errors for the dependencies
```

## database.enableServiceDevelopmentMode

`async database.enableServiceDevelopmentMode(mount): object`

Enables development mode for the given service.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

**Examples**

```js
const info = await db.enableServiceDevelopmentMode("/my-service");
// the service is now in development mode
// info contains detailed information about the service
```

## database.disableServiceDevelopmentMode

`async database.disableServiceDevelopmentMode(mount): object`

Disables development mode for the given service and commits the service state
to the database.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

**Examples**

```js
const info = await db.disableServiceDevelopmentMode("/my-service");
// the service is now in production mode
// info contains detailed information about the service
```

## database.listServiceScripts

`async database.listServiceScripts(mount): object`

Retrieves a list of scripts defined in the service manifest's _scripts_
section.

Returns an object mapping each name to a more human readable representation.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

**Examples**

```js
const scripts = await db.listServiceScripts("/my-service");
// scripts is an object listing the service scripts
```

## database.runServiceScript

`async database.runServiceScript(mount, name, params?): any`

Runs a service script and returns the result.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

- **name**: `string`

  Name of the script to execute. The script must be defined in the service
  manifest's _scripts_ section.

- **params**: `any` (optional)

  Arbitrary value that will be exposed as `module.context.argv[0]` in the
  script when it is executed. Must be serializable to JSON.

**Examples**

```js
const result = await db.runServiceScript("/my-service", "setup");
// result contains the script's exports (if any)
```

## database.runServiceTests

`async database.runServiceTests(mount, options?): any`

Runs the tests of a given service and returns a formatted report.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database

- **options**: `object` (optional)

  An object with any of the following properties:

  - **filter**: `string` (optional)

    If set, only tests with full names including this string will be executed.

  - **reporter**: `string` (Default: `default`)

    The reporter to use to process the test results.

    One of `"default"`, `"stream"`, `"suite"`, `"tap"` or `"xunit"`.

  - **idiomatic**: `boolean` (Default: `true`)

    If not set to `false`, the results will be converted to the apropriate
    `string` representation if available.

    If _reporter_ is set to `"xunit"`, the report will be formatted as an XML
    document.

    If _reporter_ is set to `"tap"`, the report will be formatted as a TAP
    stream.

    If _reporter_ is set to `"stream"`, the report will be formatted as a
    JSON-LD stream.

    Otherwise the result will be an object or array representation of the
    report.

**Examples**

```js
const xml = await db.runServiceTests("/my-service", { reporter: "xunit" });
// xml contains the XUnit report as an XML string

// - or -

const xunitJson = await db.runServiceTests("/my-service", {
  reporter: "xunit",
  idiomatic: false
});
// xunitJson contains a JSON representation of the XUnit report
```

## database.downloadService

`async database.downloadService(mount): Buffer | Blob`

Retrieves a zip bundle containing the service files.

Returns a `Buffer` in Node or `Blob` in the browser version.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

**Examples**

```js
const bundle = await db.downloadService("/my-service");
// bundle is a Buffer/Blob of the service bundle
```

## database.getServiceReadme

`async database.getServiceReadme(mount): string | undefined`

Retrieves the text content of the service's `README` or `README.md` file.

Returns `undefined` if no such file could be found.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

**Examples**

```js
const readme = await db.getServiceReadme("/my-service");
// readme is a string containing the service README's
// text content, or undefined if no README exists
```

## database.getServiceDocumentation

`async database.getServiceDocumentation(mount): object`

Retrieves an Opean API 2.0 compatible Swagger API description object for the
service installed at the given mount point.

**Arguments**

- **mount**: `string`

  The service's mount point, relative to the database.

**Examples**

```js
const spec = await db.getServiceDocumentation("/my-service");
// spec is a Swagger API description of the service
```

## database.commitLocalServiceState

`async database.commitLocalServiceState(replace?): void`

Writes all locally available services to the database and updates any service
bundles missing in the database.

**Arguments**

- **replace**: `boolean` (Default: `false`)

  If set to `true`, outdated services will also be committed.

  This can be used to solve some consistency problems when service bundles are
  missing in the database or were deleted manually.

**Examples**

```js
await db.commitLocalServiceState();
// all services available on the coordinator have been written to the db

// -- or --

await db.commitLocalServiceState(true);
// all service conflicts have been resolved in favor of this coordinator
```
