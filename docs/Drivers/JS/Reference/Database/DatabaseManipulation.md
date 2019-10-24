# Manipulating databases

These functions implement the
[HTTP API for manipulating databases](https://www.arangodb.com/docs/stable/http/database.html).

## database.get

`async database.get(): TODO`

Fetches the database description for the active database from the server.

**Examples**

```js
const db = new Database();
const info = await db.get();
// the database exists
```

## database.exists

`async database.exists(): boolean`

Checks whether the database exists.

**Examples**

```js
const db = new Database();
const result = await db.exists();
// result indicates whether the database exists
```

## database.createDatabase

`async database.createDatabase(databaseName, [users]): boolean`

Creates a new database with the given _databaseName_ and optionally creates
the given _users_ for the new database.

**Arguments**

- **databaseName**: `string`

  Name of the database to create.

- **users**: `Array<object>` (optional)

  If specified, the array must contain objects with the following properties:

  - **username**: `string`

    The username of the user to create for the database.

  - **passwd**: `string` (Default: `""`)

    The password of the user.

  - **active**: `boolean` (Default: `true`)

    Whether the user is active.

  - **extra**: `object` (optional)

    An object containing additional user data.

**Examples**

```js
const db = new Database();
const info = await db.createDatabase("mydb", [{ username: "root" }]);
// the database has been created
db.useDatabase("mydb");
db.useBasicAuth("root", "");
```

## database.listDatabases

`async database.listDatabases(): Array<string>`

Fetches all databases from the server and returns an array of their names.

**Examples**

```js
const db = new Database();
const names = await db.listDatabases();
// databases is an array of database names
```

## database.listUserDatabases

`async database.listUserDatabases(): Array<string>`

Fetches all databases accessible to the active user from the server and returns
an array of their names.

**Examples**

```js
const db = new Database();
const names = await db.listUserDatabases();
// databases is an array of database names
```

## database.dropDatabase

`async database.dropDatabase(databaseName): TODO`

Deletes the database with the given _databaseName_ from the server.

```js
const db = new Database();
await db.dropDatabase("mydb");
// database "mydb" no longer exists
```
