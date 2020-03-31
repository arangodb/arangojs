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
  CreateAnalyzerOptions
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
  isArangoCollection
} from "./collection";
import {
  ArangoResponseMetadata,
  Config,
  Connection,
  Headers,
  RequestOptions
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
  ViewType
} from "./view";

function colToString(collection: string | ArangoCollection): string {
  if (isArangoCollection(collection)) {
    return String(collection.name);
  } else return String(collection);
}

export function isArangoDatabase(database: any): database is Database {
  return Boolean(database && database.isArangoDatabase);
}

type CoercedTransactionCollections = {
  allowImplicit?: boolean;
  exclusive?: string | string[];
  write?: string | string[];
  read?: string | string[];
};

export type TransactionCollections = {
  allowImplicit?: boolean;
  exclusive?: string | ArangoCollection | (string | ArangoCollection)[];
  write?: string | ArangoCollection | (string | ArangoCollection)[];
  read?: string | ArangoCollection | (string | ArangoCollection)[];
};

export type TransactionOptions = {
  allowImplicit?: boolean;
  lockTimeout?: number;
  maxTransactionSize?: number;
  /** @deprecated removed in ArangoDB 3.4, RocksDB only */
  intermediateCommitCount?: number;
  /** @deprecated removed in ArangoDB 3.4, RocksDB only */
  intermediateCommitSize?: number;
  waitForSync?: boolean;
};

export type InstallServiceOptions = {
  configuration?: Dict<any>;
  dependencies?: Dict<string>;
  development?: boolean;
  setup?: boolean;
  legacy?: boolean;
};

export type QueryOptions = {
  allowDirtyRead?: boolean;
  timeout?: number;
  count?: boolean;
  batchSize?: number;
  cache?: boolean;
  memoryLimit?: number;
  maxRuntime?: number;
  ttl?: number;
  failOnWarning?: boolean;
  profile?: boolean | number;
  stream?: boolean;
  maxWarningsCount?: number;
  fullCount?: boolean;
  optimizer?: { rules: string[] };
  maxPlans?: number;
  /** RocksDB only */
  maxTransactionSize?: number;
  /** RocksDB only */
  intermediateCommitCount?: number;
  /** RocksDB only */
  intermediateCommitSize?: number;
  /** Enterprise Edition only */
  skipInaccessibleCollections?: boolean;
  /** Enterprise Edition only */
  satelliteSyncWait?: number;
};

export type ExplainOptions = {
  optimizer?: { rules: string[] };
  maxNumberOfPlans?: number;
  allPlans?: boolean;
};

export type TransactionDetails = {
  id: string;
  state: "running" | "committed" | "aborted";
};

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

export type ExplainResult = {
  plan?: ExplainPlan;
  plans?: ExplainPlan[];
  cacheable: boolean;
  warnings: { code: number; message: string }[];
  stats: {
    rulesExecuted: number;
    rulesSkipped: number;
    plansCreated: number;
  };
};

export type AstNode = {
  [key: string]: any;
  type: string;
  subNodes: AstNode[];
};

export type ParseResult = {
  parsed: boolean;
  collections: string[];
  bindVars: string[];
  ast: AstNode[];
};

export type QueryTracking = {
  enabled: boolean;
  maxQueryStringLength: number;
  maxSlowQueries: number;
  slowQueryThreshold: number;
  trackBindVars: boolean;
  trackSlowQueries: boolean;
};

export type QueryTrackingOptions = {
  enabled?: boolean;
  maxQueryStringLength?: number;
  maxSlowQueries?: number;
  slowQueryThreshold?: number;
  trackBindVars?: boolean;
  trackSlowQueries?: boolean;
};

export type QueryInfo = {
  id: string;
  query: string;
  bindVars: Dict<any>;
  runTime: number;
  started: string;
  state: "executing" | "finished" | "killed";
  stream: boolean;
};

export type CreateDatabaseUser = {
  username: string;
  passwd?: string;
  active?: boolean;
  extra?: Dict<any>;
};

export type CreateDatabaseOptions = {
  users?: CreateDatabaseUser[];

  // Cluster options
  sharding?: "" | "flexible" | "single";
  replicationFactor?: "satellite" | number;
  writeConcern?: number;
  /** @deprecated ArangoDB 3.6, use `writeConcern` instead */
  minReplicationFactor?: number;
};

export type DatabaseInfo = {
  name: string;
  id: string;
  path: string;
  isSystem: boolean;

  // Cluster options
  sharding?: "" | "flexible" | "single";
  replicationFactor?: "satellite" | number;
  writeConcern?: number;
  /** @deprecated ArangoDB 3.6, use `writeConcern` instead */
  minReplicationFactor?: number;
};

export type VersionInfo = {
  server: string;
  license: "community" | "enterprise";
  version: string;
};

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

export type ServiceSummary = {
  mount: string;
  name?: string;
  version?: string;
  provides: Dict<string>;
  development: boolean;
  legacy: boolean;
};

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

export type ServiceMonoDependency = {
  multiple: false;
  current?: string;
  title: string;
  name: string;
  version: string;
  description?: string;
  required: boolean;
};

export type ServiceMultiDependency = {
  multiple: true;
  current?: string[];
  title: string;
  name: string;
  version: string;
  description?: string;
  required: boolean;
};

export type ServiceDependency = ServiceMonoDependency | ServiceMultiDependency;

export type ServiceTestStats = {
  tests: number;
  passes: number;
  failures: number;
  pending: number;
  duration: number;
};

export type ServiceTestStreamTest = {
  title: string;
  fullTitle: string;
  duration: number;
  err?: string;
};

export type ServiceTestStreamReport = (
  | ["start", { total: number }]
  | ["pass", ServiceTestStreamTest]
  | ["fail", ServiceTestStreamTest]
  | ["end", ServiceTestStats]
)[];

export type ServiceTestSuiteTest = {
  result: "pending" | "pass" | "fail";
  title: string;
  duration: number;
  err?: any;
};

export type ServiceTestSuite = {
  title: string;
  suites: ServiceTestSuite[];
  tests: ServiceTestSuiteTest[];
};

export type ServiceTestSuiteReport = {
  stats: ServiceTestStats;
  suites: ServiceTestSuite[];
  tests: ServiceTestSuiteTest[];
};

type ServiceTestXunitTest =
  | ["testcase", { classname: string; name: string; time: number }]
  | [
      "testcase",
      { classname: string; name: string; time: number },
      ["failure", { message: string; type: string }, string]
    ];

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

export type ServiceTestTapReport = string[];

export type ServiceTestDefaultTest = {
  title: string;
  fullTitle: string;
  duration: number;
  err?: string;
};

export type ServiceTestDefaultReport = {
  stats: ServiceTestStats;
  tests: ServiceTestDefaultTest[];
  pending: ServiceTestDefaultTest[];
  failures: ServiceTestDefaultTest[];
  passes: ServiceTestDefaultTest[];
};

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
      const database = configOrDatabase;
      this._connection = database._connection;
      this._name = name || database.name;
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
        path: "/_api/version"
      },
      res => res.body
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
      res => res.body.endpoints.map((endpoint: any) => endpoint.endpoint)
    );
    this._connection.addToHostList(urls);
  }

  /**
   * Closes all active connections of the database instance.
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
        body: { username, password }
      },
      res => {
        this.useBearerAuth(res.body.jwt);
        return res.body.jwt;
      }
    );
  }
  //#endregion

  //#region databases
  database(databaseName: string) {
    const db = new Database(this, databaseName);
    return db;
  }

  get(): Promise<DatabaseInfo> {
    return this.request(
      { path: "/_api/database/current" },
      res => res.body.result
    );
  }

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

  createDatabase(
    databaseName: string,
    options?: CreateDatabaseOptions
  ): Promise<boolean>;
  createDatabase(
    databaseName: string,
    users: CreateDatabaseUser[]
  ): Promise<boolean>;
  createDatabase(
    databaseName: string,
    usersOrOptions?: CreateDatabaseUser[] | CreateDatabaseOptions
  ): Promise<boolean> {
    const { users, ...options } = Array.isArray(usersOrOptions)
      ? { users: usersOrOptions }
      : usersOrOptions || {};
    return this.request(
      {
        method: "POST",
        path: "/_api/database",
        body: { name: databaseName, users, options }
      },
      res => res.body.result
    );
  }

  listDatabases(): Promise<string[]> {
    return this.request({ path: "/_api/database" }, res => res.body.result);
  }

  listUserDatabases(): Promise<string[]> {
    return this.request(
      { path: "/_api/database/user" },
      res => res.body.result
    );
  }

  dropDatabase(databaseName: string): Promise<boolean> {
    return this.request(
      {
        method: "DELETE",
        path: `/_api/database/${databaseName}`
      },
      res => res.body.result
    );
  }
  //#endregion

  //#region collections
  collection<T extends object = any>(
    collectionName: string
  ): DocumentCollection<T> & EdgeCollection<T> {
    return new Collection(this, collectionName);
  }

  async createCollection<T extends object = any>(
    collectionName: string,
    options: CreateCollectionOptions & {
      type: CollectionType.EDGE_COLLECTION;
    }
  ): Promise<EdgeCollection<T>>;
  async createCollection<T extends object = any>(
    collectionName: string,
    options?: CreateCollectionOptions & {
      type?: CollectionType.DOCUMENT_COLLECTION;
    }
  ): Promise<DocumentCollection<T>>;
  async createCollection<T extends object = any>(
    collectionName: string,
    options?: CreateCollectionOptions & { type?: CollectionType }
  ): Promise<DocumentCollection<T> & EdgeCollection<T>> {
    const collection = this.collection(collectionName);
    await collection.create(options);
    return collection;
  }

  async createEdgeCollection<T extends object = any>(
    collectionName: string,
    options?: CreateCollectionOptions
  ): Promise<EdgeCollection<T>> {
    return this.createCollection(collectionName, {
      ...options,
      type: CollectionType.EDGE_COLLECTION
    });
  }

  listCollections(
    excludeSystem: boolean = true
  ): Promise<CollectionMetadata[]> {
    return this.request(
      {
        path: "/_api/collection",
        qs: { excludeSystem }
      },
      res => res.body.result
    );
  }

  async collections(
    excludeSystem: boolean = true
  ): Promise<Array<DocumentCollection & EdgeCollection>> {
    const collections = await this.listCollections(excludeSystem);
    return collections.map(data => this.collection(data.name));
  }
  //#endregion

  //#region graphs
  /**
   * Returns a `Graph` instance representing the graph with the given graph
   * name.
   *
   * @param graphName - Name of the graph.
   */
  graph(graphName: string): Graph {
    return new Graph(this, graphName);
  }

  /**
   * Creates a graph with the given `graphName` and `edgeDefinitions`, then
   * returns a `Graph` instance for the new graph.
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
    const graph = new Graph(this, graphName);
    await graph.create(edgeDefinitions, options);
    return graph;
  }

  /**
   * Fetches all graphs from the database and returns an array of graph
   * descriptions.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graphs = await db.listGraphs();
   * // graphs is an array of graph descriptions
   * ```
   */
  listGraphs(): Promise<GraphInfo[]> {
    return this.request({ path: "/_api/gharial" }, res => res.body.graphs);
  }

  /**
   * Fetches all graphs from the database and returns an array of {@link Graph}
   * instances for those graphs.
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
   * Returns an {@link ArangoSearchView} instance for the given View name.
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
    return new View(this, viewName);
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
    const view = new View(this, viewName);
    await view.create({ ...options, type: ViewType.ARANGOSEARCH_VIEW });
    return view;
  }

  /**
   * Fetches all Views from the database and returns an array of View
   * descriptions.
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
    return this.request({ path: "/_api/view" }, res => res.body.result);
  }

  /**
   * Fetches all Views from the database and returns an array of
   * {@link ArangoSearchView} instances for the Views.
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
    return views.map(data => new View(this, data.name));
  }
  //#endregion

  //#region analyzers
  /**
   * Returns an `Analyzer` instance representing the Analyzer with the given
   * `analyzerName`.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzer = db.analyzer("some-analyzer");
   * const info = await analyzer.get();
   * ```
   */
  analyzer(name: string): Analyzer {
    return new Analyzer(this, name);
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
    const analyzer = new Analyzer(this, analyzerName);
    await analyzer.create(options);
    return analyzer;
  }

  /**
   * Fetches all Analyzers visible in the database and returns an array of
   * Analyzer descriptions.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzers = await db.listAnalyzers();
   * // analyzers is an array of Analyzer descriptions
   * ```
   */
  listAnalyzers(): Promise<AnalyzerDescription[]> {
    return this.request({ path: "/_api/analyzer" }, res => res.body.result);
  }

  /**
   * Fetches all Analyzers visible in the database and returns an array of
   * {@link Analyzer} instances for those Analyzers.
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
    return analyzers.map(data => this.analyzer(data.name));
  }
  //#endregion

  //#region transactions
  executeTransaction(
    collections:
      | TransactionCollections
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
          ...options
        }
      },
      res => res.body.result
    );
  }

  transaction(transactionId: string): Transaction {
    return new Transaction(this, transactionId);
  }

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
          ...options
        }
      },
      res => new Transaction(this, res.body.result.id)
    );
  }

  listTransactions(): Promise<TransactionDetails[]> {
    return this._connection.request(
      { path: "/_api/transaction" },
      res => res.body.transactions
    );
  }

  async transactions(): Promise<Transaction[]> {
    const transactions = await this.listTransactions();
    return transactions.map(data => this.transaction(data.id));
  }
  //#endregion

  //#region queries
  query(query: AqlQuery, options?: QueryOptions): Promise<ArrayCursor>;
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
          options: opts
        },
        allowDirtyRead,
        timeout
      },
      res => new ArrayCursor(this, res.body, res.arangojsHostId, allowDirtyRead)
    );
  }

  explain(
    query: AqlQuery,
    options?: ExplainOptions
  ): Promise<ExplainResult & ArangoResponseMetadata>;
  explain(
    query: string | AqlLiteral,
    bindVars?: Dict<any>,
    options?: ExplainOptions
  ): Promise<ExplainResult & ArangoResponseMetadata>;
  explain(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: Dict<any>,
    options?: ExplainOptions
  ): Promise<ExplainResult & ArangoResponseMetadata> {
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
        body: { query, bindVars, options }
      },
      res => res.body
    );
  }

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
        body: { query }
      },
      res => res.body
    );
  }

  queryTracking(): Promise<QueryTracking> {
    return this.request(
      {
        method: "GET",
        path: "/_api/query/properties"
      },
      res => res.body
    );
  }

  setQueryTracking(options?: QueryTrackingOptions): Promise<QueryTracking> {
    return this.request(
      {
        method: "PUT",
        path: "/_api/query/properties",
        body: options
      },
      res => res.body
    );
  }

  listRunningQueries(): Promise<QueryInfo[]> {
    return this.request(
      {
        method: "GET",
        path: "/_api/query/current"
      },
      res => res.body
    );
  }

  listSlowQueries(): Promise<QueryInfo[]> {
    return this.request(
      {
        method: "GET",
        path: "/_api/query/slow"
      },
      res => res.body
    );
  }

  clearSlowQueries(): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        path: "/_api/query/slow"
      },
      () => undefined
    );
  }

  killQuery(queryId: string): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        path: `/_api/query/${queryId}`
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
    return this.request({ path: "/_api/aqlfunction" }, res => res.body.result);
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
        body: { name, code, isDeterministic }
      },
      res => res.body
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
        qs: { group }
      },
      res => res.body
    );
  }
  //#endregion

  //#region services
  listServices(excludeSystem: boolean = true): Promise<ServiceSummary[]> {
    return this.request(
      {
        path: "/_api/foxx",
        qs: { excludeSystem }
      },
      res => res.body
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
      source
    });
    return await this.request(
      {
        ...req,
        method: "POST",
        path: "/_api/foxx",
        isBinary: true,
        qs: { ...qs, mount }
      },
      res => res.body
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
      source
    });
    return await this.request(
      {
        ...req,
        method: "PATCH",
        path: "/_api/foxx/service",
        isBinary: true,
        qs: { ...qs, mount }
      },
      res => res.body
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
      source
    });
    return await this.request(
      {
        ...req,
        method: "PUT",
        path: "/_api/foxx/service",
        isBinary: true,
        qs: { ...qs, mount }
      },
      res => res.body
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
        qs: { ...options, mount }
      },
      () => undefined
    );
  }

  getService(mount: string): Promise<ServiceInfo> {
    return this.request(
      {
        path: "/_api/foxx/service",
        qs: { mount }
      },
      res => res.body
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
        qs: { mount, minimal }
      },
      res => res.body
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
        qs: { mount, minimal }
      },
      res => res.body
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
        qs: { mount, minimal }
      },
      res => res.body
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
        qs: { mount, minimal }
      },
      res => res.body
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
        qs: { mount, minimal }
      },
      res => res.body
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
        qs: { mount, minimal }
      },
      res => res.body
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
        qs: { mount }
      },
      res => res.body
    );
  }

  disableServiceDevelopmentMode(mount: string): Promise<ServiceInfo> {
    return this.request(
      {
        method: "DELETE",
        path: "/_api/foxx/development",
        qs: { mount }
      },
      res => res.body
    );
  }

  listServiceScripts(mount: string): Promise<Dict<string>> {
    return this.request(
      {
        path: "/_api/foxx/scripts",
        qs: { mount }
      },
      res => res.body
    );
  }

  runServiceScript(mount: string, name: string, params?: any): Promise<any> {
    return this.request(
      {
        method: "POST",
        path: `/_api/foxx/scripts/${name}`,
        body: params,
        qs: { mount }
      },
      res => res.body
    );
  }

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
    options: {
      reporter: "suite";
      filter?: string;
    }
  ): Promise<ServiceTestSuiteReport>;
  runServiceTests(
    mount: string,
    options?: {
      reporter?: "default";
      filter?: string;
    }
  ): Promise<ServiceTestDefaultReport>;
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
          mount
        }
      },
      res => res.body
    );
  }

  getServiceReadme(mount: string): Promise<string | undefined> {
    return this.request(
      {
        path: "/_api/foxx/readme",
        qs: { mount }
      },
      res => res.body
    );
  }

  getServiceDocumentation(mount: string): Promise<SwaggerJson> {
    return this.request(
      {
        path: "/_api/foxx/swagger",
        qs: { mount }
      },
      res => res.body
    );
  }

  downloadService(mount: string): Promise<Buffer | Blob> {
    return this.request(
      {
        method: "POST",
        path: "/_api/foxx/download",
        qs: { mount },
        expectBinary: true
      },
      res => res.body
    );
  }

  commitLocalServiceState(replace?: boolean): Promise<void> {
    return this.request(
      {
        method: "POST",
        path: "/_api/foxx/commit",
        qs: { replace }
      },
      () => undefined
    );
  }
  //#endregion
}

function coerceTransactionCollections(
  collections:
    | TransactionCollections
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
    cols.allowImplicit = collections.allowImplicit;
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
