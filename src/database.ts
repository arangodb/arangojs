/**
 * `import { Database } from "arangojs/database"`
 *
 * The "database" module provides the {@link Database} class and associated
 * types and interfaces for TypeScript.
 *
 * The Database class is also re-exported by the "index" module.
 *
 * @packageDocumentation
 */
import { Readable } from "stream";
import {
  Analyzer,
  AnalyzerDescription,
  CreateAnalyzerOptions,
} from "./analyzer";
import { AqlLiteral, AqlQuery, isAqlLiteral, isAqlQuery } from "./aql";
import {
  ArangoCollection,
  Collection,
  CollectionMetadata,
  CollectionType,
  CreateCollectionOptions,
  DocumentCollection,
  EdgeCollection,
  isArangoCollection,
} from "./collection";
import {
  ArangoResponseMetadata,
  Config,
  Connection,
  Headers,
  RequestOptions,
} from "./connection";
import { ArrayCursor } from "./cursor";
import { isArangoError } from "./error";
import { EdgeDefinition, Graph, GraphCreateOptions, GraphInfo } from "./graph";
import { Blob } from "./lib/blob";
import { btoa } from "./lib/btoa";
import { toForm } from "./lib/multipart";
import { ArangojsResponse } from "./lib/request";
import { Route } from "./route";
import { Transaction } from "./transaction";
import { DATABASE_NOT_FOUND } from "./util/codes";
import { FoxxManifest } from "./util/foxx-manifest";
import { Dict } from "./util/types";
import {
  ArangoSearchView,
  ArangoSearchViewPropertiesOptions,
  View,
  ViewDescription,
  ViewResponse,
  ViewType,
} from "./view";

function colToString(collection: string | ArangoCollection): string {
  if (isArangoCollection(collection)) {
    return String(collection.name);
  } else return String(collection);
}

/**
 * TODO
 */
export function isArangoDatabase(database: any): database is Database {
  return Boolean(database && database.isArangoDatabase);
}

type CoercedTransactionCollections = {
  allowImplicit?: boolean;
  exclusive?: string | string[];
  write?: string | string[];
  read?: string | string[];
};

/**
 * Collections involved in a transaction.
 */
export type TransactionCollections = {
  /**
   * An array of collections or a single collection that will be read from or
   * written to during the transaction with no other writes being able to run
   * in parallel.
   */
  exclusive?: (string | ArangoCollection)[] | string | ArangoCollection;
  /**
   * An array of collections or a single collection that will be read from or
   * written to during the transaction.
   *
   * If ArangoDB is using the MMFiles storage engine, this option behaves
   * exactly like `exclusive`, i.e. no other writes will run in parallel.
   */
  write?: (string | ArangoCollection)[] | string | ArangoCollection;
  /**
   * An array of collections or a single collection that will be read from
   * during the transaction.
   */
  read?: (string | ArangoCollection)[] | string | ArangoCollection;
};

/**
 * Options for how the transaction should be performed.
 */
export type TransactionOptions = {
  /**
   * Whether the transaction may read from collections not specified for this
   * transaction. If set to `false`, accessing any collections not specified
   * will result in the transaction being aborted to avoid potential deadlocks.
   *
   * Default: `true`.
   */
  allowImplicit?: boolean;
  /**
   * Determines whether to force the transaction to write all data to disk
   * before returning.
   */
  waitForSync?: boolean;
  /**
   * Determines how long the database will wait while attempting to gain locks
   * on collections used by the transaction before timing out.
   */
  lockTimeout?: number;
  /**
   * (RocksDB only.) Determines the transaction size limit in bytes.
   */
  maxTransactionSize?: number;
  /**
   * (RocksDB only.) Determines the maximum number of operations after which an
   * intermediate commit is performed automatically.
   *
   * @deprecated Removed in ArangoDB 3.4.
   */
  intermediateCommitCount?: number;
  /**
   * (RocksDB only.) Determine the maximum total size of operations after which
   * an intermediate commit is performed automatically.
   *
   * @deprecated Removed in ArangoDB 3.4.
   */
  intermediateCommitSize?: number;
};

export type InstallServiceOptions = {
  configuration?: Dict<any>;
  dependencies?: Dict<string>;
  development?: boolean;
  setup?: boolean;
  legacy?: boolean;
};

/**
 * Options for executing a query. See {@link Database.query}.
 */
export type QueryOptions = {
  /**
   * If set to `true`, the query will be executed with support for dirty reads
   * enabled, permitting ArangoDB to return a potentially dirty or stale result
   * and arangojs will load balance the request without distinguishing between
   * leaders and followers.
   *
   * Note that dirty reads are only supported for read-only queries, not data
   * modification queries (e.g. using `INSERT`, `UPDATE`, `REPLACE` or
   * `REMOVE`) and only when using ArangoDB 3.4 or later.
   *
   * Default: `false`
   */
  allowDirtyRead?: boolean;
  /**
   * Maximum time in milliseconds arangojs will wait for a server response.
   * Exceeding this value will result in the request being cancelled.
   *
   * **Note**: Setting a timeout for the client does not guarantee the query
   * will be killed by ArangoDB if it is already being executed. See the
   * `maxRuntime` option for limiting the execution time within ArangoDB.
   */
  timeout?: number;
  /**
   * Unless set to `false`, the number of result values in the result set will
   * be returned in the `count` attribute. This may be disabled by default in
   * a future version of ArangoDB if calculating this value has a performance
   * impact for some queries.
   *
   * Default: `true`.
   */
  count?: boolean;
  /**
   * The number of result values to be transferred by the server in each
   * network roundtrip (or "batch").
   *
   * Must be greater than zero.
   */
  batchSize?: number;
  /**
   * If set to `false`, the AQL query results cache lookup will be skipped for
   * this query.
   *
   * Default: `true`
   */
  cache?: boolean;
  /**
   * The maximum memory size in bytes that the query is allowed to use.
   * Exceeding this value will result in the query failing with an error.
   *
   * If set to `0`, the memory limit is disabled.
   *
   * Default: `0`
   */
  memoryLimit?: number;
  /**
   * Maximum allowed execution time before the query will be killed in seconds.
   *
   * If set to `0`, the query will be allowed to run indefinitely.
   *
   * Default: `0`
   */
  maxRuntime?: number;
  /**
   * The time-to-live for the cursor in seconds. The cursor results may be
   * garbage collected by ArangoDB after this much time has passed.
   *
   * Default: `30`
   */
  ttl?: number;
  /**
   * If set to `true`, the query will throw an exception and abort if it would
    otherwise produce a warning.
   */
  failOnWarning?: boolean;
  /**
   * If set to `1` or `true`, additional query profiling information will be
   * returned in the `extra.profile` attribute if the query is not served from
   * the result cache.
   *
   * If set to `2`, the query will return execution stats per query plan node
   * in the `extra.stats.nodes` attribute. Additionally the query plan is
   * returned in `extra.plan`.
   */
  profile?: boolean | number;
  /**
   * If set to `true`, the query will be executed as a streaming query.
   */
  stream?: boolean;
  /**
   * Limits the maximum number of warnings a query will return.
   */
  maxWarningsCount?: number;
  /**
   * If set to `true` and the query has a `LIMIT` clause, the total number of
   * values matched before the last top-level `LIMIT` in the query was applied
   * will be returned in the `extra.stats.fullCount` attribute.
   */
  fullCount?: boolean;
  /**
   * An object with a `rules` property specifying a list of optimizer rules to
   * be included or excluded by the optimizer for this query. Prefix a rule
   * name with `+` to include it, or `-` to exclude it. The name `all` acts as
   * an alias matching all optimizer rules.
   */
  optimizer?: { rules: string[] };
  /**
   * Limits the maximum number of plans that will be created by the AQL query
   * optimizer.
   */
  maxPlans?: number;
  /**
   * (RocksDB only.) Maximum size of transactions in bytes.
   */
  maxTransactionSize?: number;
  /**
   * (RocksDB only.) Maximum number of operations after which an intermediate
   * commit is automatically performed.
   */
  intermediateCommitCount?: number;
  /**
   * (RocksDB only.) Maximum total size of operations in bytes after which an
   * intermediate commit is automatically performed.
   */
  intermediateCommitSize?: number;
  /**
   * (Enterprise Edition cluster only.) If set to `true`, collections
   * inaccessible to the current user will result in an access error instead
   * of being treated as empty.
   */
  skipInaccessibleCollections?: boolean;
  /**
   * (Enterprise Edition cluster only.) Limits the maximum time in seconds a
   * DBServer will wait to bring satellite collections involved in the query
   * into sync. Exceeding this value will result in the query being stopped.
   *
   * Default: `60`
   */
  satelliteSyncWait?: number;
};

/**
 * Options for explaining a query. See {@link Database.explain}.
 */
export type ExplainOptions = {
  /**
   * An object with a `rules` property specifying a list of optimizer rules to
   * be included or excluded by the optimizer for this query. Prefix a rule
   * name with `+` to include it, or `-` to exclude it. The name `all` acts as
   * an alias matching all optimizer rules.
   */
  optimizer?: { rules: string[] };
  /**
   * Maximum number of plans that the optimizer is allowed to generate.
   * Setting this to a low value limits the amount of work the optimizer does.
   */
  maxNumberOfPlans?: number;
  /**
   * If set to true, all possible execution plans will be returned as the
   * `plans` property. Otherwise only the optimal execution plan will be
   * returned as the `plan` property.
   *
   * Default: `false`
   */
  allPlans?: boolean;
};

/**
 * TODO
 */
export type TransactionDetails = {
  id: string;
  state: "running" | "committed" | "aborted";
};

/**
 * TODO
 */
export type ExplainPlan = {
  nodes: {
    [key: string]: any;
    type: string;
    id: number;
    dependencies: number[];
    estimatedCost: number;
    estimatedNrItems: number;
  }[];
  rules: string[];
  collections: {
    name: string;
    type: "read" | "write";
  }[];
  variables: {
    id: number;
    name: string;
  }[];
  estimatedCost: number;
  estimatedNrItems: number;
  initialize: boolean;
  isModificationQuery: boolean;
};

/**
 * TODO
 */
export type SingleExplainResult = {
  plan: ExplainPlan;
  cacheable: boolean;
  warnings: { code: number; message: string }[];
  stats: {
    rulesExecuted: number;
    rulesSkipped: number;
    plansCreated: number;
  };
};

/**
 * TODO
 */
export type MultiExplainResult = {
  plans: ExplainPlan[];
  warnings: { code: number; message: string }[];
  stats: {
    rulesExecuted: number;
    rulesSkipped: number;
    plansCreated: number;
  };
};

/**
 * TODO
 */
export type AstNode = {
  [key: string]: any;
  type: string;
  subNodes: AstNode[];
};

/**
 * TODO
 */
export type ParseResult = {
  parsed: boolean;
  collections: string[];
  bindVars: string[];
  ast: AstNode[];
};

/**
 * TODO
 */
export type QueryTracking = {
  enabled: boolean;
  maxQueryStringLength: number;
  maxSlowQueries: number;
  slowQueryThreshold: number;
  trackBindVars: boolean;
  trackSlowQueries: boolean;
};

/**
 * Options for query tracking. See {@link Database.queryTracking}.
 */
export type QueryTrackingOptions = {
  /**
   * If set to `false`, neither queries nor slow queries will be tracked.
   */
  enabled?: boolean;
  /**
   * The maximum query string length in bytes that will be kept in the list.
   */
  maxQueryStringLength?: number;
  /**
   * The maximum number of slow queries to be kept in the list.
   */
  maxSlowQueries?: number;
  /**
   * The threshold execution time in seconds for when a query will be
   * considered slow.
   */
  slowQueryThreshold?: number;
  /**
   * If set to `true`, bind parameters will be tracked along with queries.
   */
  trackBindVars?: boolean;
  /**
   * If set to `true` and `enabled` is also set to `true`, slow queries will be
   * tracked if their execution time exceeds `slowQueryThreshold`.
   */
  trackSlowQueries?: boolean;
};

/**
 * TODO
 */
export type QueryInfo = {
  id: string;
  query: string;
  bindVars: Dict<any>;
  runTime: number;
  started: string;
  state: "executing" | "finished" | "killed";
  stream: boolean;
};

/**
 * TODO
 */
export type CreateDatabaseUser = {
  /**
   * Username of the user to create.
   */
  username: string;
  /**
   * Password of the user to create.
   *
   * Default: `""`
   */
  passwd?: string;
  /**
   * Whether the user is active.
   *
   * Default: `true`
   */
  active?: boolean;
  /**
   * Additional data to store with the user object.
   */
  extra?: Dict<any>;
};

/**
 * Options for creating a database. See {@link Database.createDatabase}.
 */
export type CreateDatabaseOptions = {
  /**
   * Database users to create with the database.
   */
  users?: CreateDatabaseUser[];

  // Cluster options
  /**
   * (Cluster only.) The sharding method to use for new collections in the
   * database.
   */
  sharding?: "" | "flexible" | "single";
  /**
   * (Cluster only.) Default replication factor for new collections in this
   * database.
   *
   * Setting this to `1` disables replication. Setting this to `"satellite"`
   * will replicate to every DBServer.
   */
  replicationFactor?: "satellite" | number;
  /**
   * (Cluster only.) Default write concern for new collections created in this
   * database.
   */
  writeConcern?: number;
  /**
   * (Cluster only.) Default write concern for new collections created in this
   * database.
   *
   * @deprecated Renamed to `writeConcern` in ArangoDB 3.6.
   */
  minReplicationFactor?: number;
};

/**
 * TODO
 */
export type DatabaseInfo = {
  name: string;
  id: string;
  path: string;
  isSystem: boolean;

  // Cluster options
  sharding?: "" | "flexible" | "single";
  replicationFactor?: "satellite" | number;
  writeConcern?: number;
  /**
   * @deprecated Renamed to `writeConcern` in ArangoDB 3.6.
   */
  minReplicationFactor?: number;
};

/**
 * TODO
 */
export type VersionInfo = {
  server: string;
  license: "community" | "enterprise";
  version: string;
};

/**
 * TODO
 */
export type AqlUserFunction = {
  name: string;
  code: string;
  isDeterministic: boolean;
};

export type ReplaceServiceOptions = {
  configuration?: Dict<any>;
  dependencies?: Dict<string>;
  teardown?: boolean;
  setup?: boolean;
  legacy?: boolean;
  force?: boolean;
};

export type UninstallServiceOptions = {
  teardown?: boolean;
  force?: boolean;
};

/**
 * TODO
 */
export type ServiceSummary = {
  mount: string;
  name?: string;
  version?: string;
  provides: Dict<string>;
  development: boolean;
  legacy: boolean;
};

/**
 * TODO
 */
export type ServiceInfo = {
  mount: string;
  path: string;
  name?: string;
  version?: string;
  development: boolean;
  legacy: boolean;
  manifest: FoxxManifest;
  checksum: string;
  options: {
    configuration: Dict<any>;
    dependencies: Dict<string>;
  };
};

/**
 * TODO
 */
export type ServiceConfiguration = {
  type:
    | "integer"
    | "boolean"
    | "string"
    | "number"
    | "json"
    | "password"
    | "int"
    | "bool";
  currentRaw: any;
  current: any;
  title: string;
  description?: string;
  required: boolean;
  default?: any;
};

/**
 * TODO
 */
export type SingleServiceDependency = {
  multiple: false;
  current?: string;
  title: string;
  name: string;
  version: string;
  description?: string;
  required: boolean;
};

/**
 * TODO
 */
export type MultiServiceDependency = {
  multiple: true;
  current?: string[];
  title: string;
  name: string;
  version: string;
  description?: string;
  required: boolean;
};

/**
 * TODO
 */
export type ServiceDependency =
  | SingleServiceDependency
  | MultiServiceDependency;

/**
 * TODO
 */
export type ServiceTestStats = {
  tests: number;
  passes: number;
  failures: number;
  pending: number;
  duration: number;
};

/**
 * TODO
 */
export type ServiceTestStreamTest = {
  title: string;
  fullTitle: string;
  duration: number;
  err?: string;
};

/**
 * TODO
 */
export type ServiceTestStreamReport = (
  | ["start", { total: number }]
  | ["pass", ServiceTestStreamTest]
  | ["fail", ServiceTestStreamTest]
  | ["end", ServiceTestStats]
)[];

/**
 * TODO
 */
export type ServiceTestSuiteTest = {
  result: "pending" | "pass" | "fail";
  title: string;
  duration: number;
  err?: any;
};

/**
 * TODO
 */
export type ServiceTestSuite = {
  title: string;
  suites: ServiceTestSuite[];
  tests: ServiceTestSuiteTest[];
};

/**
 * TODO
 */
export type ServiceTestSuiteReport = {
  stats: ServiceTestStats;
  suites: ServiceTestSuite[];
  tests: ServiceTestSuiteTest[];
};

/**
 * TODO
 */
type ServiceTestXunitTest =
  | ["testcase", { classname: string; name: string; time: number }]
  | [
      "testcase",
      { classname: string; name: string; time: number },
      ["failure", { message: string; type: string }, string]
    ];

/**
 * TODO
 */
export type ServiceTestXunitReport = [
  "testsuite",
  {
    timestamp: number;
    tests: number;
    errors: number;
    failures: number;
    skip: number;
    time: number;
  },
  ...ServiceTestXunitTest[]
];

/**
 * TODO
 */
export type ServiceTestTapReport = string[];

/**
 * TODO
 */
export type ServiceTestDefaultTest = {
  title: string;
  fullTitle: string;
  duration: number;
  err?: string;
};

/**
 * TODO
 */
export type ServiceTestDefaultReport = {
  stats: ServiceTestStats;
  tests: ServiceTestDefaultTest[];
  pending: ServiceTestDefaultTest[];
  failures: ServiceTestDefaultTest[];
  passes: ServiceTestDefaultTest[];
};

/**
 * TODO
 */
export type SwaggerJson = {
  [key: string]: any;
  info: {
    title: string;
    description: string;
    version: string;
    license: string;
  };
  path: {
    [key: string]: any;
  };
};

/**
 * An object representing a single ArangoDB database. All arangojs collections,
 * cursors, analyzers and so on are linked to a `Database` object.
 */
export class Database {
  protected _connection: Connection;
  protected _name: string;
  protected _analyzers = new Map<string, Analyzer>();
  protected _collections = new Map<string, Collection>();
  protected _graphs = new Map<string, Graph>();
  protected _views = new Map<string, View>();

  /**
   * Creates a new `Database` instance with its own connection pool.
   *
   * @param config - An object with configuration options.
   */
  constructor(config?: Config);
  /**
   * Creates a new `Database` instance with its own connection pool.
   *
   * @param url - Base URL of the ArangoDB server or list of server URLs.
   * Equivalent to the `url` option in {@link Config}.
   */
  constructor(url: string | string[]);
  /**
   * Creates a new `Database` instance, reusing the connection pool of an
   * existing `Database` instance.
   *
   * @param database - Existing `Database` instance to reuse the connection of.
   * @param name - Database name to use. Defaults to the given database's name.
   */
  constructor(database: Database, name?: string);
  constructor(
    configOrDatabase: string | string[] | Config | Database = {},
    name?: string
  ) {
    if (isArangoDatabase(configOrDatabase)) {
      const connection = configOrDatabase._connection;
      const databaseName = name || configOrDatabase.name;
      this._connection = connection;
      this._name = databaseName;
      const database = connection.database(databaseName);
      if (database) return database;
    } else {
      const config = configOrDatabase;
      const { databaseName, ...options } =
        typeof config === "string" || Array.isArray(config)
          ? { databaseName: undefined, url: config }
          : config;
      this._connection = new Connection(options);
      this._name = databaseName || "_system";
    }
  }

  //#region misc
  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB database.
   * */
  get isArangoDatabase(): true {
    return true;
  }

  /**
   * The name of the ArangoDB database this instance represents.
   */
  get name() {
    return this._name;
  }

  /**
   * Fetches version information from the ArangoDB server.
   *
   * @example
   * ```js
   * const db = new Database();
   * const version = await db.version();
   * // the version object contains the ArangoDB version information.
   * // license: "community" or "enterprise"
   * // version: ArangoDB version number
   * // server: description of the server
   * ```
   */
  version(): Promise<VersionInfo> {
    return this.request(
      {
        method: "GET",
        path: "/_api/version",
      },
      (res) => res.body
    );
  }

  /**
   * Returns a new {@link Route} instance for the given path (relative to the
   * database) that can be used to perform arbitrary HTTP requests.
   *
   * @param path - The database-relative URL of the route. Defaults to the
   * database API root.
   * @param headers - Default headers that should be sent with each request to
   * the route.
   *
   * @example
   * ```js
   * const db = new Database();
   * const myFoxxService = db.route("my-foxx-service");
   * const response = await myFoxxService.post("users", {
   *   username: "admin",
   *   password: "hunter2"
   * });
   * // response.body is the result of
   * // POST /_db/_system/my-foxx-service/users
   * // with JSON request body '{"username": "admin", "password": "hunter2"}'
   * ```
   */
  route(path?: string, headers?: Headers): Route {
    return new Route(this, path, headers);
  }

  /**
   * @internal
   *
   * Performs an arbitrary HTTP request against the database.
   *
   * @param T - Return type to use. Defaults to the response object type.
   * @param options - Options for this request.
   * @param transform - An optional function to transform the low-level
   * response object to a more useful return value.
   */
  request<T = ArangojsResponse>(
    options: RequestOptions & { absolutePath?: boolean },
    transform?: (res: ArangojsResponse) => T
  ): Promise<T>;
  request<T = ArangojsResponse>(
    {
      absolutePath = false,
      basePath,
      ...opts
    }: RequestOptions & { absolutePath?: boolean },
    transform?: (res: ArangojsResponse) => T
  ): Promise<T> {
    if (!absolutePath) {
      basePath = `/_db/${this.name}${basePath || ""}`;
    }
    return this._connection.request({ basePath, ...opts }, transform);
  }

  /**
   * Updates the URL list by requesting a list of all coordinators in the
   * cluster and adding any endpoints not initially specified in the
   * {@link Config}.
   *
   * For long-running processes communicating with an ArangoDB cluster it is
   * recommended to run this method periodically (e.g. once per hour) to make
   * sure new coordinators are picked up correctly and can be used for
   * fail-over or load balancing.
   */
  async acquireHostList(): Promise<void> {
    const urls: string[] = await this.request(
      { path: "/_api/cluster/endpoints" },
      (res) => res.body.endpoints.map((endpoint: any) => endpoint.endpoint)
    );
    this._connection.addToHostList(urls);
  }

  /**
   * Closes all active connections of this database instance.
   *
   * Can be used to clean up idling connections during longer periods of
   * inactivity.
   *
   * **Note**: This method currently has no effect in the browser version of
   * arangojs.
   *
   * @example
   * ```js
   * const db = new Database();
   * const sessions = db.collection("sessions");
   * // Clean up expired sessions once per hour
   * setInterval(async () => {
   *   await db.query(aql`
   *     FOR session IN ${sessions}
   *     FILTER session.expires < DATE_NOW()
   *     REMOVE session IN ${sessions}
   *   `);
   *   // Making sure to close the connections because they're no longer used
   *   db.close();
   * }, 1000 * 60 * 60);
   * ```
   */
  close(): void {
    this._connection.close();
  }
  //#endregion

  //#region auth
  /**
   * Updates the `Database` instance and its connection string to use the given
   * `databaseName`, then returns itself.
   *
   * **Note**: This also affects all collections, cursors and other arangojs
   * objects originating from this database object, which may cause unexpected
   * results.
   *
   * @param databaseName - Name of the database to use.
   *
   * @deprecated Use {@link Database.database} instead.
   * */
  useDatabase(databaseName: string): this {
    this._connection.database(this._name, null);
    this._name = databaseName;
    return this;
  }

  /**
   * Updates the `Database` instance's `authorization` header to use Basic
   * authentication with the given `username` and `password`, then returns
   * itself.
   *
   * @param username - The username to authenticate with.
   * @param password - The password to authenticate with.
   *
   * @example
   * ```js
   * const db = new Database();
   * db.useDatabase("test");
   * db.useBasicAuth("admin", "hunter2");
   * // The database instance now uses the database "test"
   * // with the username "admin" and password "hunter2".
   * ```
   */
  useBasicAuth(username: string = "root", password: string = ""): this {
    this._connection.setHeader(
      "authorization",
      `Basic ${btoa(`${username}:${password}`)}`
    );
    return this;
  }

  /**
   * Updates the `Database` instance's `authorization` header to use Bearer
   * authentication with the given authentication `token`, then returns itself.
   *
   * @param token - The token to authenticate with.
   *
   * @example
   * ```js
   * const db = new Database();
   * db.useBearerAuth("keyboardcat");
   * // The database instance now uses Bearer authentication.
   * ```
   */
  useBearerAuth(token: string): this {
    this._connection.setHeader("authorization", `Bearer ${token}`);
    return this;
  }

  /**
   * Validates the given database credentials and exchanges them for an
   * authentication token, then uses the authentication token for future
   * requests and returns it.
   *
   * @param username - The username to authenticate with.
   * @param password - The password to authenticate with.
   *
   * @example
   * ```js
   * const db = new Database();
   * db.useDatabase("test");
   * await db.login("admin", "hunter2");
   * // The database instance now uses the database "test"
   * // with an authentication token for the "admin" user.
   * ```
   */
  login(username: string = "root", password: string = ""): Promise<string> {
    return this.request(
      {
        method: "POST",
        path: "/_open/auth",
        body: { username, password },
      },
      (res) => {
        this.useBearerAuth(res.body.jwt);
        return res.body.jwt;
      }
    );
  }
  //#endregion

  //#region databases
  /**
   * TODO
   */
  database(databaseName: string) {
    const db = new Database(this, databaseName);
    return db;
  }

  /**
   * Fetches the database description for the active database from the server.
   *
   * @example
   * ```js
   * const db = new Database();
   * const info = await db.get();
   * // the database exists
   * ```
   */
  get(): Promise<DatabaseInfo> {
    return this.request(
      { path: "/_api/database/current" },
      (res) => res.body.result
    );
  }

  /**
   * Checks whether the database exists.
   *
   * @example
   * ```js
   * const db = new Database();
   * const result = await db.exists();
   * // result indicates whether the database exists
   * ```
   */
  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === DATABASE_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Creates a new database with the given `databaseName` with the given
   * `options` and returns a `Database` instance for that database.
   *
   * @param databaseName - Name of the database to create.
   * @param options - Options for creating the database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const info = await db.createDatabase("mydb", {
   *   users: [{ username: "root" }]
   * });
   * // the database has been created
   * db.useDatabase("mydb");
   * db.useBasicAuth("root", "");
   * ```
   */
  createDatabase(
    databaseName: string,
    options?: CreateDatabaseOptions
  ): Promise<Database>;
  /**
   * Creates a new database with the given `databaseName` with the given
   * `users` and returns a `Database` instance for that database.
   *
   * @param databaseName - Name of the database to create.
   * @param users - Database users to create with the database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const info = await db.createDatabase("mydb", [{ username: "root" }]);
   * // the database has been created
   * db.useDatabase("mydb");
   * db.useBasicAuth("root", "");
   * ```
   */
  createDatabase(
    databaseName: string,
    users: CreateDatabaseUser[]
  ): Promise<Database>;
  createDatabase(
    databaseName: string,
    usersOrOptions?: CreateDatabaseUser[] | CreateDatabaseOptions
  ): Promise<Database> {
    const { users, ...options } = Array.isArray(usersOrOptions)
      ? { users: usersOrOptions }
      : usersOrOptions || {};
    return this.request(
      {
        method: "POST",
        path: "/_api/database",
        body: { name: databaseName, users, options },
      },
      () => new Database(this, databaseName)
    );
  }

  /**
   * Fetches all databases from the server and returns an array of their names.
   *
   * See also {@link Database.databases} and
   * {@link Database.listUserDatabases}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const names = await db.listDatabases();
   * // databases is an array of database names
   * ```
   */
  listDatabases(): Promise<string[]> {
    return this.request({ path: "/_api/database" }, (res) => res.body.result);
  }

  /**
   * Fetches all databases accessible to the active user from the server and
   * returns an array of their names.
   *
   * See also {@link Database.userDatabases} and
   * {@link Database.listDatabases}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const names = await db.listUserDatabases();
   * // databases is an array of database names
   * ```
   */
  listUserDatabases(): Promise<string[]> {
    return this.request(
      { path: "/_api/database/user" },
      (res) => res.body.result
    );
  }

  /**
   * Fetches all databases from the server and returns an array of `Database`
   * instances for those databases.
   *
   * See also {@link Database.listDatabases} and
   * {@link Database.userDatabases}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const names = await db.databases();
   * // databases is an array of databases
   * ```
   */
  databases(): Promise<Database[]> {
    return this.request({ path: "/_api/database" }, (res) =>
      (res.body.result as string[]).map((name) => new Database(this, name))
    );
  }

  /**
   * Fetches all databases accessible to the active user from the server and
   * returns an array of `Database` instances for those databases.
   *
   * See also {@link Database.listUserDatabases} and
   * {@link Database.databases}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const names = await db.userDatabases();
   * // databases is an array of databases
   * ```
   */
  userDatabases(): Promise<Database[]> {
    return this.request({ path: "/_api/database/user" }, (res) =>
      (res.body.result as string[]).map((name) => new Database(this, name))
    );
  }

  /**
   * Deletes the database with the given `databaseName` from the server.
   *
   * @param databaseName - Name of the database to delete.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.dropDatabase("mydb");
   * // database "mydb" no longer exists
   * ```
   */
  dropDatabase(databaseName: string): Promise<boolean> {
    return this.request(
      {
        method: "DELETE",
        path: `/_api/database/${databaseName}`,
      },
      (res) => res.body.result
    );
  }
  //#endregion

  //#region collections
  /**
   * Returns a {@link Collection} instance for the given collection name.
   *
   * @param T - Type to use for document data. Defaults to `any`.
   * @param collectionName - Name of the edge collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("potatoes");
   * ```
   *
   * @example
   * ```ts
   * interface Person {
   *   name: string;
   * }
   * const db = new Database();
   * const persons = db.collection<Person>("persons");
   * ```
   *
   * @example
   * ```ts
   * interface Person {
   *   name: string;
   * }
   * interface Friend {
   *   startDate: number;
   *   endDate?: number;
   * }
   * const db = new Database();
   * const documents = db.collection("persons") as DocumentCollection<Person>;
   * const edges = db.collection("friends") as EdgeCollection<Friend>;
   * ```
   */
  collection<T extends object = any>(
    collectionName: string
  ): DocumentCollection<T> & EdgeCollection<T> {
    if (!this._collections.has(collectionName)) {
      this._collections.set(
        collectionName,
        new Collection(this, collectionName)
      );
    }
    return this._collections.get(collectionName)!;
  }

  /**
   * Creates a new collection with the given `collectionName` and `options`,
   * then returns a {@link DocumentCollection} instance for the new collection.
   *
   * @param T - Type to use for document data. Defaults to `any`.
   * @param collectionName - Name of the new collection.
   * @param options - Options for creating the collection.
   *
   * @example
   * ```ts
   * const db = new Database();
   * const documents = db.createCollection("persons");
   * ```
   *
   * @example
   * ```ts
   * interface Person {
   *   name: string;
   * }
   * const db = new Database();
   * const documents = db.createCollection<Person>("persons");
   * ```
   */
  async createCollection<T extends object = any>(
    collectionName: string,
    options?: CreateCollectionOptions & {
      type?: CollectionType.DOCUMENT_COLLECTION;
    }
  ): Promise<DocumentCollection<T>>;
  /**
   * Creates a new edge collection with the given `collectionName` and
   * `options`, then returns an {@link EdgeCollection} instance for the new
   * edge collection.
   *
   * @param T - Type to use for edge document data. Defaults to `any`.
   * @param collectionName - Name of the new collection.
   * @param options - Options for creating the collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const edges = db.createCollection("friends", {
   *   type: CollectionType.EDGE_COLLECTION
   * });
   * ```
   *
   * @example
   * ```ts
   * interface Friend {
   *   startDate: number;
   *   endDate?: number;
   * }
   * const db = new Database();
   * const edges = db.createCollection<Friend>("friends", {
   *   type: CollectionType.EDGE_COLLECTION
   * });
   * ```
   */
  async createCollection<T extends object = any>(
    collectionName: string,
    options: CreateCollectionOptions & {
      type: CollectionType.EDGE_COLLECTION;
    }
  ): Promise<EdgeCollection<T>>;
  async createCollection<T extends object = any>(
    collectionName: string,
    options?: CreateCollectionOptions & { type?: CollectionType }
  ): Promise<DocumentCollection<T> & EdgeCollection<T>> {
    const collection = this.collection(collectionName);
    await collection.create(options);
    return collection;
  }

  /**
   * Creates a new edge collection with the given `collectionName` and
   * `options`, then returns an {@link EdgeCollection} instance for the new
   * edge collection.
   *
   * This is a convenience method for calling {@link Database.createCollection}
   * with `options.type` set to `EDGE_COLLECTION`.
   *
   * @param T - Type to use for edge document data. Defaults to `any`.
   * @param collectionName - Name of the new collection.
   * @param options - Options for creating the collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const edges = db.createEdgeCollection("friends");
   * ```
   *
   * @example
   * ```ts
   * interface Friend {
   *   startDate: number;
   *   endDate?: number;
   * }
   * const db = new Database();
   * const edges = db.createEdgeCollection<Friend>("friends");
   * ```
   */
  async createEdgeCollection<T extends object = any>(
    collectionName: string,
    options?: CreateCollectionOptions
  ): Promise<EdgeCollection<T>> {
    return this.createCollection(collectionName, {
      ...options,
      type: CollectionType.EDGE_COLLECTION,
    });
  }

  /**
   * TODO
   *
   * @param collectionName - The current name of the collection.
   * @param newName - The new name of the collection.
   */
  async renameCollection(
    collectionName: string,
    newName: string
  ): Promise<ArangoResponseMetadata & CollectionMetadata> {
    const result = await this.request(
      {
        method: "PUT",
        path: `/_api/collection/${collectionName}/rename`,
        body: { name: newName },
      },
      (res) => res.body
    );
    this._collections.delete(collectionName);
    return result;
  }

  /**
   * Fetches all collections from the database and returns an array of
   * collection descriptions.
   *
   * See also {@link Database.collections}.
   *
   * @param excludeSystem - Whether system collections should be excluded.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collections = await db.listCollections();
   * // collections is an array of collection descriptions
   * // not including system collections
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collections = await db.listCollections(false);
   * // collections is an array of collection descriptions
   * // including system collections
   * ```
   */
  listCollections(
    excludeSystem: boolean = true
  ): Promise<CollectionMetadata[]> {
    return this.request(
      {
        path: "/_api/collection",
        qs: { excludeSystem },
      },
      (res) => res.body.result
    );
  }

  /**
   * Fetches all collections from the database and returns an array of
   * {@link Collection} instances.
   *
   * See also {@link Database.listCollections}.
   *
   * @param excludeSystem - Whether system collections should be excluded.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collections = await db.collections();
   * // collections is an array of DocumentCollection
   * // and EdgeCollection instances
   * // not including system collections
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collections = await db.collections(false);
   * // collections is an array of DocumentCollection
   * // and EdgeCollection instances
   * // including system collections
   * ```
   */
  async collections(
    excludeSystem: boolean = true
  ): Promise<Array<DocumentCollection & EdgeCollection>> {
    const collections = await this.listCollections(excludeSystem);
    return collections.map((data) => this.collection(data.name));
  }
  //#endregion

  //#region graphs
  /**
   * Returns a {@link Graph} instance representing the graph with the given
   * `graphName`.
   *
   * @param graphName - Name of the graph.
   */
  graph(graphName: string): Graph {
    if (!this._graphs.has(graphName)) {
      this._graphs.set(graphName, new Graph(this, graphName));
    }
    return this._graphs.get(graphName)!;
  }

  /**
   * Creates a graph with the given `graphName` and `edgeDefinitions`, then
   * returns a {@link Graph} instance for the new graph.
   *
   * @param graphName - Name of the graph to be created.
   * @param edgeDefinitions - An array of edge definitions.
   * @param options - An object defining the properties of the graph.
   */
  async createGraph(
    graphName: string,
    edgeDefinitions: EdgeDefinition[],
    options?: GraphCreateOptions
  ): Promise<Graph> {
    const graph = this.graph(graphName);
    await graph.create(edgeDefinitions, options);
    return graph;
  }

  /**
   * Fetches all graphs from the database and returns an array of graph
   * descriptions.
   *
   * See also {@link Database.graphs}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graphs = await db.listGraphs();
   * // graphs is an array of graph descriptions
   * ```
   */
  listGraphs(): Promise<GraphInfo[]> {
    return this.request({ path: "/_api/gharial" }, (res) => res.body.graphs);
  }

  /**
   * Fetches all graphs from the database and returns an array of {@link Graph}
   * instances for those graphs.
   *
   * See also {@link Database.listGraphs}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graphs = await db.graphs();
   * // graphs is an array of Graph instances
   * ```
   */
  async graphs(): Promise<Graph[]> {
    const graphs = await this.listGraphs();
    return graphs.map((data: any) => this.graph(data._key));
  }
  //#endregion

  //#region views
  /**
   * Returns an {@link ArangoSearchView} instance for the given `viewName`.
   *
   * @param viewName - Name of the ArangoSearch View.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = db.view("potatoes");
   * ```
   */
  view(viewName: string): ArangoSearchView {
    if (!this._views.has(viewName)) {
      this._views.set(viewName, new View(this, viewName));
    }
    return this._views.get(viewName)!;
  }

  /**
   * Creates a new ArangoSearch View with the given `viewName` and `options`
   * and returns an {@link ArangoSearchView} instance for the created View.
   *
   * @param viewName - Name of the ArangoSearch View.
   * @param options - An object defining the properties of the View.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = await db.createArangoSearchView("potatoes");
   * // the ArangoSearch View "potatoes" now exists
   * ```
   */
  async createArangoSearchView(
    viewName: string,
    options?: ArangoSearchViewPropertiesOptions
  ): Promise<ArangoSearchView> {
    const view = this.view(viewName) as View;
    await view.create({ ...options, type: ViewType.ARANGOSEARCH_VIEW });
    return view;
  }

  /**
   * TODO
   *
   * @param viewName - The current name of the view.
   * @param newName - The new name of the view.
   */
  async renameView(
    viewName: string,
    newName: string
  ): Promise<ArangoResponseMetadata & ViewResponse> {
    const result = await this.request(
      {
        method: "PUT",
        path: `/_api/view/${viewName}/rename`,
        body: { name: newName },
      },
      (res) => res.body
    );
    this._views.delete(viewName);
    return result;
  }

  /**
   * Fetches all Views from the database and returns an array of View
   * descriptions.
   *
   * See also {@link Database.views}.
   *
   * @example
   * ```js
   * const db = new Database();
   *
   * const views = await db.listViews();
   * // views is an array of View descriptions
   * ```
   */
  listViews(): Promise<ViewDescription[]> {
    return this.request({ path: "/_api/view" }, (res) => res.body.result);
  }

  /**
   * Fetches all Views from the database and returns an array of
   * {@link ArangoSearchView} instances for the Views.
   *
   * See also {@link Database.listViews}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const views = await db.views();
   * // views is an array of ArangoSearch View instances
   * ```
   */
  async views(): Promise<ArangoSearchView[]> {
    const views = await this.listViews();
    return views.map((data) => this.view(data.name));
  }
  //#endregion

  //#region analyzers
  /**
   * Returns an {@link Analyzer} instance representing the Analyzer with the
   * given `analyzerName`.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzer = db.analyzer("some-analyzer");
   * const info = await analyzer.get();
   * ```
   */
  analyzer(analyzerName: string): Analyzer {
    if (!this._analyzers.has(analyzerName)) {
      this._analyzers.set(analyzerName, new Analyzer(this, analyzerName));
    }
    return this._analyzers.get(analyzerName)!;
  }

  /**
   * Creates a new Analyzer with the given `analyzerName` and `options`, then
   * returns an {@link Analyzer} instance for the new Analyzer.
   *
   * @param analyzerName - Name of the Analyzer.
   * @param options - An object defining the properties of the Analyzer.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzer = await db.createAnalyzer("potatoes", { type: "identity" });
   * // the identity Analyzer "potatoes" now exists
   * ```
   */
  async createAnalyzer(
    analyzerName: string,
    options: CreateAnalyzerOptions
  ): Promise<Analyzer> {
    const analyzer = this.analyzer(analyzerName);
    await analyzer.create(options);
    return analyzer;
  }

  /**
   * Fetches all Analyzers visible in the database and returns an array of
   * Analyzer descriptions.
   *
   * See also {@link Database.analyzers}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzers = await db.listAnalyzers();
   * // analyzers is an array of Analyzer descriptions
   * ```
   */
  listAnalyzers(): Promise<AnalyzerDescription[]> {
    return this.request({ path: "/_api/analyzer" }, (res) => res.body.result);
  }

  /**
   * Fetches all Analyzers visible in the database and returns an array of
   * {@link Analyzer} instances for those Analyzers.
   *
   * See also {@link Database.listAnalyzers}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzers = await db.analyzers();
   * // analyzers is an array of Analyzer instances
   * ```
   */
  async analyzers(): Promise<Analyzer[]> {
    const analyzers = await this.listAnalyzers();
    return analyzers.map((data) => this.analyzer(data.name));
  }
  //#endregion

  //#region transactions
  /**
   * Performs a server-side JavaScript transaction and returns its return
   * value.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link ArangoCollection} interface: {@link Collection},
   * {@link GraphVertexCollection}, {@link GraphEdgeCollection} as well as
   * (in TypeScript) {@link DocumentCollection} and {@link EdgeCollection}.
   *
   * **Note**: The `action` function will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any values other than those passed via the `params` option.
   * See the official ArangoDB documentation for
   * {@link https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html | the JavaScript `@arangodb` module}
   * for information about accessing the database from within ArangoDB's
   * server-side JavaScript environment.
   *
   * @param collections - Collections involved in the transaction.
   * @param action - A string evaluating to a JavaScript function to be
   * executed on the server.
   * @param options - Options for the transaction. If `options.allowImplicit`
   * is specified, it will be used if `collections.allowImplicit` was not
   * specified.
   *
   * @example
   * ```js
   * const db = new Database();
   *
   * const action = `
   *   function(params) {
   *     // This code will be executed inside ArangoDB!
   *     const { query } = require("@arangodb");
   *     return query\`
   *         FOR user IN _users
   *         FILTER user.age > ${params.age}
   *         RETURN u.user
   *       \`.toArray();
   *   }
   * `);
   *
   * const result = await db.executeTransaction({
   *   read: ["_users"]
   * }, action, {
   *   params: { age: 12 }
   * });
   * // result contains the return value of the action
   * ```
   */
  executeTransaction(
    collections: TransactionCollections & { allowImplicit?: boolean },
    action: string,
    options?: TransactionOptions & { params?: any }
  ): Promise<any>;
  /**
   * Performs a server-side transaction and returns its return value.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link ArangoCollection} interface: {@link Collection},
   * {@link GraphVertexCollection}, {@link GraphEdgeCollection} as well as
   * (in TypeScript) {@link DocumentCollection} and {@link EdgeCollection}.
   *
   * **Note**: The `action` function will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any values other than those passed via the `params` option.
   * See the official ArangoDB documentation for
   * {@link https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html | the JavaScript `@arangodb` module}
   * for information about accessing the database from within ArangoDB's
   * server-side JavaScript environment.
   *
   * @param collections - Collections that can be read from and written to
   * during the transaction.
   * @param action - A string evaluating to a JavaScript function to be
   * executed on the server.
   * @param options - Options for the transaction.
   *
   * @example
   * ```js
   * const db = new Database();
   *
   * const action = `
   *   function(params) {
   *     // This code will be executed inside ArangoDB!
   *     const { query } = require("@arangodb");
   *     return query\`
   *         FOR user IN _users
   *         FILTER user.age > ${params.age}
   *         RETURN u.user
   *       \`.toArray();
   *   }
   * `);
   *
   * const result = await db.executeTransaction(["_users"], action, {
   *   params: { age: 12 }
   * });
   * // result contains the return value of the action
   * ```
   */
  executeTransaction(
    collections: (string | ArangoCollection)[],
    action: string,
    options?: TransactionOptions & { params?: any }
  ): Promise<any>;
  /**
   * Performs a server-side transaction and returns its return value.
   *
   * The Collection can be specified as a collection name (string) or an object
   * implementing the {@link ArangoCollection} interface: {@link Collection},
   * {@link GraphVertexCollection}, {@link GraphEdgeCollection} as well as
   * (in TypeScript) {@link DocumentCollection} and {@link EdgeCollection}.
   *
   * **Note**: The `action` function will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any values other than those passed via the `params` option.
   * See the official ArangoDB documentation for
   * {@link https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html | the JavaScript `@arangodb` module}
   * for information about accessing the database from within ArangoDB's
   * server-side JavaScript environment.
   *
   * @param collection - A collection that can be read from and written to
   * during the transaction.
   * @param action - A string evaluating to a JavaScript function to be
   * executed on the server.
   * @param options - Options for the transaction.
   *
   * @example
   * ```js
   * const db = new Database();
   *
   * const action = `
   *   function(params) {
   *     // This code will be executed inside ArangoDB!
   *     const { query } = require("@arangodb");
   *     return query\`
   *         FOR user IN _users
   *         FILTER user.age > ${params.age}
   *         RETURN u.user
   *       \`.toArray();
   *   }
   * `);
   *
   * const result = await db.executeTransaction("_users", action, {
   *   params: { age: 12 }
   * });
   * // result contains the return value of the action
   * ```
   */
  executeTransaction(
    collection: string | ArangoCollection,
    action: string,
    options?: TransactionOptions & { params?: any }
  ): Promise<any>;
  executeTransaction(
    collections:
      | (TransactionCollections & { allowImplicit?: boolean })
      | (string | ArangoCollection)[]
      | string
      | ArangoCollection,
    action: string,
    options?: TransactionOptions & { params?: any }
  ): Promise<any> {
    return this.request(
      {
        method: "POST",
        path: "/_api/transaction",
        body: {
          collections: coerceTransactionCollections(collections),
          action,
          ...options,
        },
      },
      (res) => res.body.result
    );
  }

  /**
   * Returns a {@link Transaction} instance for an existing streaming
   * transaction with the given `id`.
   *
   * See also {@link Database.beginTransaction}.
   *
   * @param id - The `id` of an existing stream transaction.
   *
   * @example
   * ```js
   * const trx1 = await db.beginTransaction(collections);
   * const id = trx1.id;
   * // later
   * const trx2 = db.transaction(id);
   * await trx2.commit();
   * ```
   */
  transaction(transactionId: string): Transaction {
    return new Transaction(this, transactionId);
  }

  /**
   * Begins a new streaming transaction for the given collections, then returns
   * a {@link Transaction} instance for the transaction.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link ArangoCollection} interface: {@link Collection},
   * {@link GraphVertexCollection}, {@link GraphEdgeCollection} as well as
   * (in TypeScript) {@link DocumentCollection} and {@link EdgeCollection}.
   *
   * @param collections - Collections involved in the transaction.
   * @param options - Options for the transaction.
   *
   * @example
   * ```js
   * const vertices = db.collection("vertices");
   * const edges = db.collection("edges");
   * const trx = await db.beginTransaction({
   *   read: ["vertices"],
   *   write: [edges] // collection instances can be passed directly
   * });
   * const start = await trx.run(() => vertices.document("a"));
   * const end = await trx.run(() => vertices.document("b"));
   * await trx.run(() => edges.save({ _from: start._id, _to: end._id }));
   * await trx.commit();
   * ```
   */
  beginTransaction(
    collections: TransactionCollections,
    options?: TransactionOptions
  ): Promise<Transaction>;
  /**
   * Begins a new streaming transaction for the given collections, then returns
   * a {@link Transaction} instance for the transaction.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link ArangoCollection} interface: {@link Collection},
   * {@link GraphVertexCollection}, {@link GraphEdgeCollection} as well as
   * (in TypeScript) {@link DocumentCollection} and {@link EdgeCollection}.
   *
   * @param collections - Collections that can be read from and written to
   * during the transaction.
   * @param options - Options for the transaction.
   *
   * @example
   * ```js
   * const vertices = db.collection("vertices");
   * const edges = db.collection("edges");
   * const trx = await db.beginTransaction([
   *   "vertices",
   *   edges // collection instances can be passed directly
   * ]);
   * const start = await trx.run(() => vertices.document("a"));
   * const end = await trx.run(() => vertices.document("b"));
   * await trx.run(() => edges.save({ _from: start._id, _to: end._id }));
   * await trx.commit();
   * ```
   */
  beginTransaction(
    collections: (string | ArangoCollection)[],
    options?: TransactionOptions
  ): Promise<Transaction>;
  /**
   * Begins a new streaming transaction for the given collections, then returns
   * a {@link Transaction} instance for the transaction.
   *
   * The collection can be specified as a collection name (string) or an object
   * implementing the {@link ArangoCollection} interface: {@link Collection},
   * {@link GraphVertexCollection}, {@link GraphEdgeCollection} as well as
   * (in TypeScript) {@link DocumentCollection} and {@link EdgeCollection}.
   *
   * @param collections - A collection that can be read from and written to
   * during the transaction.
   * @param options - Options for the transaction.
   *
   * @example
   * ```js
   * const vertices = db.collection("vertices");
   * const start = vertices.document("a");
   * const end = vertices.document("b");
   * const edges = db.collection("edges");
   * const trx = await db.beginTransaction(
   *   edges // collection instances can be passed directly
   * );
   * await trx.run(() => edges.save({ _from: start._id, _to: end._id }));
   * await trx.commit();
   * ```
   */
  beginTransaction(
    collection: string | ArangoCollection,
    options?: TransactionOptions
  ): Promise<Transaction>;
  beginTransaction(
    collections:
      | TransactionCollections
      | (string | ArangoCollection)[]
      | string
      | ArangoCollection,
    options?: TransactionOptions
  ): Promise<Transaction> {
    return this.request(
      {
        method: "POST",
        path: "/_api/transaction/begin",
        body: {
          collections: coerceTransactionCollections(collections),
          ...options,
        },
      },
      (res) => new Transaction(this, res.body.result.id)
    );
  }

  /**
   * Fetches all active transactions from the database and returns an array of
   * transaction descriptions.
   *
   * See also {@link Database.transactions}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const transactions = await db.listTransactions();
   * // transactions is an array of transaction descriptions
   * ```
   */
  listTransactions(): Promise<TransactionDetails[]> {
    return this._connection.request(
      { path: "/_api/transaction" },
      (res) => res.body.transactions
    );
  }

  /**
   * Fetches all active transactions from the database and returns an array of
   * {@link Transaction} instances for those transactions.
   *
   * See also {@link Database.listTransactions}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const transactions = await db.transactions();
   * // transactions is an array of transactions
   * ```
   */
  async transactions(): Promise<Transaction[]> {
    const transactions = await this.listTransactions();
    return transactions.map((data) => this.transaction(data.id));
  }
  //#endregion

  //#region queries
  /**
   * Performs a database query using the given `query`, then returns a new
   * {@link ArrayCursor} instance for the result set.
   *
   * See the {@link aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An object containing an AQL query string and bind
   * parameters, e.g. the object returned from an {@link aql} template string.
   * @param options - Options for the query execution.
   *
   * @example
   * ```js
   * const db = new Database();
   * const active = true;
   *
   * // Using an aql template string
   * const cursor = await db.query(aql`
   *   FOR u IN _users
   *   FILTER u.authData.active == ${active}
   *   RETURN u.user
   * `);
   * // cursor is a cursor for the query result
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const active = true;
   *
   * // Using an object with a regular multi-line string
   * const cursor = await db.query({
   *   query: `
   *     FOR u IN _users
   *     FILTER u.authData.active == @active
   *     RETURN u.user
   *   `,
   *   bindVars: { active: active }
   * });
   * ```
   */
  query(query: AqlQuery, options?: QueryOptions): Promise<ArrayCursor>;
  /**
   * Performs a database query using the given `query` and `bindVars`, then
   * returns a new {@link ArrayCursor} instance for the result set.
   *
   * See the {@link aql} template string handler for a safer and easier
   * alternative to passing strings directly.
   *
   * @param query - An AQL query string.
   * @param bindVars - An object defining bind parameters for the query.
   * @param options - Options for the query execution.
   *
   * @example
   * ```js
   * const db = new Database();
   * const active = true;
   *
   * const cursor = await db.query(
   *   // A normal multi-line string
   *   `
   *     FOR u IN _users
   *     FILTER u.authData.active == @active
   *     RETURN u.user
   *   `,
   *   { active: active }
   * );
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const active = true;
   *
   * const cursor = await db.query(
   *   // An AQL literal created from a normal multi-line string
   *   aql.literal(`
   *     FOR u IN _users
   *     FILTER u.authData.active == @active
   *     RETURN u.user
   *   `),
   *   { active: active }
   * );
   * ```
   */
  query(
    query: string | AqlLiteral,
    bindVars?: Dict<any>,
    options?: QueryOptions
  ): Promise<ArrayCursor>;
  query(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: Dict<any>,
    options?: QueryOptions
  ): Promise<ArrayCursor> {
    if (isAqlQuery(query)) {
      options = bindVars;
      bindVars = query.bindVars;
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }
    const {
      allowDirtyRead,
      count,
      batchSize,
      cache,
      memoryLimit,
      ttl,
      timeout,
      ...opts
    } = options || {};
    return this.request(
      {
        method: "POST",
        path: "/_api/cursor",
        body: {
          query,
          bindVars,
          count,
          batchSize,
          cache,
          memoryLimit,
          ttl,
          options: opts,
        },
        allowDirtyRead,
        timeout,
      },
      (res) =>
        new ArrayCursor(this, res.body, res.arangojsHostId, allowDirtyRead)
    );
  }

  /**
   * Explains a database query using the given `query`.
   *
   * See the {@link aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An object containing an AQL query string and bind
   * parameters, e.g. the object returned from an {@link aql} template string.
   * @param options - Options for explaining the query.
   */
  explain(
    query: AqlQuery,
    options?: ExplainOptions & { allPlans?: false }
  ): Promise<SingleExplainResult & ArangoResponseMetadata>;
  /**
   * Explains a database query using the given `query`.
   *
   * See the {@link aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An object containing an AQL query string and bind
   * parameters, e.g. the object returned from an {@link aql} template string.
   * @param options - Options for explaining the query.
   */
  explain(
    query: AqlQuery,
    options?: ExplainOptions & { allPlans: true }
  ): Promise<MultiExplainResult & ArangoResponseMetadata>;
  /**
   * Explains a database query using the given `query` and `bindVars`.
   *
   * See the {@link aql} template string handler for a safer and easier
   * alternative to passing strings directly.
   *
   * @param query - An AQL query string.
   * @param bindVars - An object defining bind parameters for the query.
   * @param options - Options for explaining the query.
   */
  explain(
    query: string | AqlLiteral,
    bindVars?: Dict<any>,
    options?: ExplainOptions & { allPlans?: false }
  ): Promise<SingleExplainResult & ArangoResponseMetadata>;
  /**
   * Explains a database query using the given `query` and `bindVars`.
   *
   * See the {@link aql} template string handler for a safer and easier
   * alternative to passing strings directly.
   *
   * @param query - An AQL query string.
   * @param bindVars - An object defining bind parameters for the query.
   * @param options - Options for explaining the query.
   */
  explain(
    query: string | AqlLiteral,
    bindVars?: Dict<any>,
    options?: ExplainOptions & { allPlans: true }
  ): Promise<MultiExplainResult & ArangoResponseMetadata>;
  explain(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: Dict<any>,
    options?: ExplainOptions
  ): Promise<
    (SingleExplainResult | MultiExplainResult) & ArangoResponseMetadata
  > {
    if (isAqlQuery(query)) {
      options = bindVars;
      bindVars = query.bindVars;
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }
    return this.request(
      {
        method: "POST",
        path: "/_api/explain",
        body: { query, bindVars, options },
      },
      (res) => res.body
    );
  }

  /**
   * Parses the given query and returns the result.
   *
   * See the {@link aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An AQL query string or an object containing an AQL query
   * string and bind parameters, e.g. the object returned from an {@link aql}
   * template string.
   */
  parse(query: string | AqlQuery | AqlLiteral): Promise<ParseResult> {
    if (isAqlQuery(query)) {
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }
    return this.request(
      {
        method: "POST",
        path: "/_api/query",
        body: { query },
      },
      (res) => res.body
    );
  }

  /**
   * Fetches the query tracking properties.
   */
  queryTracking(): Promise<QueryTracking>;
  /**
   * Modifies the query tracking properties.
   *
   * @param options - Options for query tracking.
   *
   * @example
   * ```js
   * // track up to 5 slow queries exceeding 5 seconds execution time
   * await db.setQueryTracking({
   *   enabled: true,
   *   trackSlowQueries: true,
   *   maxSlowQueries: 5,
   *   slowQueryThreshold: 5
   * });
   * ```
   */
  queryTracking(options: QueryTrackingOptions): Promise<QueryTracking>;
  queryTracking(options?: QueryTrackingOptions): Promise<QueryTracking> {
    return this.request(
      options
        ? {
            method: "PUT",
            path: "/_api/query/properties",
            body: options,
          }
        : {
            method: "GET",
            path: "/_api/query/properties",
          },
      (res) => res.body
    );
  }

  /**
   * Fetches a list of information for all currently running queries.
   *
   * See also {@link Database.listSlowQueries} and {@link Database.killQuery}.
   */
  listRunningQueries(): Promise<QueryInfo[]> {
    return this.request(
      {
        method: "GET",
        path: "/_api/query/current",
      },
      (res) => res.body
    );
  }

  /**
   * Fetches a list of information for all recent slow queries.
   *
   * See also {@link Database.listRunningQueries} and
   * {@link Database.clearSlowQueries}.
   */
  listSlowQueries(): Promise<QueryInfo[]> {
    return this.request(
      {
        method: "GET",
        path: "/_api/query/slow",
      },
      (res) => res.body
    );
  }

  /**
   * Clears the list of recent slow queries.
   *
   * See also {@link Database.listSlowQueries}.
   */
  clearSlowQueries(): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        path: "/_api/query/slow",
      },
      () => undefined
    );
  }

  /**
   * Kills a running query with the given `queryId`.
   *
   * See also {@link Database.listRunningQueries}.
   *
   * @param queryId - The ID of a currently running query.
   */
  killQuery(queryId: string): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        path: `/_api/query/${queryId}`,
      },
      () => undefined
    );
  }
  //#endregion

  //#region functions
  /**
   * Fetches a list of all AQL user functions registered with the database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const functions = await db.listFunctions();
   * const names = functions.map(fn => fn.name);
   * ```
   */
  listFunctions(): Promise<AqlUserFunction[]> {
    return this.request(
      { path: "/_api/aqlfunction" },
      (res) => res.body.result
    );
  }

  /**
   * Creates an AQL user function with the given _name_ and _code_ if it does
   * not already exist or replaces it if a function with the same name already
   * existed.
   *
   * @param name - A valid AQL function name. The function name must consist
   * of at least two alphanumeric identifiers separated with double colons.
   * @param code - A string evaluating to a JavaScript function (not a
   * JavaScript function object).
   * @param isDeterministic - If set to `true`, the function is expected to
   * always return the same result for equivalent inputs. This option currently
   * has no effect but may allow for optimizations in the future.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.createFunction(
   *   "ACME::ACCOUNTING::CALCULATE_VAT",
   *   "(price) => price * 0.19"
   * );
   * // Use the new function in an AQL query with template handler:
   * const cursor = await db.query(aql`
   *   FOR product IN products
   *   RETURN MERGE(
   *     { vat: ACME::ACCOUNTING::CALCULATE_VAT(product.price) },
   *     product
   *   )
   * `);
   * // cursor is a cursor for the query result
   * ```
   */
  createFunction(
    name: string,
    code: string,
    isDeterministic: boolean = false
  ): Promise<ArangoResponseMetadata & { isNewlyCreated: boolean }> {
    return this.request(
      {
        method: "POST",
        path: "/_api/aqlfunction",
        body: { name, code, isDeterministic },
      },
      (res) => res.body
    );
  }

  /**
   * Deletes the AQL user function with the given name from the database.
   *
   * @param name - The name of the user function to drop.
   * @param group - If set to `true`, all functions with a name starting with
   * `name` will be deleted, otherwise only the function with the exact name
   * will be deleted.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.dropFunction("ACME::ACCOUNTING::CALCULATE_VAT");
   * // the function no longer exists
   * ```
   */
  dropFunction(
    name: string,
    group: boolean = false
  ): Promise<ArangoResponseMetadata & { deletedCount: number }> {
    return this.request(
      {
        method: "DELETE",
        path: `/_api/aqlfunction/${name}`,
        qs: { group },
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region services
  listServices(excludeSystem: boolean = true): Promise<ServiceSummary[]> {
    return this.request(
      {
        path: "/_api/foxx",
        qs: { excludeSystem },
      },
      (res) => res.body
    );
  }

  async installService(
    mount: string,
    source: Readable | Buffer | Blob | string,
    options: InstallServiceOptions = {}
  ): Promise<ServiceInfo> {
    const { configuration, dependencies, ...qs } = options;
    const req = await toForm({
      configuration,
      dependencies,
      source,
    });
    return await this.request(
      {
        ...req,
        method: "POST",
        path: "/_api/foxx",
        isBinary: true,
        qs: { ...qs, mount },
      },
      (res) => res.body
    );
  }

  async upgradeService(
    mount: string,
    source: Readable | Buffer | Blob | string,
    options: ReplaceServiceOptions = {}
  ): Promise<ServiceInfo> {
    const { configuration, dependencies, ...qs } = options;
    const req = await toForm({
      configuration,
      dependencies,
      source,
    });
    return await this.request(
      {
        ...req,
        method: "PATCH",
        path: "/_api/foxx/service",
        isBinary: true,
        qs: { ...qs, mount },
      },
      (res) => res.body
    );
  }

  async replaceService(
    mount: string,
    source: Readable | Buffer | Blob | string,
    options: ReplaceServiceOptions = {}
  ): Promise<ServiceInfo> {
    const { configuration, dependencies, ...qs } = options;
    const req = await toForm({
      configuration,
      dependencies,
      source,
    });
    return await this.request(
      {
        ...req,
        method: "PUT",
        path: "/_api/foxx/service",
        isBinary: true,
        qs: { ...qs, mount },
      },
      (res) => res.body
    );
  }

  uninstallService(
    mount: string,
    options?: UninstallServiceOptions
  ): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        path: "/_api/foxx/service",
        qs: { ...options, mount },
      },
      () => undefined
    );
  }

  getService(mount: string): Promise<ServiceInfo> {
    return this.request(
      {
        path: "/_api/foxx/service",
        qs: { mount },
      },
      (res) => res.body
    );
  }

  async getServiceConfiguration(
    mount: string,
    minimal?: false
  ): Promise<Dict<ServiceConfiguration>>;
  async getServiceConfiguration(
    mount: string,
    minimal: true
  ): Promise<Dict<any>>;
  async getServiceConfiguration(mount: string, minimal: boolean = false) {
    const result = await this.request(
      {
        path: "/_api/foxx/configuration",
        qs: { mount, minimal },
      },
      (res) => res.body
    );
    if (
      !minimal ||
      !Object.keys(result).every((key: string) => result[key].title)
    )
      return result;
    const values: any = {};
    for (const key of Object.keys(result)) {
      values[key] = result[key].current;
    }
    return values;
  }

  async updateServiceConfiguration(
    mount: string,
    cfg: Dict<any>,
    minimal?: false
  ): Promise<Dict<ServiceConfiguration & { warning?: string }>>;
  async updateServiceConfiguration(
    mount: string,
    cfg: Dict<any>,
    minimal: true
  ): Promise<{
    values: Dict<any>;
    warnings: Dict<string>;
  }>;
  async updateServiceConfiguration(
    mount: string,
    cfg: Dict<any>,
    minimal: boolean = false
  ) {
    const result = await this.request(
      {
        method: "PATCH",
        path: "/_api/foxx/configuration",
        body: cfg,
        qs: { mount, minimal },
      },
      (res) => res.body
    );
    if (
      minimal ||
      !result.values ||
      !Object.keys(result.values).every(
        (key: string) => result.values[key].title
      )
    ) {
      return result;
    }
    const result2 = (await this.getServiceConfiguration(mount, false)) as Dict<
      ServiceConfiguration & { warning?: string }
    >;
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async replaceServiceConfiguration(
    mount: string,
    cfg: Dict<any>,
    minimal?: false
  ): Promise<Dict<ServiceConfiguration & { warning?: string }>>;
  async replaceServiceConfiguration(
    mount: string,
    cfg: Dict<any>,
    minimal: true
  ): Promise<{
    values: Dict<any>;
    warnings: Dict<string>;
  }>;
  async replaceServiceConfiguration(
    mount: string,
    cfg: Dict<any>,
    minimal: boolean = false
  ) {
    const result = await this.request(
      {
        method: "PUT",
        path: "/_api/foxx/configuration",
        body: cfg,
        qs: { mount, minimal },
      },
      (res) => res.body
    );
    if (
      minimal ||
      !result.values ||
      !Object.keys(result.values).every(
        (key: string) => result.values[key].title
      )
    ) {
      return result;
    }
    const result2 = (await this.getServiceConfiguration(mount, false)) as Dict<
      ServiceConfiguration & { warning?: string }
    >;
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async getServiceDependencies(
    mount: string,
    minimal?: false
  ): Promise<Dict<ServiceDependency>>;
  async getServiceDependencies(
    mount: string,
    minimal: true
  ): Promise<Dict<string>>;
  async getServiceDependencies(mount: string, minimal: boolean = false) {
    const result = await this.request(
      {
        path: "/_api/foxx/dependencies",
        qs: { mount, minimal },
      },
      (res) => res.body
    );
    if (
      !minimal ||
      !Object.keys(result).every((key: string) => result[key].title)
    )
      return result;
    const values: any = {};
    for (const key of Object.keys(result)) {
      values[key] = result[key].current;
    }
    return values;
  }

  async updateServiceDependencies(
    mount: string,
    deps: Dict<string>,
    minimal?: false
  ): Promise<Dict<ServiceDependency & { warning?: string }>>;
  async updateServiceDependencies(
    mount: string,
    deps: Dict<string>,
    minimal: true
  ): Promise<{
    values: Dict<string>;
    warnings: Dict<string>;
  }>;
  async updateServiceDependencies(
    mount: string,
    deps: Dict<string>,
    minimal: boolean = false
  ) {
    const result = await this.request(
      {
        method: "PATCH",
        path: "/_api/foxx/dependencies",
        body: deps,
        qs: { mount, minimal },
      },
      (res) => res.body
    );
    if (
      minimal ||
      !result.values ||
      !Object.keys(result.values).every(
        (key: string) => result.values[key].title
      )
    ) {
      return result;
    }
    // Work around "minimal" flag not existing in 3.3
    const result2 = (await this.getServiceDependencies(mount, false)) as Dict<
      ServiceDependency & { warning?: string }
    >;
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        result2[key].warning = result.warnings[key];
      }
    }
    return result2;
  }

  async replaceServiceDependencies(
    mount: string,
    deps: Dict<string>,
    minimal?: false
  ): Promise<Dict<ServiceDependency & { warning?: string }>>;
  async replaceServiceDependencies(
    mount: string,
    deps: Dict<string>,
    minimal: true
  ): Promise<{
    values: Dict<string>;
    warnings: Dict<string>;
  }>;
  async replaceServiceDependencies(
    mount: string,
    deps: Dict<string>,
    minimal: boolean = false
  ) {
    const result = await this.request(
      {
        method: "PUT",
        path: "/_api/foxx/dependencies",
        body: deps,
        qs: { mount, minimal },
      },
      (res) => res.body
    );
    if (
      minimal ||
      !result.values ||
      !Object.keys(result.values).every(
        (key: string) => result.values[key].title
      )
    ) {
      return result;
    }
    // Work around "minimal" flag not existing in 3.3
    const result2 = (await this.getServiceDependencies(mount, false)) as Dict<
      ServiceDependency & { warning?: string }
    >;
    if (result.warnings) {
      for (const key of Object.keys(result2)) {
        (result2[key] as any).warning = result.warnings[key];
      }
    }
    return result2;
  }

  enableServiceDevelopmentMode(mount: string): Promise<ServiceInfo> {
    return this.request(
      {
        method: "POST",
        path: "/_api/foxx/development",
        qs: { mount },
      },
      (res) => res.body
    );
  }

  disableServiceDevelopmentMode(mount: string): Promise<ServiceInfo> {
    return this.request(
      {
        method: "DELETE",
        path: "/_api/foxx/development",
        qs: { mount },
      },
      (res) => res.body
    );
  }

  listServiceScripts(mount: string): Promise<Dict<string>> {
    return this.request(
      {
        path: "/_api/foxx/scripts",
        qs: { mount },
      },
      (res) => res.body
    );
  }

  runServiceScript(mount: string, name: string, params?: any): Promise<any> {
    return this.request(
      {
        method: "POST",
        path: `/_api/foxx/scripts/${name}`,
        body: params,
        qs: { mount },
      },
      (res) => res.body
    );
  }

  runServiceTests(
    mount: string,
    options?: {
      reporter?: "default";
      filter?: string;
    }
  ): Promise<ServiceTestDefaultReport>;
  runServiceTests(
    mount: string,
    options: {
      reporter: "suite";
      filter?: string;
    }
  ): Promise<ServiceTestSuiteReport>;
  runServiceTests(
    mount: string,
    options: {
      reporter: "stream";
      idiomatic: false;
      filter?: string;
    }
  ): Promise<ServiceTestStreamReport>;
  runServiceTests(
    mount: string,
    options: {
      reporter: "tap";
      idiomatic: false;
      filter?: string;
    }
  ): Promise<ServiceTestTapReport>;
  runServiceTests(
    mount: string,
    options: {
      reporter: "xunit";
      idiomatic: false;
      filter?: string;
    }
  ): Promise<ServiceTestXunitReport>;
  runServiceTests(
    mount: string,
    options: {
      reporter: "stream";
      idiomatic?: true;
      filter?: string;
    }
  ): Promise<string[]>;
  runServiceTests(
    mount: string,
    options: {
      reporter: "tap";
      idiomatic?: true;
      filter?: string;
    }
  ): Promise<string>;
  runServiceTests(
    mount: string,
    options: {
      reporter: "xunit";
      idiomatic?: true;
      filter?: string;
    }
  ): Promise<string>;
  runServiceTests(
    mount: string,
    options?: {
      reporter?: string;
      idiomatic?: boolean;
      filter?: string;
    }
  ) {
    return this.request(
      {
        method: "POST",
        path: "/_api/foxx/tests",
        qs: {
          ...options,
          mount,
        },
      },
      (res) => res.body
    );
  }

  getServiceReadme(mount: string): Promise<string | undefined> {
    return this.request(
      {
        path: "/_api/foxx/readme",
        qs: { mount },
      },
      (res) => res.body
    );
  }

  getServiceDocumentation(mount: string): Promise<SwaggerJson> {
    return this.request(
      {
        path: "/_api/foxx/swagger",
        qs: { mount },
      },
      (res) => res.body
    );
  }

  downloadService(mount: string): Promise<Buffer | Blob> {
    return this.request(
      {
        method: "POST",
        path: "/_api/foxx/download",
        qs: { mount },
        expectBinary: true,
      },
      (res) => res.body
    );
  }

  commitLocalServiceState(replace?: boolean): Promise<void> {
    return this.request(
      {
        method: "POST",
        path: "/_api/foxx/commit",
        qs: { replace },
      },
      () => undefined
    );
  }
  //#endregion
}

function coerceTransactionCollections(
  collections:
    | (TransactionCollections & { allowImplicit?: boolean })
    | (string | ArangoCollection)[]
    | string
    | ArangoCollection
): CoercedTransactionCollections {
  if (typeof collections === "string") {
    return { write: [collections] };
  }
  if (Array.isArray(collections)) {
    return { write: collections.map(colToString) };
  }
  if (isArangoCollection(collections)) {
    return { write: colToString(collections) };
  }
  const cols: CoercedTransactionCollections = {};
  if (collections) {
    if (collections.allowImplicit !== undefined) {
      cols.allowImplicit = collections.allowImplicit;
    }
    if (collections.read) {
      cols.read = Array.isArray(collections.read)
        ? collections.read.map(colToString)
        : colToString(collections.read);
    }
    if (collections.write) {
      cols.write = Array.isArray(collections.write)
        ? collections.write.map(colToString)
        : colToString(collections.write);
    }
    if (collections.exclusive) {
      cols.exclusive = Array.isArray(collections.exclusive)
        ? collections.exclusive.map(colToString)
        : colToString(collections.exclusive);
    }
  }
  return cols;
}
