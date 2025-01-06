/**
 * ```js
 * import { Database } from "arangojs/databases";
 * ```
 *
 * The "databases" module provides the {@link Database} class and associated
 * types and interfaces for TypeScript.
 *
 * The Database class is also re-exported by the "index" module.
 *
 * @packageDocumentation
 */
import * as administration from "./administration.js";
import * as analyzers from "./analyzers.js";
import * as aql from "./aql.js";
import * as cluster from "./cluster.js";
import * as collections from "./collections.js";
import * as configuration from "./configuration.js";
import * as connection from "./connection.js";
import * as cursors from "./cursors.js";
import * as errors from "./errors.js";
import * as graphs from "./graphs.js";
import * as hotBackups from "./hot-backups.js";
import * as jobs from "./jobs.js";
import { DATABASE_NOT_FOUND } from "./lib/codes.js";
import * as util from "./lib/util.js";
import * as logs from "./logs.js";
import * as queries from "./queries.js";
import * as routes from "./routes.js";
import * as services from "./services.js";
import * as transactions from "./transactions.js";
import * as users from "./users.js";
import * as views from "./views.js";

//#region Database operation options
/**
 * Options for creating a database.
 *
 * See {@link Database#createDatabase}.
 */
export type CreateDatabaseOptions = {
  /**
   * Database users to create with the database.
   */
  users?: users.CreateDatabaseUserOptions[];
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
};
//#endregion

//#region DatabaseDescription
/**
 * Object describing a database.
 *
 * See {@link Database#get}.
 */
export type DatabaseDescription = {
  /**
   * Name of the database.
   */
  name: string;
  /**
   * Unique identifier of the database.
   */
  id: string;
  /**
   * File system path of the database.
   */
  path: string;
  /**
   * Whether the database is the system database.
   */
  isSystem: boolean;
  /**
   * (Cluster only.) The sharding method to use for new collections in the
   * database.
   */
  sharding?: "" | "flexible" | "single";
  /**
   * (Cluster only.) Default replication factor for new collections in this
   * database.
   */
  replicationFactor?: "satellite" | number;
  /**
   * (Cluster only.) Default write concern for new collections created in this
   * database.
   */
  writeConcern?: number;
};
//#endregion

/**
 * @internal
 */
type TrappedError = {
  error: true;
};

/**
 * @internal
 */
type TrappedRequest<T = any> = {
  error?: false;
  jobId: string;
  onResolve: (res: connection.ProcessedResponse<T>) => void;
  onReject: (error: any) => void;
};

//#region Database class
/**
 * Indicates whether the given value represents a {@link Database}.
 *
 * @param database - A value that might be a database.
 */
export function isArangoDatabase(database: any): database is Database {
  return Boolean(database && database.isArangoDatabase);
}

/**
 * An object representing a single ArangoDB database. All arangojs collections,
 * cursors, analyzers and so on are linked to a `Database` object.
 */
export class Database {
  protected _connection: connection.Connection;
  protected _name: string;
  protected _analyzers = new Map<string, analyzers.Analyzer>();
  protected _collections = new Map<string, collections.Collection>();
  protected _graphs = new Map<string, graphs.Graph>();
  protected _views = new Map<string, views.View>();
  protected _trapRequest?: (
    trapped: TrappedError | TrappedRequest<any>
  ) => void;

  /**
   * Creates a new `Database` instance with its own connection pool.
   *
   * See also {@link Database#database}.
   *
   * @param config - An object with configuration options.
   *
   * @example
   * ```js
   * const db = new Database({
   *   url: "http://127.0.0.1:8529",
   *   databaseName: "my_database",
   *   auth: { username: "admin", password: "hunter2" },
   * });
   * ```
   */
  constructor(config?: configuration.ConfigOptions);
  /**
   * Creates a new `Database` instance with its own connection pool.
   *
   * See also {@link Database#database}.
   *
   * @param url - Base URL of the ArangoDB server or list of server URLs.
   * Equivalent to the `url` option in {@link configuration.ConfigOptions}.
   *
   * @example
   * ```js
   * const db = new Database("http://127.0.0.1:8529", "my_database");
   * db.useBasicAuth("admin", "hunter2");
   * ```
   */
  constructor(url: string | string[], name?: string);
  /**
   * @internal
   */
  constructor(database: Database, name?: string);
  constructor(
    configOrDatabase:
      | string
      | string[]
      | configuration.ConfigOptions
      | Database = {},
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
          ? { databaseName: name, url: config }
          : config;
      this._connection = new connection.Connection(options);
      this._name = databaseName || "_system";
    }
  }

  //#region misc
  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB database.
   */
  get isArangoDatabase(): true {
    return true;
  }

  /**
   * Name of the ArangoDB database this instance represents.
   */
  get name() {
    return this._name;
  }

  /**
   * Returns a new {@link routes.Route} instance for the given path (relative to the
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
  route(
    path?: string,
    headers?: Headers | Record<string, string>
  ): routes.Route {
    return new routes.Route(this, path, headers);
  }

  /**
   * @internal
   *
   * Performs an arbitrary HTTP request against the database.
   *
   * @param BodyType - Type of the expected response body.
   * @param ReturnType - Type the response body will be transformed to.
   * @param options - Options for this request.
   * @param transform - An optional function to transform the low-level
   * response object to a more useful return value.
   */
  async request<BodyType = any, ReturnType = BodyType>(
    options: connection.RequestOptions,
    transform?: (res: connection.ProcessedResponse<BodyType>) => ReturnType
  ): Promise<ReturnType>;
  /**
   * @internal
   *
   * Performs an arbitrary HTTP request against the database.
   *
   * @param BodyType - Type of the expected response body.
   * @param options - Options for this request.
   * @param transform - If set to `false`, the raw response object will be
   * returned.
   */
  async request<BodyType = any>(
    options: connection.RequestOptions,
    transform: false
  ): Promise<connection.ProcessedResponse<BodyType>>;
  async request<BodyType = any, ReturnType = BodyType>(
    { pathname, ...opts }: connection.RequestOptions,
    transform:
      | false
      | ((res: connection.ProcessedResponse<BodyType>) => ReturnType) = (res) =>
      res.parsedBody as ReturnType
  ): Promise<ReturnType> {
    pathname = util.joinPath("_db", encodeURIComponent(this._name), pathname);
    if (this._trapRequest) {
      const trap = this._trapRequest;
      this._trapRequest = undefined;
      return new Promise<ReturnType>(async (resolveRequest, rejectRequest) => {
        opts.headers = new Headers(opts.headers);
        opts.headers.set("x-arango-async", "store");
        let jobRes: connection.ProcessedResponse<any>;
        try {
          jobRes = await this._connection.request({ pathname, ...opts });
        } catch (e) {
          trap({ error: true });
          rejectRequest(e);
          return;
        }
        const jobId = jobRes.headers.get("x-arango-async-id")!;
        trap({
          jobId,
          onResolve: (res) => {
            const result = transform ? transform(res) : (res as ReturnType);
            resolveRequest(result);
            return result;
          },
          onReject: (err) => {
            rejectRequest(err);
            throw err;
          },
        });
      });
    }
    return this._connection.request(
      { pathname, ...opts },
      transform || undefined
    );
  }

  /**
   * Updates the URL list by requesting a list of all coordinators in the
   * cluster and adding any endpoints not initially specified in the
   * {@link configuration.ConfigOptions}.
   *
   * For long-running processes communicating with an ArangoDB cluster it is
   * recommended to run this method periodically (e.g. once per hour) to make
   * sure new coordinators are picked up correctly and can be used for
   * fail-over or load balancing.
   *
   * @param overwrite - If set to `true`, the existing host list will be
   * replaced instead of extended.
   *
   * @example
   * ```js
   * const db = new Database();
   * const interval = setInterval(
   *   () => db.acquireHostList(),
   *   5 * 60 * 1000 // every 5 minutes
   * );
   *
   * // later
   * clearInterval(interval);
   * system.close();
   * ```
   */
  async acquireHostList(overwrite = false): Promise<void> {
    const urls: string[] = await this.request(
      { pathname: "/_api/cluster/endpoints" },
      (res) =>
        res.parsedBody.endpoints.map((endpoint: any) => endpoint.endpoint)
    );
    if (urls.length > 0) {
      if (overwrite) this._connection.setHostList(urls);
      else this._connection.addToHostList(urls);
    }
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
   *   system.close();
   * }, 1000 * 60 * 60);
   * ```
   */
  close(): void {
    this._connection.close();
  }

  /**
   * Performs a request against every known coordinator and returns when the
   * request has succeeded against every coordinator or the timeout is reached.
   *
   * **Note**: This method is primarily intended to make database setup easier
   * in cluster scenarios and requires all coordinators to be known to arangojs
   * before the method is invoked. The method is not useful in single-server or
   * leader-follower replication scenarios.
   *
   * @example
   * ```js
   * const db = new Database({ loadBalancingStrategy: "ROUND_ROBIN" });
   * await system.acquireHostList();
   * const analyzer = db.analyzer("my-analyzer");
   * await analyzer.create();
   * await db.waitForPropagation(
   *   { pathname: `/_api/analyzer/${encodeURIComponent(analyzer.name)}` },
   *   30000
   * );
   * // Analyzer has been propagated to all coordinators and can safely be used
   * ```
   *
   * @param request - Request to perform against each known coordinator.
   * @param timeout - Maximum number of milliseconds to wait for propagation.
   */
  async waitForPropagation(
    request: connection.RequestOptions,
    timeout?: number
  ): Promise<void>;
  async waitForPropagation(
    { pathname, ...request }: connection.RequestOptions,
    timeout?: number
  ): Promise<void> {
    await this._connection.waitForPropagation(
      {
        ...request,
        pathname: util.joinPath(
          "_db",
          encodeURIComponent(this._name),
          pathname
        ),
      },
      timeout
    );
  }

  /**
   * Methods for accessing the server-reported queue times of the mostly
   * recently received responses.
   */
  get queueTime(): administration.QueueTimeMetrics {
    return this._connection.queueTime;
  }

  /**
   * Sets the limit for the number of values of the most recently received
   * server-reported queue times that can be accessed using
   * {@link Database#queueTime}.
   *
   * @param responseQueueTimeSamples - Number of values to maintain.
   */
  setResponseQueueTimeSamples(responseQueueTimeSamples: number) {
    this._connection.setResponseQueueTimeSamples(responseQueueTimeSamples);
  }
  //#endregion

  //#region auth
  /**
   * Updates the underlying connection's `authorization` header to use Basic
   * authentication with the given `username` and `password`, then returns
   * itself.
   *
   * @param username - The username to authenticate with.
   * @param password - The password to authenticate with.
   *
   * @example
   * ```js
   * const db = new Database();
   * db.useBasicAuth("admin", "hunter2");
   * // with the username "admin" and password "hunter2".
   * ```
   */
  useBasicAuth(username: string = "root", password: string = ""): this {
    this._connection.setBasicAuth({ username, password });
    return this;
  }

  /**
   * Updates the underlying connection's `authorization` header to use Bearer
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
    this._connection.setBearerAuth({ token });
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
   * await db.login("admin", "hunter2");
   * // with an authentication token for the "admin" user.
   * ```
   */
  login(username: string = "root", password: string = ""): Promise<string> {
    return this.request(
      {
        method: "POST",
        pathname: "/_open/auth",
        body: { username, password },
      },
      (res) => {
        this.useBearerAuth(res.parsedBody.jwt);
        return res.parsedBody.jwt;
      }
    );
  }

  /**
   * Attempts to renew the authentication token passed to {@link Database#useBearerAuth}
   * or returned and used by {@link Database#login}. If a new authentication
   * token is issued, it will be used for future requests and returned.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.login("admin", "hunter2");
   * // ... later ...
   * const newToken = await db.renewAuthToken();
   * if (!newToken) // no new token issued
   * ```
   */
  renewAuthToken(): Promise<string | null> {
    return this.request(
      {
        method: "POST",
        pathname: "/_open/auth/renew",
      },
      (res) => {
        if (!res.parsedBody.jwt) return null;
        this.useBearerAuth(res.parsedBody.jwt);
        return res.parsedBody.jwt;
      }
    );
  }
  //#endregion

  //#region administration
  /**
   * Fetches version information from the ArangoDB server.
   *
   * @param details - If set to `true`, additional information about the
   * ArangoDB server will be available as the `details` property.
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
  version(details?: boolean): Promise<administration.VersionInfo> {
    return this.request({
      method: "GET",
      pathname: "/_api/version",
      search: { details },
    });
  }

  /**
   * Fetches storage engine information from the ArangoDB server.
   *
   * @example
   * ```js
   * const db = new Database();
   * const engine = await db.engine();
   * // the engine object contains the storage engine information, e.g.
   * // name: name of the storage engine
   * ```
   */
  engine(): Promise<administration.EngineInfo> {
    return this.request({
      method: "GET",
      pathname: "/_api/engine",
    });
  }

  /**
   * Fetches detailed storage engine performance and resource usage information
   * from the ArangoDB server.
   *
   * @example
   * ```js
   * const db = new Database();
   * const stats = await db.engineStats();
   * // the stats object contains the storage engine stats
   * ```
   */
  engineStats(): Promise<administration.EngineStatsInfo> {
    return this.request({
      method: "GET",
      pathname: "/_api/engine/stats",
    });
  }

  /**
   * Retrives the server's current system time in milliseconds with microsecond
   * precision.
   */
  time(): Promise<number> {
    return this.request(
      {
        method: "GET",
        pathname: "/_admin/time",
      },
      (res) => res.parsedBody.time * 1000
    );
  }

  /**
   * Fetches information about the server status.
   *
   * @example
   * ```js
   * const status = await db.status();
   * // the status object contains the ArangoDB status information, e.g.
   * // version: ArangoDB version number
   * // host: host identifier of the server
   * // serverInfo: detailed information about the server
   * ```
   */
  status(): Promise<administration.ServerStatusInfo> {
    return this.request({
      method: "GET",
      pathname: "/_admin/status",
    });
  }

  /**
   * Fetches availability information about the server.
   *
   * @param graceful - If set to `true`, the method will always return `false`
   * instead of throwing an error; otherwise `false` will only be returned
   * when the server responds with a 503 status code or an ArangoDB error with
   * a code of 503, such as during shutdown.
   *
   * @example
   * ```js
   * const availability = await db.availability();
   * // availability is either "default", "readonly", or false
   * ```
   */
  async availability(
    graceful = false
  ): Promise<administration.ServerAvailability> {
    try {
      return this.request(
        {
          method: "GET",
          pathname: "/_admin/server/availability",
        },
        (res) => res.parsedBody.mode
      );
    } catch (e) {
      if (graceful) return false;
      if (
        (errors.isArangoError(e) || e instanceof errors.HttpError) &&
        e.code === 503
      ) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Fetches deployment information about the server for support purposes.
   *
   * Note that this API may reveal sensitive data about the deployment.
   */
  supportInfo(): Promise<
    administration.SingleServerSupportInfo | administration.ClusterSupportInfo
  > {
    return this.request({
      method: "GET",
      pathname: "/_admin/support-info",
    });
  }

  /**
   * Fetches the license information and status of an Enterprise Edition server.
   */
  getLicense(): Promise<administration.LicenseInfo> {
    return this.request({
      method: "GET",
      pathname: "/_admin/license",
    });
  }

  /**
   * Set a new license for an Enterprise Edition server.
   *
   * @param license - The license as a base 64 encoded string.
   * @param force - If set to `true`, the license will be changed even if it
   * expires sooner than the current license.
   */
  setLicense(license: string, force = false): Promise<void> {
    return this.request(
      {
        method: "PUT",
        pathname: "/_admin/license",
        body: license,
        search: { force },
      },
      () => undefined
    );
  }

  /**
   * Compacts all databases on the server.
   *
   * @param options - Options for compacting the databases.
   */
  compact(options: administration.CompactOptions = {}): Promise<void> {
    return this.request(
      {
        method: "PUT",
        pathname: "/_admin/compact",
        body: options,
      },
      () => undefined
    );
  }

  /**
   * Attempts to initiate a clean shutdown of the server.
   */
  shutdown(): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        pathname: "/_admin/shutdown",
      },
      () => undefined
    );
  }
  //#endregion

  //#region rebalancing
  /**
   * Computes the current cluster imbalance.
   *
   * @example
   * ```js
   * const db = new Database();
   * const imbalance = await db.getClusterImbalance();
   * ```
   */
  getClusterImbalance(): Promise<cluster.ClusterRebalanceState> {
    return this.request(
      { pathname: "/_admin/cluster/rebalance" },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Computes a set of move shard operations to rebalance the cluster.
   *
   * @example
   * ```js
   * const db = new Database();
   * const result = await db.computerClusterRebalance({
   *   moveLeaders: true,
   *   moveFollowers: true
   * });
   * if (result.moves.length) {
   *   await db.executeClusterRebalance(result.moves);
   * }
   * ```
   */
  computeClusterRebalance(
    options: cluster.ClusterRebalanceOptions
  ): Promise<cluster.ClusterRebalanceResult> {
    return this.request(
      {
        method: "POST",
        pathname: "/_admin/cluster/rebalance",
        body: {
          version: 1,
          ...options,
        },
      },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Executes the given cluster move shard operations.
   *
   * @example
   * ```js
   * const db = new Database();
   * const result = await db.computerClusterRebalance({
   *   moveLeaders: true,
   *   moveFollowers: true
   * });
   * if (result.moves.length) {
   *   await db.executeClusterRebalance(result.moves);
   * }
   * ```
   */
  executeClusterRebalance(
    moves: cluster.ClusterRebalanceMove[]
  ): Promise<unknown> {
    return this.request({
      method: "POST",
      pathname: "/_admin/cluster/rebalance/execute",
      body: {
        version: 1,
        moves,
      },
    });
  }

  /**
   * Computes a set of move shard operations to rebalance the cluster and
   * executes them.
   *
   * @param options - Options for rebalancing the cluster.
   *
   * @example
   * ```js
   * const db = new Database();
   * const result = await db.rebalanceCluster({
   *   moveLeaders: true,
   *   moveFollowers: true
   * });
   * // The cluster is now rebalanced.
   * ```
   */
  rebalanceCluster(
    options: cluster.ClusterRebalanceOptions
  ): Promise<cluster.ClusterRebalanceResult> {
    return this.request({
      method: "PUT",
      pathname: "/_admin/cluster/rebalance",
      body: {
        version: 1,
        ...options,
      },
    });
  }
  //#endregion

  //#region databases
  /**
   * Creates a new `Database` instance for the given `databaseName` that
   * shares this database's connection pool.
   *
   * See also {@link Database:constructor}.
   *
   * @param databaseName - Name of the database.
   *
   * @example
   * ```js
   * const systemDb = new Database();
   * const myDb = systemDb.database("my_database");
   * ```
   */
  database(databaseName: string) {
    return new Database(this, databaseName);
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
  get(): Promise<DatabaseDescription> {
    return this.request(
      { pathname: "/_api/database/current" },
      (res) => res.parsedBody.result
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
    } catch (err: any) {
      if (errors.isArangoError(err) && err.errorNum === DATABASE_NOT_FOUND) {
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
   * ```
   */
  createDatabase(
    databaseName: string,
    users: users.CreateDatabaseUserOptions[]
  ): Promise<Database>;
  createDatabase(
    databaseName: string,
    usersOrOptions:
      | users.CreateDatabaseUserOptions[]
      | CreateDatabaseOptions = {}
  ): Promise<Database> {
    const { users, ...options } = Array.isArray(usersOrOptions)
      ? { users: usersOrOptions }
      : usersOrOptions;
    return this.request(
      {
        method: "POST",
        pathname: "/_api/database",
        body: { name: databaseName, users, options },
      },
      () => this.database(databaseName)
    );
  }

  /**
   * Fetches all databases from the server and returns an array of their names.
   *
   * See also {@link Database#databases} and
   * {@link Database#listUserDatabases}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const names = await db.listDatabases();
   * // databases is an array of database names
   * ```
   */
  listDatabases(): Promise<string[]> {
    return this.request(
      { pathname: "/_api/database" },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Fetches all databases accessible to the active user from the server and
   * returns an array of their names.
   *
   * See also {@link Database#userDatabases} and
   * {@link Database#listDatabases}.
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
      { pathname: "/_api/database/user" },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Fetches all databases from the server and returns an array of `Database`
   * instances for those databases.
   *
   * See also {@link Database#listDatabases} and
   * {@link Database#userDatabases}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const names = await db.databases();
   * // databases is an array of databases
   * ```
   */
  databases(): Promise<Database[]> {
    return this.request({ pathname: "/_api/database" }, (res) =>
      (res.parsedBody.result as string[]).map((databaseName) =>
        this.database(databaseName)
      )
    );
  }

  /**
   * Fetches all databases accessible to the active user from the server and
   * returns an array of `Database` instances for those databases.
   *
   * See also {@link Database#listUserDatabases} and
   * {@link Database#databases}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const names = await db.userDatabases();
   * // databases is an array of databases
   * ```
   */
  userDatabases(): Promise<Database[]> {
    return this.request({ pathname: "/_api/database/user" }, (res) =>
      (res.parsedBody.result as string[]).map((databaseName) =>
        this.database(databaseName)
      )
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
        pathname: `/_api/database/${encodeURIComponent(databaseName)}`,
      },
      (res) => res.parsedBody.result
    );
  }
  //#endregion

  //#region collections
  /**
   * Returns a `Collection` instance for the given collection name.
   *
   * In TypeScript the collection implements both the
   * {@link collections.DocumentCollection} and {@link collections.EdgeCollection}
   * interfaces and can be cast to either type to enforce a stricter API.
   *
   * @param EntryResultType - Type to represent document contents returned by
   * the server (including computed properties).
   * @param EntryInputType - Type to represent document contents passed when
   * inserting or replacing documents (without computed properties).
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
  collection<
    EntryResultType extends Record<string, any> = any,
    EntryInputType extends Record<string, any> = EntryResultType,
  >(
    collectionName: string
  ): collections.DocumentCollection<EntryResultType, EntryInputType> &
    collections.EdgeCollection<EntryResultType, EntryInputType> {
    collectionName = collectionName;
    if (!this._collections.has(collectionName)) {
      this._collections.set(
        collectionName,
        new collections.Collection(this, collectionName)
      );
    }
    return this._collections.get(collectionName)!;
  }

  /**
   * Creates a new collection with the given `collectionName` and `options`,
   * then returns a {@link collections.DocumentCollection} instance for the new collection.
   *
   * @param EntryResultType - Type to represent document contents returned by
   * the server (including computed properties).
   * @param EntryInputType - Type to represent document contents passed when
   * inserting or replacing documents (without computed properties).
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
  async createCollection<
    EntryResultType extends Record<string, any> = any,
    EntryInputType extends Record<string, any> = EntryResultType,
  >(
    collectionName: string,
    options?: collections.CreateCollectionOptions & {
      type?: collections.CollectionType.DOCUMENT_COLLECTION;
    }
  ): Promise<collections.DocumentCollection<EntryResultType, EntryInputType>>;
  /**
   * Creates a new edge collection with the given `collectionName` and
   * `options`, then returns an {@link collections.EdgeCollection} instance for the new
   * edge collection.
   *
   * @param EntryResultType - Type to represent edge document contents returned
   * by the server (including computed properties).
   * @param EntryInputType - Type to represent edge document contents passed
   * when inserting or replacing documents (without computed properties).
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
  async createCollection<
    EntryResultType extends Record<string, any> = any,
    EntryInputType extends Record<string, any> = EntryResultType,
  >(
    collectionName: string,
    options: collections.CreateCollectionOptions & {
      type: collections.CollectionType.EDGE_COLLECTION;
    }
  ): Promise<collections.EdgeCollection<EntryResultType, EntryInputType>>;
  async createCollection<
    EntryResultType extends Record<string, any> = any,
    EntryInputType extends Record<string, any> = EntryResultType,
  >(
    collectionName: string,
    options?: collections.CreateCollectionOptions & {
      type?: collections.CollectionType;
    }
  ): Promise<
    collections.DocumentCollection<EntryResultType, EntryInputType> &
      collections.EdgeCollection<EntryResultType, EntryInputType>
  > {
    const collection = this.collection(collectionName);
    await collection.create(options);
    return collection;
  }

  /**
   * Creates a new edge collection with the given `collectionName` and
   * `options`, then returns an {@link collections.EdgeCollection} instance for the new
   * edge collection.
   *
   * This is a convenience method for calling {@link Database#createCollection}
   * with `options.type` set to `EDGE_COLLECTION`.
   *
   * @param EntryResultType - Type to represent edge document contents returned
   * by the server (including computed properties).
   * @param EntryInputType - Type to represent edge document contents passed
   * when inserting or replacing documents (without computed properties).
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
  async createEdgeCollection<
    EntryResultType extends Record<string, any> = any,
    EntryInputType extends Record<string, any> = EntryResultType,
  >(
    collectionName: string,
    options?: collections.CreateCollectionOptions
  ): Promise<collections.EdgeCollection<EntryResultType, EntryInputType>> {
    return this.createCollection(collectionName, {
      ...options,
      type: collections.CollectionType.EDGE_COLLECTION,
    });
  }

  /**
   * Renames the collection `collectionName` to `newName`.
   *
   * Additionally removes any stored `Collection` instance for
   * `collectionName` from the `Database` instance's internal cache.
   *
   * **Note**: Renaming collections may not be supported when ArangoDB is
   * running in a cluster configuration.
   *
   * @param collectionName - Current name of the collection.
   * @param newName - The new name of the collection.
   */
  async renameCollection(
    collectionName: string,
    newName: string
  ): Promise<connection.ArangoApiResponse<collections.CollectionDescription>> {
    const result = await this.request({
      method: "PUT",
      pathname: `/_api/collection/${encodeURIComponent(collectionName)}/rename`,
      body: { name: newName },
    });
    this._collections.delete(collectionName);
    return result;
  }

  /**
   * Fetches all collections from the database and returns an array of
   * collection descriptions.
   *
   * See also {@link Database#collections}.
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
  ): Promise<collections.CollectionDescription[]> {
    return this.request(
      {
        pathname: "/_api/collection",
        search: { excludeSystem },
      },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Fetches all collections from the database and returns an array of
   * `Collection` instances.
   *
   * In TypeScript these instances implement both the
   * {@link collections.DocumentCollection} and {@link collections.EdgeCollection}
   * interfaces and can be cast to either type to enforce a stricter API.
   *
   * See also {@link Database#listCollections}.
   *
   * @param excludeSystem - Whether system collections should be excluded.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collections = await db.collections();
   * // collections is an array of DocumentCollection and EdgeCollection
   * // instances not including system collections
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collections = await db.collections(false);
   * // collections is an array of DocumentCollection and EdgeCollection
   * // instances including system collections
   * ```
   */
  async collections(
    excludeSystem: boolean = true
  ): Promise<
    Array<collections.DocumentCollection & collections.EdgeCollection>
  > {
    const collections = await this.listCollections(excludeSystem);
    return collections.map((data) => this.collection(data.name));
  }
  //#endregion

  //#region graphs
  /**
   * Returns a {@link graphs.Graph} instance representing the graph with the given
   * `graphName`.
   *
   * @param graphName - Name of the graph.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graph = db.graph("some-graph");
   * ```
   */
  graph(graphName: string): graphs.Graph {
    if (!this._graphs.has(graphName)) {
      this._graphs.set(graphName, new graphs.Graph(this, graphName));
    }
    return this._graphs.get(graphName)!;
  }

  /**
   * Creates a graph with the given `graphName` and `edgeDefinitions`, then
   * returns a {@link graphs.Graph} instance for the new graph.
   *
   * @param graphName - Name of the graph to be created.
   * @param edgeDefinitions - An array of edge definitions.
   * @param options - An object defining the properties of the graph.
   */
  async createGraph(
    graphName: string,
    edgeDefinitions: graphs.EdgeDefinitionOptions[],
    options?: graphs.CreateGraphOptions
  ): Promise<graphs.Graph> {
    const graph = this.graph(graphName);
    await graph.create(edgeDefinitions, options);
    return graph;
  }

  /**
   * Fetches all graphs from the database and returns an array of graph
   * descriptions.
   *
   * See also {@link Database#graphs}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graphs = await db.listGraphs();
   * // graphs is an array of graph descriptions
   * ```
   */
  listGraphs(): Promise<graphs.GraphDescription[]> {
    return this.request(
      { pathname: "/_api/gharial" },
      (res) => res.parsedBody.graphs
    );
  }

  /**
   * Fetches all graphs from the database and returns an array of {@link graphs.Graph}
   * instances for those graphs.
   *
   * See also {@link Database#listGraphs}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graphs = await db.graphs();
   * // graphs is an array of Graph instances
   * ```
   */
  async graphs(): Promise<graphs.Graph[]> {
    const graphs = await this.listGraphs();
    return graphs.map((data: any) => this.graph(data._key));
  }
  //#endregion

  //#region views
  /**
   * Returns a {@link views.View} instance for the given `viewName`.
   *
   * @param viewName - Name of the ArangoSearch or SearchAlias View.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = db.view("potatoes");
   * ```
   */
  view(viewName: string): views.View {
    if (!this._views.has(viewName)) {
      this._views.set(viewName, new views.View(this, viewName));
    }
    return this._views.get(viewName)!;
  }

  /**
   * Creates a new View with the given `viewName` and `options`, then returns a
   * {@link views.View} instance for the new View.
   *
   * @param viewName - Name of the View.
   * @param options - An object defining the properties of the View.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = await db.createView("potatoes", { type: "arangosearch" });
   * // the ArangoSearch View "potatoes" now exists
   * ```
   */
  async createView(
    viewName: string,
    options: views.CreateViewOptions
  ): Promise<views.View> {
    const view = this.view(viewName);
    await view.create(options);
    return view;
  }

  /**
   * Renames the view `viewName` to `newName`.
   *
   * Additionally removes any stored {@link views.View} instance for `viewName` from
   * the `Database` instance's internal cache.
   *
   * **Note**: Renaming views may not be supported when ArangoDB is running in
   * a cluster configuration.
   *
   * @param viewName - Current name of the view.
   * @param newName - The new name of the view.
   */
  async renameView(
    viewName: string,
    newName: string
  ): Promise<connection.ArangoApiResponse<views.ViewDescription>> {
    const result = await this.request({
      method: "PUT",
      pathname: `/_api/view/${encodeURIComponent(viewName)}/rename`,
      body: { name: newName },
    });
    this._views.delete(viewName);
    return result;
  }

  /**
   * Fetches all Views from the database and returns an array of View
   * descriptions.
   *
   * See also {@link Database#views}.
   *
   * @example
   * ```js
   * const db = new Database();
   *
   * const views = await db.listViews();
   * // views is an array of View descriptions
   * ```
   */
  listViews(): Promise<views.ViewDescription[]> {
    return this.request(
      { pathname: "/_api/view" },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Fetches all Views from the database and returns an array of
   * {@link views.View} instances
   * for the Views.
   *
   * See also {@link Database#listViews}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const views = await db.views();
   * // views is an array of ArangoSearch View instances
   * ```
   */
  async views(): Promise<views.View[]> {
    const views = await this.listViews();
    return views.map((data) => this.view(data.name));
  }
  //#endregion

  //#region analyzers
  /**
   * Returns an {@link analyzers.Analyzer} instance representing the Analyzer with the
   * given `analyzerName`.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzer = db.analyzer("some-analyzer");
   * const info = await analyzer.get();
   * ```
   */
  analyzer(analyzerName: string): analyzers.Analyzer {
    if (!this._analyzers.has(analyzerName)) {
      this._analyzers.set(
        analyzerName,
        new analyzers.Analyzer(this, analyzerName)
      );
    }
    return this._analyzers.get(analyzerName)!;
  }

  /**
   * Creates a new Analyzer with the given `analyzerName` and `options`, then
   * returns an {@link analyzers.Analyzer} instance for the new Analyzer.
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
    options: analyzers.CreateAnalyzerOptions
  ): Promise<analyzers.Analyzer> {
    const analyzer = this.analyzer(analyzerName);
    await analyzer.create(options);
    return analyzer;
  }

  /**
   * Fetches all Analyzers visible in the database and returns an array of
   * Analyzer descriptions.
   *
   * See also {@link Database#analyzers}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzers = await db.listAnalyzers();
   * // analyzers is an array of Analyzer descriptions
   * ```
   */
  listAnalyzers(): Promise<analyzers.AnalyzerDescription[]> {
    return this.request(
      { pathname: "/_api/analyzer" },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Fetches all Analyzers visible in the database and returns an array of
   * {@link analyzers.Analyzer} instances for those Analyzers.
   *
   * See also {@link Database#listAnalyzers}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const analyzers = await db.analyzers();
   * // analyzers is an array of Analyzer instances
   * ```
   */
  async analyzers(): Promise<analyzers.Analyzer[]> {
    const analyzers = await this.listAnalyzers();
    return analyzers.map((data) => this.analyzer(data.name));
  }
  //#endregion

  //#region users
  /**
   * Fetches all ArangoDB users visible to the authenticated user and returns
   * an array of user objects.
   *
   * @example
   * ```js
   * const db = new Database();
   * const users = await db.listUsers();
   * // users is an array of user objects
   * ```
   */
  listUsers(): Promise<users.ArangoUser[]> {
    return this.request(
      {
        pathname: "/_api/user",
      },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Fetches the user data of a single ArangoDB user.
   *
   * @param username - Name of the ArangoDB user to fetch.
   *
   * @example
   * ```js
   * const db = new Database();
   * const user = await db.getUser("steve");
   * // user is the user object for the user named "steve"
   * ```
   */
  getUser(
    username: string
  ): Promise<connection.ArangoApiResponse<users.ArangoUser>> {
    return this.request({
      pathname: `/_api/user/${encodeURIComponent(username)}`,
    });
  }

  /**
   * Creates a new ArangoDB user with the given password.
   *
   * @param username - Name of the ArangoDB user to create.
   * @param passwd - Password of the new ArangoDB user.
   *
   * @example
   * ```js
   * const db = new Database();
   * const user = await db.createUser("steve", "hunter2");
   * // The user "steve" has been created
   * ```
   */
  createUser(
    username: string,
    passwd: string
  ): Promise<connection.ArangoApiResponse<users.ArangoUser>>;
  /**
   * Creates a new ArangoDB user with the given options.
   *
   * @param username - Name of the ArangoDB user to create.
   * @param options - Additional options for creating the ArangoDB user.
   *
   * @example
   * ```js
   * const db = new Database();
   * const user = await db.createUser("steve", { passwd: "hunter2" });
   * // The user "steve" has been created
   * ```
   */
  createUser(
    username: string,
    options: users.UserOptions
  ): Promise<connection.ArangoApiResponse<users.ArangoUser>>;
  createUser(
    username: string,
    options: string | users.UserOptions
  ): Promise<connection.ArangoApiResponse<users.ArangoUser>> {
    if (typeof options === "string") {
      options = { passwd: options };
    }
    return this.request(
      {
        method: "POST",
        pathname: "/_api/user",
        body: { user: username, ...options },
      },
      (res) => res.parsedBody
    );
  }

  /**
   * Sets the password of a given ArangoDB user to the new value.
   *
   * @param username - Name of the ArangoDB user to change the password for.
   * @param passwd - New password for the ArangoDB user.
   *
   * @example
   * ```js
   * const db = new Database();
   * const user = await db.updateUser("steve", "hunter2");
   * // The user "steve" has received a new password
   * ```
   */
  updateUser(
    username: string,
    passwd: string
  ): Promise<connection.ArangoApiResponse<users.ArangoUser>>;
  /**
   * Updates the ArangoDB user with the new options.
   *
   * @param username - Name of the ArangoDB user to modify.
   * @param options - Options of the ArangoDB user to modify.
   *
   * @example
   * ```js
   * const db = new Database();
   * const user = await db.updateUser("steve", { active: false });
   * // The user "steve" has been set to inactive
   * ```
   */
  updateUser(
    username: string,
    options: Partial<users.UserOptions>
  ): Promise<connection.ArangoApiResponse<users.ArangoUser>>;
  updateUser(
    username: string,
    options: string | Partial<users.UserOptions>
  ): Promise<connection.ArangoApiResponse<users.ArangoUser>> {
    if (typeof options === "string") {
      options = { passwd: options };
    }
    return this.request(
      {
        method: "PATCH",
        pathname: `/_api/user/${encodeURIComponent(username)}`,
        body: options,
      },
      (res) => res.parsedBody
    );
  }

  /**
   * Replaces the ArangoDB user's option with the new options.
   *
   * @param username - Name of the ArangoDB user to modify.
   * @param options - New options to replace the user's existing options.
   *
   * @example
   * ```js
   * const db = new Database();
   * const user = await db.replaceUser("steve", { passwd: "", active: false });
   * // The user "steve" has been set to inactive with an empty password
   * ```
   */
  replaceUser(
    username: string,
    options: users.UserOptions
  ): Promise<connection.ArangoApiResponse<users.ArangoUser>> {
    if (typeof options === "string") {
      options = { passwd: options };
    }
    return this.request(
      {
        method: "PUT",
        pathname: `/_api/user/${encodeURIComponent(username)}`,
        body: options,
      },
      (res) => res.parsedBody
    );
  }

  /**
   * Removes the ArangoDB user with the given username from the server.
   *
   * @param username - Name of the ArangoDB user to remove.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.removeUser("steve");
   * // The user "steve" has been removed
   * ```
   */
  removeUser(username: string): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        pathname: `/_api/user/${encodeURIComponent(username)}`,
      },
      () => undefined
    );
  }

  /**
   * Fetches the given ArangoDB user's access level for the database, or the
   * given collection in the given database.
   *
   * @param username - Name of the ArangoDB user to fetch the access level for.
   * @param database - Database to fetch the access level for.
   * @param collection - Collection to fetch the access level for.
   *
   * @example
   * ```js
   * const db = new Database();
   * const accessLevel = await db.getUserAccessLevel("steve");
   * // The access level of the user "steve" has been fetched for the current
   * // database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const accessLevel = await db.getUserAccessLevel("steve", {
   *   database: "staging"
   * });
   * // The access level of the user "steve" has been fetched for the "staging"
   * // database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const accessLevel = await db.getUserAccessLevel("steve", {
   *   collection: "pokemons"
   * });
   * // The access level of the user "steve" has been fetched for the
   * // "pokemons" collection in the current database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const accessLevel = await db.getUserAccessLevel("steve", {
   *   database: "staging",
   *   collection: "pokemons"
   * });
   * // The access level of the user "steve" has been fetched for the
   * // "pokemons" collection in the "staging" database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const staging = db.database("staging");
   * const accessLevel = await db.getUserAccessLevel("steve", {
   *   database: staging
   * });
   * // The access level of the user "steve" has been fetched for the "staging"
   * // database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const staging = db.database("staging");
   * const accessLevel = await db.getUserAccessLevel("steve", {
   *   collection: staging.collection("pokemons")
   * });
   * // The access level of the user "steve" has been fetched for the
   * // "pokemons" collection in database "staging".
   * ```
   */
  getUserAccessLevel(
    username: string,
    { database, collection }: users.UserAccessLevelOptions
  ): Promise<users.AccessLevel> {
    const databaseName = isArangoDatabase(database)
      ? database.name
      : (database ??
        (collection instanceof collections.Collection
          ? collection.database.name
          : this._name));
    const suffix = collection
      ? `/${encodeURIComponent(
          collections.isArangoCollection(collection)
            ? collection.name
            : collection
        )}`
      : "";
    return this.request(
      {
        pathname: `/_api/user/${encodeURIComponent(
          username
        )}/database/${encodeURIComponent(databaseName)}${suffix}`,
      },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Sets the given ArangoDB user's access level for the database, or the
   * given collection in the given database.
   *
   * @param username - Name of the ArangoDB user to set the access level for.
   * @param database - Database to set the access level for.
   * @param collection - Collection to set the access level for.
   * @param grant - Access level to set for the given user.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.setUserAccessLevel("steve", { grant: "rw" });
   * // The user "steve" now has read-write access to the current database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.setUserAccessLevel("steve", {
   *   database: "staging",
   *   grant: "rw"
   * });
   * // The user "steve" now has read-write access to the "staging" database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.setUserAccessLevel("steve", {
   *   collection: "pokemons",
   *   grant: "rw"
   * });
   * // The user "steve" now has read-write access to the "pokemons" collection
   * // in the current database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.setUserAccessLevel("steve", {
   *   database: "staging",
   *   collection: "pokemons",
   *   grant: "rw"
   * });
   * // The user "steve" now has read-write access to the "pokemons" collection
   * // in the "staging" database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const staging = db.database("staging");
   * await db.setUserAccessLevel("steve", {
   *   database: staging,
   *   grant: "rw"
   * });
   * // The user "steve" now has read-write access to the "staging" database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const staging = db.database("staging");
   * await db.setUserAccessLevel("steve", {
   *   collection: staging.collection("pokemons"),
   *   grant: "rw"
   * });
   * // The user "steve" now has read-write access to the "pokemons" collection
   * // in database "staging".
   * ```
   */
  setUserAccessLevel(
    username: string,
    {
      database,
      collection,
      grant,
    }: users.UserAccessLevelOptions & { grant: users.AccessLevel }
  ): Promise<connection.ArangoApiResponse<Record<string, users.AccessLevel>>> {
    const databaseName = isArangoDatabase(database)
      ? database.name
      : (database ??
        (collection instanceof collections.Collection
          ? collection.database.name
          : this._name));
    const suffix = collection
      ? `/${encodeURIComponent(
          collections.isArangoCollection(collection)
            ? collection.name
            : collection
        )}`
      : "";
    return this.request(
      {
        method: "PUT",
        pathname: `/_api/user/${encodeURIComponent(
          username
        )}/database/${encodeURIComponent(databaseName)}${suffix}`,
        body: { grant },
      },
      (res) => res.parsedBody
    );
  }

  /**
   * Clears the given ArangoDB user's access level for the database, or the
   * given collection in the given database.
   *
   * @param username - Name of the ArangoDB user to clear the access level for.
   * @param database - Database to clear the access level for.
   * @param collection - Collection to clear the access level for.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.clearUserAccessLevel("steve");
   * // The access level of the user "steve" has been cleared for the current
   * // database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.clearUserAccessLevel("steve", { database: "staging" });
   * // The access level of the user "steve" has been cleared for the "staging"
   * // database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.clearUserAccessLevel("steve", { collection: "pokemons" });
   * // The access level of the user "steve" has been cleared for the
   * // "pokemons" collection in the current database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.clearUserAccessLevel("steve", {
   *   database: "staging",
   *   collection: "pokemons"
   * });
   * // The access level of the user "steve" has been cleared for the
   * // "pokemons" collection in the "staging" database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const staging = db.database("staging");
   * await db.clearUserAccessLevel("steve", { database: staging });
   * // The access level of the user "steve" has been cleared for the "staging"
   * // database.
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const staging = db.database("staging");
   * await db.clearUserAccessLevel("steve", {
   *   collection: staging.collection("pokemons")
   * });
   * // The access level of the user "steve" has been cleared for the
   * // "pokemons" collection in database "staging".
   * ```
   */
  clearUserAccessLevel(
    username: string,
    { database, collection }: users.UserAccessLevelOptions
  ): Promise<connection.ArangoApiResponse<Record<string, users.AccessLevel>>> {
    const databaseName = isArangoDatabase(database)
      ? database.name
      : (database ??
        (collection instanceof collections.Collection
          ? collection.database.name
          : this._name));
    const suffix = collection
      ? `/${encodeURIComponent(
          collections.isArangoCollection(collection)
            ? collection.name
            : collection
        )}`
      : "";
    return this.request(
      {
        method: "DELETE",
        pathname: `/_api/user/${encodeURIComponent(
          username
        )}/database/${encodeURIComponent(databaseName)}${suffix}`,
      },
      (res) => res.parsedBody
    );
  }

  /**
   * Fetches an object mapping names of databases to the access level of the
   * given ArangoDB user for those databases.
   *
   * @param username - Name of the ArangoDB user to fetch the access levels for.
   * @param full - Whether access levels for collections should be included.
   *
   * @example
   * ```js
   * const db = new Database();
   * const accessLevels = await db.getUserDatabases("steve");
   * for (const [databaseName, accessLevel] of Object.entries(accessLevels)) {
   *   console.log(`${databaseName}: ${accessLevel}`);
   * }
   * ```
   */
  getUserDatabases(
    username: string,
    full?: false
  ): Promise<Record<string, users.AccessLevel>>;
  /**
   * Fetches an object mapping names of databases to the access level of the
   * given ArangoDB user for those databases and the collections within each
   * database.
   *
   * @param username - Name of the ArangoDB user to fetch the access levels for.
   * @param full - Whether access levels for collections should be included.
   *
   * @example
   * ```js
   * const db = new Database();
   * const accessLevels = await db.getUserDatabases("steve", true);
   * for (const [databaseName, obj] of Object.entries(accessLevels)) {
   *   console.log(`${databaseName}: ${obj.permission}`);
   *   for (const [collectionName, accessLevel] of Object.entries(obj.collections)) {
   *     console.log(`${databaseName}/${collectionName}: ${accessLevel}`);
   *   }
   * }
   * ```
   */
  getUserDatabases(
    username: string,
    full: true
  ): Promise<
    Record<
      string,
      {
        permission: users.AccessLevel;
        collections: Record<string, users.AccessLevel | "undefined">;
      }
    >
  >;
  getUserDatabases(username: string, full?: boolean) {
    return this.request(
      {
        pathname: `/_api/user/${encodeURIComponent(username)}/database`,
        search: { full },
      },
      (res) => res.parsedBody.result
    );
  }
  //#endregion

  //#region transactions
  /**
   * Performs a server-side JavaScript transaction and returns its return
   * value.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collections.ArangoCollection} interface: `Collection`,
   * {@link graphs.GraphVertexCollection}, {@link graphs.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collections.DocumentCollection} and {@link collections.EdgeCollection}.
   *
   * **Note**: The `action` function will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any values other than those passed via the `params` option.
   *
   * See the official ArangoDB documentation for
   * [the JavaScript `@arangodb` module](https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html)
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
    collections: transactions.TransactionCollectionOptions & {
      allowImplicit?: boolean;
    },
    action: string,
    options?: transactions.TransactionOptions & { params?: any }
  ): Promise<any>;
  /**
   * Performs a server-side transaction and returns its return value.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collections.ArangoCollection} interface: `Collection`,
   * {@link graphs.GraphVertexCollection}, {@link graphs.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collections.DocumentCollection} and {@link collections.EdgeCollection}.
   *
   * **Note**: The `action` function will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any values other than those passed via the `params` option.
   * See the official ArangoDB documentation for
   * [the JavaScript `@arangodb` module](https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html)
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
    collections: (string | collections.ArangoCollection)[],
    action: string,
    options?: transactions.TransactionOptions & { params?: any }
  ): Promise<any>;
  /**
   * Performs a server-side transaction and returns its return value.
   *
   * The Collection can be specified as a collection name (string) or an object
   * implementing the {@link collections.ArangoCollection} interface: `Collection`,
   * {@link graphs.GraphVertexCollection}, {@link graphs.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collections.DocumentCollection} and {@link collections.EdgeCollection}.
   *
   * **Note**: The `action` function will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any values other than those passed via the `params` option.
   * See the official ArangoDB documentation for
   * [the JavaScript `@arangodb` module](https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html)
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
    collection: string | collections.ArangoCollection,
    action: string,
    options?: transactions.TransactionOptions & { params?: any }
  ): Promise<any>;
  executeTransaction(
    collections:
      | (transactions.TransactionCollectionOptions & {
          allowImplicit?: boolean;
        })
      | (string | collections.ArangoCollection)[]
      | string
      | collections.ArangoCollection,
    action: string,
    options: transactions.TransactionOptions & { params?: any } = {}
  ): Promise<any> {
    const { allowDirtyRead = undefined, ...opts } = options;
    return this.request(
      {
        method: "POST",
        pathname: "/_api/transaction",
        allowDirtyRead,
        body: {
          collections: transactions.coerceTransactionCollections(collections),
          action,
          ...opts,
        },
      },
      (res) => res.parsedBody.result
    );
  }

  /**
   * Returns a {@link transactions.Transaction} instance for an existing streaming
   * transaction with the given `id`.
   *
   * See also {@link Database#beginTransaction}.
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
  transaction(transactionId: string): transactions.Transaction {
    return new transactions.Transaction(this, transactionId);
  }

  /**
   * Begins a new streaming transaction for the given collections, then returns
   * a {@link transactions.Transaction} instance for the transaction.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collections.ArangoCollection} interface: `Collection`,
   * {@link graphs.GraphVertexCollection}, {@link graphs.GraphEdgeCollection} as
   * well as (in TypeScript) {@link collections.DocumentCollection} and
   * {@link collections.EdgeCollection}.
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
   * const start = await trx.step(() => vertices.document("a"));
   * const end = await trx.step(() => vertices.document("b"));
   * await trx.step(() => edges.save({ _from: start._id, _to: end._id }));
   * await trx.commit();
   * ```
   */
  beginTransaction(
    collections: transactions.TransactionCollectionOptions,
    options?: transactions.TransactionOptions
  ): Promise<transactions.Transaction>;
  /**
   * Begins a new streaming transaction for the given collections, then returns
   * a {@link transactions.Transaction} instance for the transaction.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collections.ArangoCollection} interface: `Collection`,
   * {@link graphs.GraphVertexCollection}, {@link graphs.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collections.DocumentCollection} and {@link collections.EdgeCollection}.
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
   * const start = await trx.step(() => vertices.document("a"));
   * const end = await trx.step(() => vertices.document("b"));
   * await trx.step(() => edges.save({ _from: start._id, _to: end._id }));
   * await trx.commit();
   * ```
   */
  beginTransaction(
    collections: (string | collections.ArangoCollection)[],
    options?: transactions.TransactionOptions
  ): Promise<transactions.Transaction>;
  /**
   * Begins a new streaming transaction for the given collections, then returns
   * a {@link transactions.Transaction} instance for the transaction.
   *
   * The Collection can be specified as a collection name (string) or an object
   * implementing the {@link collections.ArangoCollection} interface: `Collection`,
   * {@link graphs.GraphVertexCollection}, {@link graphs.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collections.DocumentCollection} and {@link collections.EdgeCollection}.
   *
   * @param collection - A collection that can be read from and written to
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
   * await trx.step(() => edges.save({ _from: start._id, _to: end._id }));
   * await trx.commit();
   * ```
   */
  beginTransaction(
    collection: string | collections.ArangoCollection,
    options?: transactions.TransactionOptions
  ): Promise<transactions.Transaction>;
  beginTransaction(
    collections:
      | transactions.TransactionCollectionOptions
      | (string | collections.ArangoCollection)[]
      | string
      | collections.ArangoCollection,
    options: transactions.TransactionOptions = {}
  ): Promise<transactions.Transaction> {
    const { allowDirtyRead = undefined, ...opts } = options;
    return this.request(
      {
        method: "POST",
        pathname: "/_api/transaction/begin",
        allowDirtyRead,
        body: {
          collections: transactions.coerceTransactionCollections(collections),
          ...opts,
        },
      },
      (res) => new transactions.Transaction(this, res.parsedBody.result.id)
    );
  }

  /**
   * Begins and commits a transaction using the given callback. Individual
   * requests that are part of the transaction need to be wrapped in the step
   * function passed into the callback. If the promise returned by the callback
   * is rejected, the transaction will be aborted.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collections.ArangoCollection} interface: `Collection`,
   * {@link graphs.GraphVertexCollection}, {@link graphs.GraphEdgeCollection} as
   * well as (in TypeScript) {@link collections.DocumentCollection} and
   * {@link collections.EdgeCollection}.
   *
   * @param collections - Collections involved in the transaction.
   * @param callback - Callback function executing the transaction steps.
   * @param options - Options for the transaction.
   *
   * @example
   * ```js
   * const vertices = db.collection("vertices");
   * const edges = db.collection("edges");
   * await db.withTransaction(
   *   {
   *     read: ["vertices"],
   *     write: [edges] // collection instances can be passed directly
   *   },
   *   async (step) => {
   *     const start = await step(() => vertices.document("a"));
   *     const end = await step(() => vertices.document("b"));
   *     await step(() => edges.save({ _from: start._id, _to: end._id }));
   *   }
   * );
   * ```
   */
  withTransaction<T>(
    collections: transactions.TransactionCollectionOptions,
    callback: (step: transactions.Transaction["step"]) => Promise<T>,
    options?: transactions.TransactionOptions
  ): Promise<T>;
  /**
   * Begins and commits a transaction using the given callback. Individual
   * requests that are part of the transaction need to be wrapped in the step
   * function passed into the callback. If the promise returned by the callback
   * is rejected, the transaction will be aborted.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collections.ArangoCollection} interface: `Collection`,
   * {@link graphs.GraphVertexCollection}, {@link graphs.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collections.DocumentCollection} and {@link collections.EdgeCollection}.
   *
   * @param collections - Collections that can be read from and written to
   * during the transaction.
   * @param callback - Callback function executing the transaction steps.
   * @param options - Options for the transaction.
   *
   * @example
   * ```js
   * const vertices = db.collection("vertices");
   * const edges = db.collection("edges");
   * await db.withTransaction(
   *   [
   *     "vertices",
   *     edges, // collection instances can be passed directly
   *   ],
   *   async (step) => {
   *     const start = await step(() => vertices.document("a"));
   *     const end = await step(() => vertices.document("b"));
   *     await step(() => edges.save({ _from: start._id, _to: end._id }));
   *   }
   * );
   * ```
   */
  withTransaction<T>(
    collections: (string | collections.ArangoCollection)[],
    callback: (step: transactions.Transaction["step"]) => Promise<T>,
    options?: transactions.TransactionOptions
  ): Promise<T>;
  /**
   * Begins and commits a transaction using the given callback. Individual
   * requests that are part of the transaction need to be wrapped in the step
   * function passed into the callback. If the promise returned by the callback
   * is rejected, the transaction will be aborted.
   *
   * The Collection can be specified as a collection name (string) or an object
   * implementing the {@link collections.ArangoCollection} interface: `Collection`,
   * {@link graphs.GraphVertexCollection}, {@link graphs.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collections.DocumentCollection} and {@link collections.EdgeCollection}.
   *
   * @param collection - A collection that can be read from and written to
   * during the transaction.
   * @param callback - Callback function executing the transaction steps.
   * @param options - Options for the transaction.
   *
   * @example
   * ```js
   * const vertices = db.collection("vertices");
   * const start = vertices.document("a");
   * const end = vertices.document("b");
   * const edges = db.collection("edges");
   * await db.withTransaction(
   *   edges, // collection instances can be passed directly
   *   async (step) => {
   *     await step(() => edges.save({ _from: start._id, _to: end._id }));
   *   }
   * );
   * ```
   */
  withTransaction<T>(
    collection: string | collections.ArangoCollection,
    callback: (step: transactions.Transaction["step"]) => Promise<T>,
    options?: transactions.TransactionOptions
  ): Promise<T>;
  async withTransaction<T>(
    collections:
      | transactions.TransactionCollectionOptions
      | (string | collections.ArangoCollection)[]
      | string
      | collections.ArangoCollection,
    callback: (step: transactions.Transaction["step"]) => Promise<T>,
    options: transactions.TransactionOptions = {}
  ): Promise<T> {
    const trx = await this.beginTransaction(
      collections as transactions.TransactionCollectionOptions,
      options
    );
    try {
      const result = await callback((fn) => trx.step(fn));
      await trx.commit();
      return result;
    } catch (e) {
      try {
        await trx.abort();
      } catch {}
      throw e;
    }
  }

  /**
   * Fetches all active transactions from the database and returns an array of
   * transaction descriptions.
   *
   * See also {@link Database#transactions}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const transactions = await db.listTransactions();
   * // transactions is an array of transaction descriptions
   * ```
   */
  listTransactions(): Promise<transactions.TransactionDescription[]> {
    return this._connection.request(
      { pathname: "/_api/transaction" },
      (res) => res.parsedBody.transactions
    );
  }

  /**
   * Fetches all active transactions from the database and returns an array of
   * {@link transactions.Transaction} instances for those transactions.
   *
   * See also {@link Database#listTransactions}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const transactions = await db.transactions();
   * // transactions is an array of transactions
   * ```
   */
  async transactions(): Promise<transactions.Transaction[]> {
    const transactions = await this.listTransactions();
    return transactions.map((data) => this.transaction(data.id));
  }
  //#endregion

  //#region queries
  /**
   * Performs a database query using the given `query`, then returns a new
   * {@link cursors.Cursor} instance for the result set.
   *
   * See the {@link aql.aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * **Note**: When executing a query in a streaming transaction using the
   * `step` method, the resulting cursor will be bound to that transaction and
   * you do not need to use the `step` method to consume it.
   *
   * @param query - An object containing an AQL query string and bind
   * parameters, e.g. the object returned from an {@link aql.aql} template string.
   * @param options - Options for the query execution.
   *
   * @example
   * ```js
   * const db = new Database();
   * const active = true;
   * const Users = db.collection("_users");
   *
   * // Using an aql template string:
   * // Bind parameters are automatically extracted and arangojs collections
   * // are automatically passed as collection bind parameters.
   * const cursor = await db.query(aql`
   *   FOR u IN ${Users}
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
   * const Users = db.collection("_users");
   *
   * // Using an object with a regular multi-line string
   * const cursor = await db.query({
   *   query: `
   *     FOR u IN @@users
   *     FILTER u.authData.active == @active
   *     RETURN u.user
   *   `,
   *   bindVars: { active: active, "@users": Users.name }
   * });
   * ```
   */
  query<T = any>(
    query: aql.AqlQuery<T>,
    options?: queries.QueryOptions
  ): Promise<cursors.Cursor<T>>;
  /**
   * Performs a database query using the given `query` and `bindVars`, then
   * returns a new {@link cursors.Cursor} instance for the result set.
   *
   * See the {@link aql.aql} template string handler for a safer and easier
   * alternative to passing strings directly.
   *
   * **Note**: When executing a query in a streaming transaction using the
   * `step` method, the resulting cursor will be bound to that transaction and
   * you do not need to use the `step` method to consume it.
   *
   * @param query - An AQL query string.
   * @param bindVars - An object defining bind parameters for the query.
   * @param options - Options for the query execution.
   *
   * @example
   * ```js
   * const db = new Database();
   * const active = true;
   * const Users = db.collection("_users");
   *
   * const cursor = await db.query(
   *   // A normal multi-line string
   *   `
   *     FOR u IN @@users
   *     FILTER u.authData.active == @active
   *     RETURN u.user
   *   `,
   *   { active: active, "@users": Users.name }
   * );
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const active = true;
   * const Users = db.collection("_users");
   *
   * const cursor = await db.query(
   *   // An AQL literal created from a normal multi-line string
   *   aql.literal(`
   *     FOR u IN @@users
   *     FILTER u.authData.active == @active
   *     RETURN u.user
   *   `),
   *   { active: active, "@users": Users.name }
   * );
   * ```
   */
  query<T = any>(
    query: string | aql.AqlLiteral,
    bindVars?: Record<string, any>,
    options?: queries.QueryOptions
  ): Promise<cursors.Cursor<T>>;
  query<T = any>(
    query: string | aql.AqlQuery | aql.AqlLiteral,
    bindVars?: Record<string, any>,
    options: queries.QueryOptions = {}
  ): Promise<cursors.Cursor<T>> {
    if (aql.isAqlQuery(query)) {
      options = bindVars ?? {};
      bindVars = query.bindVars;
      query = query.query;
    } else if (aql.isAqlLiteral(query)) {
      query = query.toAQL();
    }
    const {
      allowDirtyRead,
      retryOnConflict,
      count,
      batchSize,
      cache,
      memoryLimit,
      ttl,
      timeout,
      ...opts
    } = options;
    return this.request(
      {
        method: "POST",
        pathname: "/_api/cursor",
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
        retryOnConflict,
        timeout,
      },
      (res) =>
        new cursors.BatchCursor<T>(
          this,
          res.parsedBody,
          res.arangojsHostUrl,
          allowDirtyRead
        ).items
    );
  }

  /**
   * Explains a database query using the given `query`.
   *
   * See the {@link aql.aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An object containing an AQL query string and bind
   * parameters, e.g. the object returned from an {@link aql.aql} template string.
   * @param options - Options for explaining the query.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const explanation = await db.explain(aql`
   *   FOR doc IN ${collection}
   *   FILTER doc.flavor == "strawberry"
   *   RETURN doc._key
   * `);
   * ```
   */
  explain(
    query: aql.AqlQuery,
    options?: queries.ExplainOptions & { allPlans?: false }
  ): Promise<connection.ArangoApiResponse<queries.SingleExplainResult>>;
  /**
   * Explains a database query using the given `query`.
   *
   * See the {@link aql.aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An object containing an AQL query string and bind
   * parameters, e.g. the object returned from an {@link aql.aql} template string.
   * @param options - Options for explaining the query.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const explanation = await db.explain(
   *   aql`
   *     FOR doc IN ${collection}
   *     FILTER doc.flavor == "strawberry"
   *     RETURN doc._key
   *   `,
   *   { allPlans: true }
   * );
   * ```
   */
  explain(
    query: aql.AqlQuery,
    options?: queries.ExplainOptions & { allPlans: true }
  ): Promise<connection.ArangoApiResponse<queries.MultiExplainResult>>;
  /**
   * Explains a database query using the given `query` and `bindVars`.
   *
   * See the {@link aql.aql} template string handler for a safer and easier
   * alternative to passing strings directly.
   *
   * @param query - An AQL query string.
   * @param bindVars - An object defining bind parameters for the query.
   * @param options - Options for explaining the query.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const explanation = await db.explain(
   *   `
   *     FOR doc IN @@collection
   *     FILTER doc.flavor == "strawberry"
   *     RETURN doc._key
   *   `,
   *   { "@collection": collection.name }
   * );
   * ```
   */
  explain(
    query: string | aql.AqlLiteral,
    bindVars?: Record<string, any>,
    options?: queries.ExplainOptions & { allPlans?: false }
  ): Promise<connection.ArangoApiResponse<queries.SingleExplainResult>>;
  /**
   * Explains a database query using the given `query` and `bindVars`.
   *
   * See the {@link aql.aql} template string handler for a safer and easier
   * alternative to passing strings directly.
   *
   * @param query - An AQL query string.
   * @param bindVars - An object defining bind parameters for the query.
   * @param options - Options for explaining the query.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const explanation = await db.explain(
   *   `
   *     FOR doc IN @@collection
   *     FILTER doc.flavor == "strawberry"
   *     RETURN doc._key
   *   `,
   *   { "@collection": collection.name },
   *   { allPlans: true }
   * );
   * ```
   */
  explain(
    query: string | aql.AqlLiteral,
    bindVars?: Record<string, any>,
    options?: queries.ExplainOptions & { allPlans: true }
  ): Promise<connection.ArangoApiResponse<queries.MultiExplainResult>>;
  explain(
    query: string | aql.AqlQuery | aql.AqlLiteral,
    bindVars?: Record<string, any>,
    options?: queries.ExplainOptions
  ): Promise<
    connection.ArangoApiResponse<
      queries.SingleExplainResult | queries.MultiExplainResult
    >
  > {
    if (aql.isAqlQuery(query)) {
      options = bindVars;
      bindVars = query.bindVars;
      query = query.query;
    } else if (aql.isAqlLiteral(query)) {
      query = query.toAQL();
    }
    return this.request({
      method: "POST",
      pathname: "/_api/explain",
      body: { query, bindVars, options },
    });
  }

  /**
   * Parses the given query and returns the result.
   *
   * See the {@link aql.aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An AQL query string or an object containing an AQL query
   * string and bind parameters, e.g. the object returned from an {@link aql.aql}
   * template string.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const ast = await db.parse(aql`
   *   FOR doc IN ${collection}
   *   FILTER doc.flavor == "strawberry"
   *   RETURN doc._key
   * `);
   * ```
   aql.*/
  parse(
    query: string | aql.AqlQuery | aql.AqlLiteral
  ): Promise<queries.ParseResult> {
    if (aql.isAqlQuery(query)) {
      query = query.query;
    } else if (aql.isAqlLiteral(query)) {
      query = query.toAQL();
    }
    return this.request({
      method: "POST",
      pathname: "/_api/query",
      body: { query },
    });
  }

  /**
   * Fetches the available optimizer rules.
   *
   * @example
   * ```js
   * const db = new Database();
   * const rules = await db.queryRules();
   * for (const rule of rules) {
   *   console.log(rule.name);
   * }
   * ```
   */
  queryRules(): Promise<queries.QueryOptimizerRule[]> {
    return this.request({
      pathname: "/_api/query/rules",
    });
  }

  /**
   * Fetches the query tracking properties.
   *
   * @example
   * ```js
   * const db = new Database();
   * const tracking = await db.queryTracking();
   * console.log(tracking.enabled);
   * ```
   */
  queryTracking(): Promise<queries.QueryTrackingInfo>;
  /**
   * Modifies the query tracking properties.
   *
   * @param options - Options for query tracking.
   *
   * @example
   * ```js
   * const db = new Database();
   * // track up to 5 slow queries exceeding 5 seconds execution time
   * await db.setQueryTracking({
   *   enabled: true,
   *   trackSlowQueries: true,
   *   maxSlowQueries: 5,
   *   slowQueryThreshold: 5
   * });
   * ```
   */
  queryTracking(
    options: queries.QueryTrackingOptions
  ): Promise<queries.QueryTrackingInfo>;
  queryTracking(
    options?: queries.QueryTrackingOptions
  ): Promise<queries.QueryTrackingInfo> {
    return this.request(
      options
        ? {
            method: "PUT",
            pathname: "/_api/query/properties",
            body: options,
          }
        : {
            method: "GET",
            pathname: "/_api/query/properties",
          }
    );
  }

  /**
   * Fetches a list of information for all currently running queries.
   *
   * See also {@link Database#listSlowQueries} and {@link Database#killQuery}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const queries = await db.listRunningQueries();
   * ```
   */
  listRunningQueries(): Promise<queries.QueryDescription[]> {
    return this.request({
      method: "GET",
      pathname: "/_api/query/current",
    });
  }

  /**
   * Fetches a list of information for all recent slow queries.
   *
   * See also {@link Database#listRunningQueries} and
   * {@link Database#clearSlowQueries}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const queries = await db.listSlowQueries();
   * // Only works if slow query tracking is enabled
   * ```
   */
  listSlowQueries(): Promise<queries.QueryDescription[]> {
    return this.request({
      method: "GET",
      pathname: "/_api/query/slow",
    });
  }

  /**
   * Clears the list of recent slow queries.
   *
   * See also {@link Database#listSlowQueries}.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.clearSlowQueries();
   * // Slow query list is now cleared
   * ```
   */
  clearSlowQueries(): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        pathname: "/_api/query/slow",
      },
      () => undefined
    );
  }

  /**
   * Kills a running query with the given `queryId`.
   *
   * See also {@link Database#listRunningQueries}.
   *
   * @param queryId - The ID of a currently running query.
   *
   * @example
   * ```js
   * const db = new Database();
   * const queries = await db.listRunningQueries();
   * await Promise.all(queries.map(
   *   async (query) => {
   *     if (query.state === "executing") {
   *       await db.killQuery(query.id);
   *     }
   *   }
   * ));
   * ```
   */
  killQuery(queryId: string): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        pathname: `/_api/query/${encodeURIComponent(queryId)}`,
      },
      () => undefined
    );
  }

  /**
   * Fetches a list of all entries in the AQL query results cache of the
   * current database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const entries = await db.listQueryCacheEntries();
   * console.log(entries);
   * ```
   */
  listQueryCacheEntries(): Promise<queries.QueryCacheEntry[]> {
    return this.request({
      pathname: "/_api/query-cache/entries",
    });
  }

  /**
   * Clears the AQL query results cache of the current database.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.clearQueryCache();
   * // Cache is now cleared
   * ```
   */
  clearQueryCache(): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        pathname: "/_api/query-cache",
      },
      () => undefined
    );
  }

  /**
   * Fetches the global properties for the AQL query results cache.
   *
   * @example
   * ```js
   * const db = new Database();
   * const properties = await db.getQueryCacheProperties();
   * console.log(properties);
   * ```
   */
  getQueryCacheProperties(): Promise<queries.QueryCacheProperties> {
    return this.request({
      pathname: "/_api/query-cache/properties",
    });
  }

  /**
   * Updates the global properties for the AQL query results cache.
   *
   * @param properties - The new properties for the AQL query results cache.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.setQueryCacheProperties({ maxResults: 9000 });
   * ```
   */
  setQueryCacheProperties(
    properties: queries.QueryCachePropertiesOptions
  ): Promise<queries.QueryCacheProperties> {
    return this.request({
      method: "PUT",
      pathname: "/_api/query-cache/properties",
      body: properties,
    });
  }
  //#endregion

  //#region user functions
  /**
   * Fetches a list of all AQL user functions registered with the database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const functions = await db.listUserFunctions();
   * const names = functions.map(fn => fn.name);
   * ```
   */
  listUserFunctions(): Promise<queries.UserFunctionDescription[]> {
    return this.request(
      { pathname: "/_api/aqlfunction" },
      (res) => res.parsedBody.result
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
   * await db.createUserFunction(
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
  createUserFunction(
    name: string,
    code: string,
    isDeterministic: boolean = false
  ): Promise<connection.ArangoApiResponse<{ isNewlyCreated: boolean }>> {
    return this.request({
      method: "POST",
      pathname: "/_api/aqlfunction",
      body: { name, code, isDeterministic },
    });
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
   * await db.dropUserFunction("ACME::ACCOUNTING::CALCULATE_VAT");
   * // the function no longer exists
   * ```
   */
  dropUserFunction(
    name: string,
    group: boolean = false
  ): Promise<connection.ArangoApiResponse<{ deletedCount: number }>> {
    return this.request({
      method: "DELETE",
      pathname: `/_api/aqlfunction/${encodeURIComponent(name)}`,
      search: { group },
    });
  }
  //#endregion

  //#region services
  /**
   * Fetches a list of all installed service.
   *
   * @param excludeSystem - Whether system services should be excluded.
   *
   * @example
   * ```js
   * const db = new Database();
   * const services = await db.listServices();
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const services = await db.listServices(false); // all services
   * ```
   */
  listServices(
    excludeSystem: boolean = true
  ): Promise<services.ServiceSummary[]> {
    return this.request({
      pathname: "/_api/foxx",
      search: { excludeSystem },
    });
  }

  /**
   * Installs a new service.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param source - The service bundle to install.
   * @param options - Options for installing the service.
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a Buffer in Node.js as source
   * const source = new Blob([await fs.readFileSync("./my-foxx-service.zip")]);
   * const info = await db.installService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a Blob in Node.js as source
   * const source = await fs.openAsBlob("./my-foxx-service.zip");
   * const info = await db.installService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a File from a browser file input as source
   * const element = document.getElementById("my-file-input");
   * const source = element.files[0];
   * const info = await db.installService("/hello", source);
   * ```
   */
  async installService(
    mount: string,
    source: File | Blob | string,
    options: services.InstallServiceOptions = {}
  ): Promise<services.ServiceDescription> {
    const { configuration, dependencies, ...search } = options;
    const form = new FormData();
    if (configuration) {
      form.append("configuration", JSON.stringify(configuration));
    }
    if (dependencies) {
      form.append("dependencies", JSON.stringify(dependencies));
    }
    form.append(
      "source",
      typeof source === "string" ? JSON.stringify(source) : source
    );
    return await this.request({
      body: form,
      method: "POST",
      pathname: "/_api/foxx",
      search: { ...search, mount },
    });
  }

  /**
   * Replaces an existing service with a new service by completely removing the
   * old service and installing a new service at the same mount point.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param source - The service bundle to install.
   * @param options - Options for replacing the service.
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a Buffer in Node.js as source
   * const source = new Blob([await fs.readFileSync("./my-foxx-service.zip")]);
   * const info = await db.replaceService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a Blob in Node.js as source
   * const source = await fs.openAsBlob("./my-foxx-service.zip");
   * const info = await db.replaceService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a File from a browser file input as source
   * const element = document.getElementById("my-file-input");
   * const source = element.files[0];
   * const info = await db.replaceService("/hello", source);
   * ```
   */
  async replaceService(
    mount: string,
    source: File | Blob | string,
    options: services.ReplaceServiceOptions = {}
  ): Promise<services.ServiceDescription> {
    const { configuration, dependencies, ...search } = options;
    const form = new FormData();
    if (configuration) {
      form.append("configuration", JSON.stringify(configuration));
    }
    if (dependencies) {
      form.append("dependencies", JSON.stringify(dependencies));
    }
    form.append(
      "source",
      typeof source === "string" ? JSON.stringify(source) : source
    );
    return await this.request({
      body: form,
      method: "PUT",
      pathname: "/_api/foxx/service",
      search: { ...search, mount },
    });
  }

  /**
   * Replaces an existing service with a new service while retaining the old
   * service's configuration and dependencies.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param source - The service bundle to install.
   * @param options - Options for upgrading the service.
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a Buffer in Node.js as source
   * const source = new Blob([await fs.readFileSync("./my-foxx-service.zip")]);
   * const info = await db.upgradeService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a Blob in Node.js as source
   * const source = await fs.openAsBlob("./my-foxx-service.zip");
   * const info = await db.upgradeService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a File from a browser file input as source
   * const element = document.getElementById("my-file-input");
   * const source = element.files[0];
   * const info = await db.upgradeService("/hello", source);
   * ```
   */
  async upgradeService(
    mount: string,
    source: File | Blob | string,
    options: services.UpgradeServiceOptions = {}
  ): Promise<services.ServiceDescription> {
    const { configuration, dependencies, ...search } = options;
    const form = new FormData();
    if (configuration) {
      form.append("configuration", JSON.stringify(configuration));
    }
    if (dependencies) {
      form.append("dependencies", JSON.stringify(dependencies));
    }
    form.append(
      "source",
      typeof source === "string" ? JSON.stringify(source) : source
    );
    return await this.request({
      body: form,
      method: "PATCH",
      pathname: "/_api/foxx/service",
      search: { ...search, mount },
    });
  }

  /**
   * Completely removes a service from the database.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param options - Options for uninstalling the service.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.uninstallService("/my-foxx");
   * ```
   */
  uninstallService(
    mount: string,
    options?: services.UninstallServiceOptions
  ): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        pathname: "/_api/foxx/service",
        search: { ...options, mount },
      },
      () => undefined
    );
  }

  /**
   * Retrieves information about a mounted service.
   *
   * @param mount - The service's mount point, relative to the database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const info = await db.getService("/my-service");
   * // info contains detailed information about the service
   * ```
   */
  getService(mount: string): Promise<services.ServiceDescription> {
    return this.request({
      pathname: "/_api/foxx/service",
      search: { mount },
    });
  }

  /**
   * Retrieves information about the service's configuration options and their
   * current values.
   *
   * See also {@link Database#replaceServiceConfiguration} and
   * {@link Database#updateServiceConfiguration}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param minimal - If set to `true`, the result will only include each
   * configuration option's current value. Otherwise it will include the full
   * definition for each option.
   *
   * @example
   * ```js
   * const db = new Database();
   * const config = await db.getServiceConfiguration("/my-service");
   * for (const [key, option] of Object.entries(config)) {
   *   console.log(`${option.title} (${key}): ${option.current}`);
   * }
   * ```
   */
  getServiceConfiguration(
    mount: string,
    minimal?: false
  ): Promise<Record<string, services.ServiceConfiguration>>;
  /**
   * Retrieves information about the service's configuration options and their
   * current values.
   *
   * See also {@link Database#replaceServiceConfiguration} and
   * {@link Database#updateServiceConfiguration}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param minimal - If set to `true`, the result will only include each
   * configuration option's current value. Otherwise it will include the full
   * definition for each option.
   *
   * @example
   * ```js
   * const db = new Database();
   * const config = await db.getServiceConfiguration("/my-service", true);
   * for (const [key, value] of Object.entries(config)) {
   *   console.log(`${key}: ${value}`);
   * }
   * ```
   */
  getServiceConfiguration(
    mount: string,
    minimal: true
  ): Promise<Record<string, any>>;
  getServiceConfiguration(mount: string, minimal: boolean = false) {
    return this.request({
      pathname: "/_api/foxx/configuration",
      search: { mount, minimal },
    });
  }

  /**
   * Replaces the configuration of the given service, discarding any existing
   * values for options not specified.
   *
   * See also {@link Database#updateServiceConfiguration} and
   * {@link Database#getServiceConfiguration}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param cfg - An object mapping configuration option names to values.
   * @param minimal - If set to `true`, the result will only include each
   * configuration option's current value and warning (if any).
   * Otherwise it will include the full definition for each option.
   *
   * @example
   * ```js
   * const db = new Database();
   * const config = { currency: "USD", locale: "en-US" };
   * const info = await db.replaceServiceConfiguration("/my-service", config);
   * for (const [key, option] of Object.entries(info)) {
   *   console.log(`${option.title} (${key}): ${option.value}`);
   *   if (option.warning) console.warn(`Warning: ${option.warning}`);
   * }
   * ```
   */
  replaceServiceConfiguration(
    mount: string,
    cfg: Record<string, any>,
    minimal?: false
  ): Promise<
    Record<string, services.ServiceConfiguration & { warning?: string }>
  >;
  /**
   * Replaces the configuration of the given service, discarding any existing
   * values for options not specified.
   *
   * See also {@link Database#updateServiceConfiguration} and
   * {@link Database#getServiceConfiguration}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param cfg - An object mapping configuration option names to values.
   * @param minimal - If set to `true`, the result will only include each
   * configuration option's current value and warning (if any).
   * Otherwise it will include the full definition for each option.
   *
   * @example
   * ```js
   * const db = new Database();
   * const config = { currency: "USD", locale: "en-US" };
   * const info = await db.replaceServiceConfiguration("/my-service", config);
   * for (const [key, value] of Object.entries(info.values)) {
   *   console.log(`${key}: ${value}`);
   *   if (info.warnings[key]) console.warn(`Warning: ${info.warnings[key]}`);
   * }
   * ```
   */
  replaceServiceConfiguration(
    mount: string,
    cfg: Record<string, any>,
    minimal: true
  ): Promise<{
    values: Record<string, any>;
    warnings: Record<string, string>;
  }>;
  replaceServiceConfiguration(
    mount: string,
    cfg: Record<string, any>,
    minimal: boolean = false
  ) {
    return this.request({
      method: "PUT",
      pathname: "/_api/foxx/configuration",
      body: cfg,
      search: { mount, minimal },
    });
  }

  /**
   * Updates the configuration of the given service while maintaining any
   * existing values for options not specified.
   *
   * See also {@link Database#replaceServiceConfiguration} and
   * {@link Database#getServiceConfiguration}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param cfg - An object mapping configuration option names to values.
   * @param minimal - If set to `true`, the result will only include each
   * configuration option's current value and warning (if any).
   * Otherwise it will include the full definition for each option.
   *
   * @example
   * ```js
   * const db = new Database();
   * const config = { currency: "USD", locale: "en-US" };
   * const info = await db.updateServiceConfiguration("/my-service", config);
   * for (const [key, option] of Object.entries(info)) {
   *   console.log(`${option.title} (${key}): ${option.value}`);
   *   if (option.warning) console.warn(`Warning: ${option.warning}`);
   * }
   * ```
   */
  updateServiceConfiguration(
    mount: string,
    cfg: Record<string, any>,
    minimal?: false
  ): Promise<
    Record<string, services.ServiceConfiguration & { warning?: string }>
  >;
  /**
   * Updates the configuration of the given service while maintaining any
   * existing values for options not specified.
   *
   * See also {@link Database#replaceServiceConfiguration} and
   * {@link Database#getServiceConfiguration}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param cfg - An object mapping configuration option names to values.
   * @param minimal - If set to `true`, the result will only include each
   * configuration option's current value and warning (if any).
   * Otherwise it will include the full definition for each option.
   *
   * @example
   * ```js
   * const db = new Database();
   * const config = { currency: "USD", locale: "en-US" };
   * const info = await db.updateServiceConfiguration("/my-service", config);
   * for (const [key, value] of Object.entries(info.values)) {
   *   console.log(`${key}: ${value}`);
   *   if (info.warnings[key]) console.warn(`Warning: ${info.warnings[key]}`);
   * }
   * ```
   */
  updateServiceConfiguration(
    mount: string,
    cfg: Record<string, any>,
    minimal: true
  ): Promise<{
    values: Record<string, any>;
    warnings: Record<string, string>;
  }>;
  updateServiceConfiguration(
    mount: string,
    cfg: Record<string, any>,
    minimal: boolean = false
  ) {
    return this.request({
      method: "PATCH",
      pathname: "/_api/foxx/configuration",
      body: cfg,
      search: { mount, minimal },
    });
  }

  /**
   * Retrieves information about the service's dependencies and their current
   * mount points.
   *
   * See also {@link Database#replaceServiceDependencies} and
   * {@link Database#updateServiceDependencies}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param minimal - If set to `true`, the result will only include each
   * dependency's current mount point. Otherwise it will include the full
   * definition for each dependency.
   *
   * @example
   * ```js
   * const db = new Database();
   * const deps = await db.getServiceDependencies("/my-service");
   * for (const [key, dep] of Object.entries(deps)) {
   *   console.log(`${dep.title} (${key}): ${dep.current}`);
   * }
   * ```
   */
  getServiceDependencies(
    mount: string,
    minimal?: false
  ): Promise<
    Record<
      string,
      services.SingleServiceDependency | services.MultiServiceDependency
    >
  >;
  /**
   * Retrieves information about the service's dependencies and their current
   * mount points.
   *
   * See also {@link Database#replaceServiceDependencies} and
   * {@link Database#updateServiceDependencies}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param minimal - If set to `true`, the result will only include each
   * dependency's current mount point. Otherwise it will include the full
   * definition for each dependency.
   *
   * @example
   * ```js
   * const db = new Database();
   * const deps = await db.getServiceDependencies("/my-service", true);
   * for (const [key, value] of Object.entries(deps)) {
   *   console.log(`${key}: ${value}`);
   * }
   * ```
   */
  getServiceDependencies(
    mount: string,
    minimal: true
  ): Promise<Record<string, string | string[]>>;
  getServiceDependencies(mount: string, minimal: boolean = false) {
    return this.request({
      pathname: "/_api/foxx/dependencies",
      search: { mount, minimal },
    });
  }

  /**
   * Replaces the dependencies of the given service, discarding any existing
   * mount points for dependencies not specified.
   *
   * See also {@link Database#updateServiceDependencies} and
   * {@link Database#getServiceDependencies}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param cfg - An object mapping dependency aliases to mount points.
   * @param minimal - If set to `true`, the result will only include each
   * dependency's current mount point. Otherwise it will include the full
   * definition for each dependency.
   *
   * @example
   * ```js
   * const db = new Database();
   * const deps = { mailer: "/mailer-api", auth: "/remote-auth" };
   * const info = await db.replaceServiceDependencies("/my-service", deps);
   * for (const [key, dep] of Object.entries(info)) {
   *   console.log(`${dep.title} (${key}): ${dep.current}`);
   *   if (dep.warning) console.warn(`Warning: ${dep.warning}`);
   * }
   * ```
   */
  replaceServiceDependencies(
    mount: string,
    deps: Record<string, string>,
    minimal?: false
  ): Promise<
    Record<
      string,
      (services.SingleServiceDependency | services.MultiServiceDependency) & {
        warning?: string;
      }
    >
  >;
  /**
   * Replaces the dependencies of the given service, discarding any existing
   * mount points for dependencies not specified.
   *
   * See also {@link Database#updateServiceDependencies} and
   * {@link Database#getServiceDependencies}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param cfg - An object mapping dependency aliases to mount points.
   * @param minimal - If set to `true`, the result will only include each
   * dependency's current mount point. Otherwise it will include the full
   * definition for each dependency.
   *
   * @example
   * ```js
   * const db = new Database();
   * const deps = { mailer: "/mailer-api", auth: "/remote-auth" };
   * const info = await db.replaceServiceDependencies(
   *   "/my-service",
   *   deps,
   *   true
   * );
   * for (const [key, value] of Object.entries(info)) {
   *   console.log(`${key}: ${value}`);
   *   if (info.warnings[key]) console.warn(`Warning: ${info.warnings[key]}`);
   * }
   * ```
   */
  replaceServiceDependencies(
    mount: string,
    deps: Record<string, string>,
    minimal: true
  ): Promise<{
    values: Record<string, string>;
    warnings: Record<string, string>;
  }>;
  replaceServiceDependencies(
    mount: string,
    deps: Record<string, string>,
    minimal: boolean = false
  ) {
    return this.request({
      method: "PUT",
      pathname: "/_api/foxx/dependencies",
      body: deps,
      search: { mount, minimal },
    });
  }

  /**
   * Updates the dependencies of the given service while maintaining any
   * existing mount points for dependencies not specified.
   *
   * See also {@link Database#replaceServiceDependencies} and
   * {@link Database#getServiceDependencies}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param cfg - An object mapping dependency aliases to mount points.
   * @param minimal - If set to `true`, the result will only include each
   * dependency's current mount point. Otherwise it will include the full
   * definition for each dependency.
   *
   * @example
   * ```js
   * const db = new Database();
   * const deps = { mailer: "/mailer-api", auth: "/remote-auth" };
   * const info = await db.updateServiceDependencies("/my-service", deps);
   * for (const [key, dep] of Object.entries(info)) {
   *   console.log(`${dep.title} (${key}): ${dep.current}`);
   *   if (dep.warning) console.warn(`Warning: ${dep.warning}`);
   * }
   * ```
   */
  updateServiceDependencies(
    mount: string,
    deps: Record<string, string>,
    minimal?: false
  ): Promise<
    Record<
      string,
      (services.SingleServiceDependency | services.MultiServiceDependency) & {
        warning?: string;
      }
    >
  >;
  /**
   * Updates the dependencies of the given service while maintaining any
   * existing mount points for dependencies not specified.
   *
   * See also {@link Database#replaceServiceDependencies} and
   * {@link Database#getServiceDependencies}.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param cfg - An object mapping dependency aliases to mount points.
   * @param minimal - If set to `true`, the result will only include each
   * dependency's current mount point. Otherwise it will include the full
   * definition for each dependency.
   *
   * @example
   * ```js
   * const db = new Database();
   * const deps = { mailer: "/mailer-api", auth: "/remote-auth" };
   * const info = await db.updateServiceDependencies(
   *   "/my-service",
   *   deps,
   *   true
   * );
   * for (const [key, value] of Object.entries(info)) {
   *   console.log(`${key}: ${value}`);
   *   if (info.warnings[key]) console.warn(`Warning: ${info.warnings[key]}`);
   * }
   * ```
   */
  updateServiceDependencies(
    mount: string,
    deps: Record<string, string>,
    minimal: true
  ): Promise<{
    values: Record<string, string>;
    warnings: Record<string, string>;
  }>;
  updateServiceDependencies(
    mount: string,
    deps: Record<string, string>,
    minimal: boolean = false
  ) {
    return this.request({
      method: "PATCH",
      pathname: "/_api/foxx/dependencies",
      body: deps,
      search: { mount, minimal },
    });
  }

  /**
   * Enables or disables development mode for the given service.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param enabled - Whether development mode should be enabled or disabled.
   *
   * @example
   * ```js
   * const db = new Database();
   * await db.setServiceDevelopmentMode("/my-service", true);
   * // the service is now in development mode
   * await db.setServiceDevelopmentMode("/my-service", false);
   * // the service is now in production mode
   * ```
   */
  setServiceDevelopmentMode(
    mount: string,
    enabled: boolean = true
  ): Promise<services.ServiceDescription> {
    return this.request({
      method: enabled ? "POST" : "DELETE",
      pathname: "/_api/foxx/development",
      search: { mount },
    });
  }

  /**
   * Retrieves an object mapping script names to their human readable
   * representations, as defined in the service manifest's "scripts" section.
   *
   * @param mount - The service's mount point, relative to the database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const scripts = await db.getServiceScripts("/my-service");
   * for (const [name, title] of Object.entries(scripts)) {
   *   console.log(`${name}: ${title}`);
   * }
   * ```
   */
  getServiceScripts(mount: string): Promise<Record<string, string>> {
    return this.request({
      pathname: "/_api/foxx/scripts",
      search: { mount },
    });
  }

  /**
   * Executes a service script and retrieves its result exposed as
   * `module.exports` (if any).
   *
   * @param mount - The service's mount point, relative to the database.
   * @param name - Name of the service script to execute as defined in the
   * service manifest.
   * @param params - Arbitrary value that will be exposed to the script as
   * `argv[0]` in the service context (e.g. `module.context.argv[0]`).
   * Must be serializable to JSON.
   *
   * @example
   * ```js
   * const db = new Database();
   * const result = await db.runServiceScript(
   *   "/my-service",
   *   "create-user",
   *   {
   *     username: "service_admin",
   *     password: "hunter2"
   *   }
   * );
   * ```
   */
  runServiceScript(mount: string, name: string, params?: any): Promise<any> {
    return this.request({
      method: "POST",
      pathname: `/_api/foxx/scripts/${encodeURIComponent(name)}`,
      body: params,
      search: { mount },
    });
  }

  /**
   * Runs the tests of a given service and returns the results using the
   * "default" reporter.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param options - Options for running the tests.
   *
   * @example
   * ```js
   * const db = new Database();
   * const testReport = await db.runServiceTests("/my-foxx");
   * ```
   */
  runServiceTests(
    mount: string,
    options?: {
      reporter?: "default";
      /**
       * Whether the reporter should use "idiomatic" mode. Has no effect when
       * using the "default" or "suite" reporters.
       */
      idiomatic?: false;
      /**
       * If set, only tests with full names including this exact string will be
       * executed.
       */
      filter?: string;
    }
  ): Promise<services.ServiceTestDefaultReport>;
  /**
   * Runs the tests of a given service and returns the results using the
   * "suite" reporter, which groups the test result by test suite.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param options - Options for running the tests.
   *
   * @example
   * ```js
   * const db = new Database();
   * const suiteReport = await db.runServiceTests(
   *   "/my-foxx",
   *   { reporter: "suite" }
   * );
   * ```
   */
  runServiceTests(
    mount: string,
    options: {
      reporter: "suite";
      /**
       * Whether the reporter should use "idiomatic" mode. Has no effect when
       * using the "default" or "suite" reporters.
       */
      idiomatic?: false;
      /**
       * If set, only tests with full names including this exact string will be
       * executed.
       */
      filter?: string;
    }
  ): Promise<services.ServiceTestSuiteReport>;
  /**
   * Runs the tests of a given service and returns the results using the
   * "stream" reporter, which represents the results as a sequence of tuples
   * representing events.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param options - Options for running the tests.
   *
   * @example
   * ```js
   * const db = new Database();
   * const streamEvents = await db.runServiceTests(
   *   "/my-foxx",
   *   { reporter: "stream" }
   * );
   * ```
   */
  runServiceTests(
    mount: string,
    options: {
      reporter: "stream";
      /**
       * Whether the reporter should use "idiomatic" mode. If set to `true`,
       * the results will be returned as a formatted string.
       */
      idiomatic?: false;
      /**
       * If set, only tests with full names including this exact string will be
       * executed.
       */
      filter?: string;
    }
  ): Promise<services.ServiceTestStreamReport>;
  /**
   * Runs the tests of a given service and returns the results using the
   * "tap" reporter, which represents the results as an array of strings using
   * the "tap" format.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param options - Options for running the tests.
   *
   * @example
   * ```js
   * const db = new Database();
   * const tapLines = await db.runServiceTests(
   *   "/my-foxx",
   *   { reporter: "tap" }
   * );
   * ```
   */
  runServiceTests(
    mount: string,
    options: {
      reporter: "tap";
      /**
       * Whether the reporter should use "idiomatic" mode. If set to `true`,
       * the results will be returned as a formatted string.
       */
      idiomatic?: false;
      /**
       * If set, only tests with full names including this exact string will be
       * executed.
       */
      filter?: string;
    }
  ): Promise<services.ServiceTestTapReport>;
  /**
   * Runs the tests of a given service and returns the results using the
   * "xunit" reporter, which represents the results as an XML document using
   * the JSONML exchange format.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param options - Options for running the tests.
   *
   * @example
   * ```js
   * const db = new Database();
   * const jsonML = await db.runServiceTests(
   *   "/my-foxx",
   *   { reporter: "xunit" }
   * );
   * ```
   */
  runServiceTests(
    mount: string,
    options: {
      reporter: "xunit";
      /**
       * Whether the reporter should use "idiomatic" mode. If set to `true`,
       * the results will be returned as a formatted string.
       */
      idiomatic?: false;
      /**
       * If set, only tests with full names including this exact string will be
       * executed.
       */
      filter?: string;
    }
  ): Promise<services.ServiceTestXunitReport>;
  /**
   * Runs the tests of a given service and returns the results as a string
   * using the "stream" reporter in "idiomatic" mode, which represents the
   * results as a line-delimited JSON stream of tuples representing events.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param options - Options for running the tests.
   *
   * @example
   * ```js
   * const db = new Database();
   * const streamReport = await db.runServiceTests(
   *   "/my-foxx",
   *   { reporter: "stream", idiomatic: true }
   * );
   * ```
   */
  runServiceTests(
    mount: string,
    options: {
      reporter: "stream";
      /**
       * Whether the reporter should use "idiomatic" mode. If set to `false`,
       * the results will be returned as an array of tuples instead of a
       * string.
       */
      idiomatic: true;
      /**
       * If set, only tests with full names including this exact string will be
       * executed.
       */
      filter?: string;
    }
  ): Promise<string>;
  /**
   * Runs the tests of a given service and returns the results as a string
   * using the "tap" reporter in "idiomatic" mode, which represents the
   * results using the "tap" format.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param options - Options for running the tests.
   *
   * @example
   * ```js
   * const db = new Database();
   * const tapReport = await db.runServiceTests(
   *   "/my-foxx",
   *   { reporter: "tap", idiomatic: true }
   * );
   * ```
   */
  runServiceTests(
    mount: string,
    options: {
      reporter: "tap";
      /**
       * Whether the reporter should use "idiomatic" mode. If set to `false`,
       * the results will be returned as an array of strings instead of a
       * single string.
       */
      idiomatic: true;
      /**
       * If set, only tests with full names including this exact string will be
       * executed.
       */
      filter?: string;
    }
  ): Promise<string>;
  /**
   * Runs the tests of a given service and returns the results as a string
   * using the "xunit" reporter in "idiomatic" mode, which represents the
   * results as an XML document.
   *
   * @param mount - The service's mount point, relative to the database.
   * @param options - Options for running the tests.
   *
   * @example
   * ```js
   * const db = new Database();
   * const xml = await db.runServiceTests(
   *   "/my-foxx",
   *   { reporter: "xunit", idiomatic: true }
   * );
   * ```
   */
  runServiceTests(
    mount: string,
    options: {
      reporter: "xunit";
      /**
       * Whether the reporter should use "idiomatic" mode. If set to `false`,
       * the results will be returned using the JSONML exchange format
       * instead of a string.
       */
      idiomatic: true;
      /**
       * If set, only tests with full names including this exact string will be
       * executed.
       */
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
    return this.request({
      method: "POST",
      pathname: "/_api/foxx/tests",
      search: {
        ...options,
        mount,
      },
    });
  }

  /**
   * Retrieves the text content of the service's `README` or `README.md` file.
   *
   * Returns `undefined` if no such file could be found.
   *
   * @param mount - The service's mount point, relative to the database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const readme = await db.getServiceReadme("/my-service");
   * if (readme !== undefined) console.log(readme);
   * else console.warn(`No README found.`)
   * ```
   */
  getServiceReadme(mount: string): Promise<string | undefined> {
    return this.request({
      pathname: "/_api/foxx/readme",
      search: { mount },
    });
  }

  /**
   * Retrieves an Open API compatible Swagger API description object for the
   * service installed at the given mount point.
   *
   * @param mount - The service's mount point, relative to the database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const spec = await db.getServiceDocumentation("/my-service");
   * // spec is a Swagger API description of the service
   * ```
   */
  getServiceDocumentation(mount: string): Promise<services.SwaggerJson> {
    return this.request({
      pathname: "/_api/foxx/swagger",
      search: { mount },
    });
  }

  /**
   * Retrieves a zip bundle containing the service files.
   *
   * Returns a `Buffer` in node.js or `Blob` in the browser.
   *
   * @param mount - The service's mount point, relative to the database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const serviceBundle = await db.downloadService("/my-foxx");
   * ```
   */
  downloadService(mount: string): Promise<Buffer | Blob> {
    return this.request({
      method: "POST",
      pathname: "/_api/foxx/download",
      search: { mount },
      expectBinary: true,
    });
  }

  /**
   * Writes all locally available services to the database and updates any
   * service bundles missing in the database.
   *
   * @param replace - If set to `true`, outdated services will also be
   * committed. This can be used to solve some consistency problems when
   * service bundles are missing in the database or were deleted manually.
   *
   * @example
   * ```js
   * await db.commitLocalServiceState();
   * // all services available on the coordinator have been written to the db
   * ```
   *
   * @example
   * ```js
   * await db.commitLocalServiceState(true);
   * // all service conflicts have been resolved in favor of this coordinator
   * ```
   */
  commitLocalServiceState(replace: boolean = false): Promise<void> {
    return this.request(
      {
        method: "POST",
        pathname: "/_api/foxx/commit",
        search: { replace },
      },
      () => undefined
    );
  }
  //#endregion
  //#region hot backups
  /**
   * (Enterprise Edition only.) Creates a hot backup of the entire ArangoDB
   * deployment including all databases, collections, etc.
   *
   * Returns an object describing the backup result.
   *
   * @param options - Options for creating the backup.
   *
   * @example
   * ```js
   * const info = await db.createHotBackup();
   * // a hot backup has been created
   * ```
   */
  createHotBackup(
    options: hotBackups.HotBackupOptions = {}
  ): Promise<hotBackups.HotBackupResult> {
    return this.request(
      {
        method: "POST",
        pathname: "/_admin/backup/create",
        body: options,
      },
      (res) => res.parsedBody.result
    );
  }

  /**
   * (Enterprise Edition only.) Retrieves a list of all locally found hot
   * backups.
   *
   * @param id - If specified, only the backup with the given ID will be
   * returned.
   *
   * @example
   * ```js
   * const backups = await db.getHotBackups();
   * for (const backup of backups.list) {
   *   console.log(backup.id);
   * }
   * ```
   */
  getHotBackups(id?: string | string[]): Promise<hotBackups.HotBackupList> {
    return this.request(
      {
        method: "POST",
        pathname: "/_admin/backup/list",
        body: id ? { id } : undefined,
      },
      (res) => res.parsedBody.result
    );
  }

  /**
   * (Enteprise Edition only.) Restores a consistent local hot backup.
   *
   * Returns the directory path of the restored backup.
   *
   * @param id - The ID of the backup to restore.
   *
   * @example
   * ```js
   * await db.restoreHotBackup("2023-09-19T15.38.21Z_example");
   * // the backup has been restored
   * ```
   */
  restoreHotBackup(id: string): Promise<string> {
    return this.request(
      {
        method: "POST",
        pathname: "/_admin/backup/restore",
        body: { id },
      },
      (res) => res.parsedBody.result.previous
    );
  }

  /**
   * (Enterprise Edition only.) Deletes a local hot backup.
   *
   * @param id - The ID of the backup to delete.
   *
   * @example
   * ```js
   * await db.deleteHotBackup("2023-09-19T15.38.21Z_example");
   * // the backup has been deleted
   * ```
   */
  deleteHotBackup(id: string): Promise<void> {
    return this.request(
      {
        method: "POST",
        pathname: "/_admin/backup/delete",
        body: { id },
      },
      () => undefined
    );
  }
  //#endregion
  //#region logs
  /**
   * Retrieves the log messages from the server's global log.
   *
   * @param options - Options for retrieving the log entries.
   *
   * @example
   * ```js
   * const log = await db.getLogEntries();
   * for (let i = 0; i < log.totalAmount; i++) {
   *   console.log(`${
   *     new Date(log.timestamp[i] * 1000).toISOString()
   *   } - [${LogLevel[log.level[i]]}] ${log.text[i]} (#${log.lid[i]})`);
   * }
   * ```
   */
  getLogEntries(options?: logs.LogEntriesOptions): Promise<logs.LogEntries> {
    return this.request(
      {
        pathname: "/_admin/log/entries",
        search: options,
      },
      (res) => res.parsedBody
    );
  }

  /**
   * Retrieves the log messages from the server's global log.
   *
   * @param options - Options for retrieving the log entries.
   *
   * @deprecated This endpoint has been deprecated in ArangoDB 3.8.
   * Use {@link Database#getLogEntries} instead.
   *
   * @example
   * ```js
   * const messages = await db.listLogMessages();
   * for (const m of messages) {
   *   console.log(`${m.date} - [${m.level}] ${m.message} (#${m.id})`);
   * }
   * ```
   */
  listLogMessages(
    options?: logs.LogEntriesOptions
  ): Promise<logs.LogMessage[]> {
    return this.request(
      {
        pathname: "/_admin/log",
        search: options,
      },
      (res) => res.parsedBody.messages
    );
  }

  /**
   * Retrieves the server's current log level for each topic.
   *
   * @example
   * ```js
   * const levels = await db.getLogLevel();
   * console.log(levels.request); // log level for incoming requests
   * ```
   */
  getLogLevel(): Promise<Record<string, logs.LogLevelSetting>> {
    return this.request({
      pathname: "/_admin/log/level",
    });
  }

  /**
   * Sets the server's log level for each of the given topics to the given level.
   *
   * Any omitted topics will be left unchanged.
   *
   * @param levels - An object mapping topic names to log levels.
   *
   * @example
   * ```js
   * await db.setLogLevel({ request: "debug" });
   * // Debug information will now be logged for each request
   * ```
   */
  setLogLevel(
    levels: Record<string, logs.LogLevelSetting>
  ): Promise<Record<string, logs.LogLevelSetting>> {
    return this.request({
      method: "PUT",
      pathname: "/_admin/log/level",
      body: levels,
    });
  }
  //#endregion
  //#region async jobs

  /**
   * Creates an async job by executing the given callback function. The first
   * database request performed by the callback will be marked for asynchronous
   * execution and its result will be made available as an async job.
   *
   * Returns a {@link jobs.Job} instance that can be used to retrieve the result
   * of the callback function once the request has been executed.
   *
   * @param callback - Callback function to execute as an async job.
   *
   * @example
   * ```js
   * const db = new Database();
   * const job = await db.createJob(() => db.collections());
   * while (!job.isLoaded) {
   *  await timeout(1000);
   *  await job.load();
   * }
   * // job.result is a list of Collection instances
   * ```
   */
  async createJob<T>(callback: () => Promise<T>): Promise<jobs.Job<T>> {
    const trap = new Promise<TrappedError | TrappedRequest<T>>(
      (resolveTrap) => {
        this._trapRequest = (trapped) => resolveTrap(trapped);
      }
    );
    const eventualResult = callback();
    const trapped = await trap;
    if (trapped.error) return eventualResult as Promise<any>;
    const { jobId, onResolve, onReject } = trapped;
    return new jobs.Job(
      this,
      jobId,
      (res) => {
        onResolve(res);
        return eventualResult;
      },
      (e) => {
        onReject(e);
        return eventualResult;
      }
    );
  }

  /**
   * Returns a {@link jobs.Job} instance for the given `jobId`.
   *
   * @param jobId - ID of the async job.
   *
   * @example
   * ```js
   * const db = new Database();
   * const job = db.job("12345");
   * ```
   */
  job(jobId: string): jobs.Job {
    return new jobs.Job(this, jobId);
  }

  /**
   * Returns a list of the IDs of all currently pending async jobs.
   *
   * @example
   * ```js
   * const db = new Database();
   * const pendingJobs = await db.listPendingJobs();
   * console.log(pendingJobs); // e.g. ["12345", "67890"]
   * ```
   */
  listPendingJobs(): Promise<string[]> {
    return this.request(
      {
        pathname: "/_api/job/pending",
      },
      (res) => res.parsedBody
    );
  }

  /**
   * Returns a list of the IDs of all currently available completed async jobs.
   *
   * @example
   * ```js
   * const db = new Database();
   * const completedJobs = await db.listCompletedJobs();
   * console.log(completedJobs); // e.g. ["12345", "67890"]
   * ```
   */
  listCompletedJobs(): Promise<string[]> {
    return this.request(
      {
        pathname: "/_api/job/done",
      },
      (res) => res.parsedBody
    );
  }

  /**
   * Deletes the results of all completed async jobs created before the given
   * threshold.
   *
   * @param threshold - The expiration timestamp in milliseconds.
   *
   * @example
   * ```js
   * const db = new Database();
   * const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
   * await db.deleteExpiredJobResults(Date.now() - ONE_WEEK);
   * // all job results older than a week have been deleted
   * ```
   */
  deleteExpiredJobResults(threshold: number): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        pathname: `/_api/job/expired`,
        search: { stamp: threshold / 1000 },
      },
      () => undefined
    );
  }

  /**
   * Deletes the results of all completed async jobs.
   */
  deleteAllJobResults(): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        pathname: `/_api/job/all`,
      },
      () => undefined
    );
  }
  //#endregion
}
//#endregion
