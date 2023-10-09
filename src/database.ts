/**
 * ```js
 * import { Database } from "arangojs/database";
 * ```
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
  collectionToString,
  CollectionType,
  CreateCollectionOptions,
  DocumentCollection,
  EdgeCollection,
  isArangoCollection,
} from "./collection";
import {
  ArangoApiResponse,
  Config,
  Connection,
  Headers,
  RequestOptions,
} from "./connection";
import { ArrayCursor, BatchedArrayCursor } from "./cursor";
import { isArangoError } from "./error";
import { FoxxManifest } from "./foxx-manifest";
import {
  CreateGraphOptions,
  EdgeDefinitionOptions,
  Graph,
  GraphInfo,
} from "./graph";
import { Job } from "./job";
import { Blob } from "./lib/blob";
import { DATABASE_NOT_FOUND } from "./lib/codes";
import { toForm } from "./lib/multipart";
import { ArangojsResponse } from "./lib/request";
import { Route } from "./route";
import { Transaction } from "./transaction";
import { CreateViewOptions, View, ViewDescription } from "./view";

/**
 * Indicates whether the given value represents a {@link Database}.
 *
 * @param database - A value that might be a database.
 */
export function isArangoDatabase(database: any): database is Database {
  return Boolean(database && database.isArangoDatabase);
}

/**
 * @internal
 */
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
    return { write: collections.map(collectionToString) };
  }
  if (isArangoCollection(collections)) {
    return { write: collectionToString(collections) };
  }
  const cols: CoercedTransactionCollections = {};
  if (collections) {
    if (collections.allowImplicit !== undefined) {
      cols.allowImplicit = collections.allowImplicit;
    }
    if (collections.read) {
      cols.read = Array.isArray(collections.read)
        ? collections.read.map(collectionToString)
        : collectionToString(collections.read);
    }
    if (collections.write) {
      cols.write = Array.isArray(collections.write)
        ? collections.write.map(collectionToString)
        : collectionToString(collections.write);
    }
    if (collections.exclusive) {
      cols.exclusive = Array.isArray(collections.exclusive)
        ? collections.exclusive.map(collectionToString)
        : collectionToString(collections.exclusive);
    }
  }
  return cols;
}

/**
 * @internal
 */
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
   * If set to `true`, the request will explicitly permit ArangoDB to return a
   * potentially dirty or stale result and arangojs will load balance the
   * request without distinguishing between leaders and followers.
   */
  allowDirtyRead?: boolean;
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
};

/**
 * Options for executing a query.
 *
 * See {@link Database#query}.
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
   * If set to `true`, cursor results will be stored by ArangoDB in such a way
   * that batch reads can be retried in the case of a communication error.
   *
   * Default: `false`
   */
  allowRetry?: boolean;
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
   * If set to a positive number, the query will automatically be retried at
   * most this many times if it results in a write-write conflict.
   *
   * Default: `0`
   */
  retryOnConflict?: number;
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
   * Number of result values to be transferred by the server in each
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
   * Maximum memory size in bytes that the query is allowed to use.
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
   * Time-to-live for the cursor in seconds. The cursor results may be
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
   * If set to `false`, the query data will not be stored in the RocksDB block
   * cache. This can be used to avoid thrashing he block cache when reading a
   * lot of data.
   */
  fillBlockCache?: boolean;
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
   * Controls after how many execution nodes in a query a stack split should be
   * performed.
   *
   * Default: `250` (`200` on macOS)
   */
  maxNodesPerCallstack?: number;
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
   * inaccessible to current user will result in an access error instead
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
 * Options for explaining a query.
 *
 * See {@link Database#explain}.
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
 * Details for a transaction.
 *
 * See also {@link transaction.TransactionStatus}.
 */
export type TransactionDetails = {
  /**
   * Unique identifier of the transaction.
   */
  id: string;
  /**
   * Status (or "state") of the transaction.
   */
  state: "running" | "committed" | "aborted";
};

/**
 * Plan explaining query execution.
 */
export type ExplainPlan = {
  /**
   * Execution nodes in this plan.
   */
  nodes: {
    [key: string]: any;
    type: string;
    id: number;
    dependencies: number[];
    estimatedCost: number;
    estimatedNrItems: number;
  }[];
  /**
   * Rules applied by the optimizer.
   */
  rules: string[];
  /**
   * Information about collections involved in the query.
   */
  collections: {
    name: string;
    type: "read" | "write";
  }[];
  /**
   * Variables used in the query.
   */
  variables: {
    id: number;
    name: string;
  }[];
  /**
   * Total estimated cost of the plan.
   */
  estimatedCost: number;
  /**
   * Estimated number of items returned by the query.
   */
  estimatedNrItems: number;
  /**
   * Whether the query is a data modification query.
   */
  isModificationQuery: boolean;
};

/**
 * Optimizer statistics for an explained query.
 */
export type ExplainStats = {
  /**
   * Total number of rules executed for this query.
   */
  rulesExecuted: number;
  /**
   * Number of rules skipped for this query.
   */
  rulesSkipped: number;
  /**
   * Total number of plans created.
   */
  plansCreated: number;
  /**
   * Maximum memory usage in bytes of the query during explain.
   */
  peakMemoryUsage: number;
  /**
   * Time in seconds needed to explain the query.
   */
  executionTime: number;
};

/**
 * Result of explaining a query with a single plan.
 */
export type SingleExplainResult = {
  /**
   * Query plan.
   */
  plan: ExplainPlan;
  /**
   * Whether it would be possible to cache the query.
   */
  cacheable: boolean;
  /**
   * Warnings encountered while planning the query execution.
   */
  warnings: { code: number; message: string }[];
  /**
   * Optimizer statistics for the explained query.
   */
  stats: ExplainStats;
};

/**
 * Result of explaining a query with multiple plans.
 */
export type MultiExplainResult = {
  /**
   * Query plans.
   */
  plans: ExplainPlan[];
  /**
   * Whether it would be possible to cache the query.
   */
  cacheable: boolean;
  /**
   * Warnings encountered while planning the query execution.
   */
  warnings: { code: number; message: string }[];
  /**
   * Optimizer statistics for the explained query.
   */
  stats: ExplainStats;
};

/**
 * Node in an AQL abstract syntax tree (AST).
 */
export type AstNode = {
  [key: string]: any;
  type: string;
  subNodes: AstNode[];
};

/**
 * Result of parsing a query.
 */
export type ParseResult = {
  /**
   * Whether the query was parsed.
   */
  parsed: boolean;
  /**
   * Names of all collections involved in the query.
   */
  collections: string[];
  /**
   * Names of all bind parameters used in the query.
   */
  bindVars: string[];
  /**
   * Abstract syntax tree (AST) of the query.
   */
  ast: AstNode[];
};

/**
 * Optimizer rule for AQL queries.
 */
export type QueryOptimizerRule = {
  name: string;
  flags: {
    hidden: boolean;
    clusterOnly: boolean;
    canBeDisabled: boolean;
    canCreateAdditionalPlans: boolean;
    disabledByDefault: boolean;
    enterpriseOnly: boolean;
  };
};

/**
 * Information about query tracking.
 */
export type QueryTracking = {
  /**
   * Whether query tracking is enabled.
   */
  enabled: boolean;
  /**
   * Maximum query string length in bytes that is kept in the list.
   */
  maxQueryStringLength: number;
  /**
   * Maximum number of slow queries that is kept in the list.
   */
  maxSlowQueries: number;
  /**
   * Threshold execution time in seconds for when a query is
   * considered slow.
   */
  slowQueryThreshold: number;
  /**
   * Whether bind parameters are being tracked along with queries.
   */
  trackBindVars: boolean;
  /**
   * Whether slow queries are being tracked.
   */
  trackSlowQueries: boolean;
};

/**
 * Options for query tracking.
 *
 * See {@link Database#queryTracking}.
 */
export type QueryTrackingOptions = {
  /**
   * If set to `false`, neither queries nor slow queries will be tracked.
   */
  enabled?: boolean;
  /**
   * Maximum query string length in bytes that will be kept in the list.
   */
  maxQueryStringLength?: number;
  /**
   * Maximum number of slow queries to be kept in the list.
   */
  maxSlowQueries?: number;
  /**
   * Threshold execution time in seconds for when a query will be
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
 * Object describing a query.
 */
export type QueryInfo = {
  /**
   * Unique identifier for this query.
   */
  id: string;
  /**
   * Name of the database the query runs in.
   */
  database: string;
  /**
   * Name of the user that started the query.
   */
  user: string;
  /**
   * Query string (potentially truncated).
   */
  query: string;
  /**
   * Bind parameters used in the query.
   */
  bindVars: Record<string, any>;
  /**
   * Date and time the query was started.
   */
  started: string;
  /**
   * Query's running time in seconds.
   */
  runTime: number;
  /**
   * Maximum memory usage in bytes of the query.
   */
  peakMemoryUsage: number;
  /**
   * Query's current execution state.
   */
  state: "executing" | "finished" | "killed";
  /**
   * Whether the query uses a streaming cursor.
   */
  stream: boolean;
};

/**
 * Information about a cluster imbalance.
 */
export type ClusterImbalanceInfo = {
  /**
   * Information about the leader imbalance.
   */
  leader: {
    /**
     * The weight of leader shards per DB-Server. A leader has a weight of 1 by default but it is higher if collections can only be moved together because of `distributeShardsLike`.
     */
    weightUsed: number[];
    /**
     * The ideal weight of leader shards per DB-Server.
     */
    targetWeight: number[];
    /**
     * The number of leader shards per DB-Server.
     */
    numberShards: number[];
    /**
     * The measure of the leader shard distribution. The higher the number, the worse the distribution.
     */
    leaderDupl: number[];
    /**
     * The sum of all weights.
     */
    totalWeight: number;
    /**
     * The measure of the total imbalance. A high value indicates a high imbalance.
     */
    imbalance: number;
    /**
     * The sum of shards, counting leader shards only.
     */
    totalShards: number;
  };
  /**
   * Information about the shard imbalance.
   */
  shards: {
    /**
     * The size of shards per DB-Server.
     */
    sizeUsed: number[];
    /**
     * The ideal size of shards per DB-Server.
     */
    targetSize: number[];
    /**
     * The number of leader and follower shards per DB-Server.
     */
    numberShards: number[];
    /**
     * The sum of the sizes.
     */
    totalUsed: number;
    /**
     * The sum of shards, counting leader and follower shards.
     */
    totalShards: number;
    /**
     * The sum of system collection shards, counting leader shards only.
     */
    totalShardsFromSystemCollections: number;
    /**
     * The measure of the total imbalance. A high value indicates a high imbalance.
     */
    imbalance: number;
  };
};

/**
 * Information about the current state of the cluster imbalance.
 */
export type ClusterRebalanceState = ClusterImbalanceInfo & {
  /**
   * The number of pending move shard operations.
   */
  pendingMoveShards: number;
  /**
   * The number of planned move shard operations.
   */
  todoMoveShards: number;
};

/**
 * Options for rebalancing the cluster.
 */
export type ClusterRebalanceOptions = {
  /**
   * Maximum number of moves to be computed.
   *
   * Default: `1000`
   */
  maximumNumberOfMoves?: number;
  /**
   * Allow leader changes without moving data.
   *
   * Default: `true`
   */
  leaderChanges?: boolean;
  /**
   * Allow moving leaders.
   *
   * Default: `false`
   */
  moveLeaders?: boolean;
  /**
   * Allow moving followers.
   *
   * Default: `false`
   */
  moveFollowers?: boolean;
  /**
   * Ignore system collections in the rebalance plan.
   *
   * Default: `false`
   */
  excludeSystemCollections?: boolean;
  /**
   * Default: `256**6`
   */
  piFactor?: number;
  /**
   * A list of database names to exclude from the analysis.
   *
   * Default: `[]`
   */
  databasesExcluded?: string[];
};

export type ClusterRebalanceMove = {
  /**
   * The server name from which to move.
   */
  from: string;
  /**
   * The ID of the destination server.
   */
  to: string;
  /**
   * Shard ID of the shard to be moved.
   */
  shard: string;
  /**
   * Collection ID of the collection the shard belongs to.
   */
  collection: number;
  /**
   * True if this is a leader move shard operation.
   */
  isLeader: boolean;
};

export type ClusterRebalanceResult = {
  /**
   * Imbalance before the suggested move shard operations are applied.
   */
  imbalanceBefore: ClusterImbalanceInfo;
  /**
   * Expected imbalance after the suggested move shard operations are applied.
   */
  imbalanceAfter: ClusterImbalanceInfo;
  /**
   * Suggested move shard operations.
   */
  moves: ClusterRebalanceMove[];
};

/**
 * Database user to create with a database.
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
  extra?: Record<string, any>;
};

/**
 * Options for creating a database.
 *
 * See {@link Database#createDatabase}.
 */
export type CreateDatabaseOptions = {
  /**
   * Database users to create with the database.
   */
  users?: CreateDatabaseUser[];
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

/**
 * Object describing a database.
 *
 * See {@link Database#get}.
 */
export type DatabaseInfo = {
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

/**
 * Result of retrieving database version information.
 */
export type VersionInfo = {
  /**
   * Value identifying the server type, i.e. `"arango"`.
   */
  server: string;
  /**
   * ArangoDB license type or "edition".
   */
  license: "community" | "enterprise";
  /**
   * ArangoDB server version.
   */
  version: string;
  /**
   * Additional information about the ArangoDB server.
   */
  details?: { [key: string]: string };
};

/**
 * Definition of an AQL User Function.
 */
export type AqlUserFunction = {
  /**
   * Name of the AQL User Function.
   */
  name: string;
  /**
   * Implementation of the AQL User Function.
   */
  code: string;
  /**
   * Whether the function is deterministic.
   *
   * See {@link Database#createFunction}.
   */
  isDeterministic: boolean;
};

/**
 * Options for installing the service.
 *
 * See {@link Database#installService}.
 */
export type InstallServiceOptions = {
  /**
   * An object mapping configuration option names to values.
   *
   * See also {@link Database#getServiceConfiguration}.
   */
  configuration?: Record<string, any>;
  /**
   * An object mapping dependency aliases to mount points.
   *
   * See also {@link Database#getServiceDependencies}.
   */
  dependencies?: Record<string, string>;
  /**
   * Whether the service should be installed in development mode.
   *
   * See also {@link Database#setServiceDevelopmentMode}.
   *
   * Default: `false`
   */
  development?: boolean;
  /**
   * Whether the service should be installed in legacy compatibility mode
   *
   * This overrides the `engines` option in the service manifest (if any).
   *
   * Default: `false`
   */
  legacy?: boolean;
  /**
   * Whether the "setup" script should be executed.
   *
   * Default: `true`
   */
  setup?: boolean;
};

/**
 * Options for replacing a service.
 *
 * See {@link Database#replaceService}.
 */
export type ReplaceServiceOptions = {
  /**
   * An object mapping configuration option names to values.
   *
   * See also {@link Database#getServiceConfiguration}.
   */
  configuration?: Record<string, any>;
  /**
   * An object mapping dependency aliases to mount points.
   *
   * See also {@link Database#getServiceDependencies}.
   */
  dependencies?: Record<string, string>;
  /**
   * Whether the service should be installed in development mode.
   *
   * See also {@link Database#setServiceDevelopmentMode}.
   *
   * Default: `false`
   */
  development?: boolean;
  /**
   * Whether the service should be installed in legacy compatibility mode
   *
   * This overrides the `engines` option in the service manifest (if any).
   *
   * Default: `false`
   */
  legacy?: boolean;
  /**
   * Whether the "setup" script should be executed.
   *
   * Default: `true`
   */
  setup?: boolean;
  /**
   * Whether the existing service's "teardown" script should be executed
   * prior to removing that service.
   *
   * Default: `true`
   */
  teardown?: boolean;
  /**
   * If set to `true`, replacing a service that does not already exist will
   * fall back to installing the new service.
   *
   * Default: `false`
   */
  force?: boolean;
};

/**
 * Options for upgrading a service.
 *
 * See {@link Database#upgradeService}.
 */
export type UpgradeServiceOptions = {
  /**
   * An object mapping configuration option names to values.
   *
   * See also {@link Database#getServiceConfiguration}.
   */
  configuration?: Record<string, any>;
  /**
   * An object mapping dependency aliases to mount points.
   *
   * See also {@link Database#getServiceDependencies}.
   */
  dependencies?: Record<string, string>;
  /**
   * Whether the service should be installed in development mode.
   *
   * See also {@link Database#setServiceDevelopmentMode}.
   *
   * Default: `false`
   */
  development?: boolean;
  /**
   * Whether the service should be installed in legacy compatibility mode
   *
   * This overrides the `engines` option in the service manifest (if any).
   *
   * Default: `false`
   */
  legacy?: boolean;
  /**
   * Whether the "setup" script should be executed.
   *
   * Default: `true`
   */
  setup?: boolean;
  /**
   * Whether the existing service's "teardown" script should be executed
   * prior to upgrading that service.
   *
   * Default: `false`
   */
  teardown?: boolean;
  /**
   * Unless set to `true`, upgrading a service that does not already exist will
   * fall back to installing the new service.
   *
   * Default: `false`
   */
  force?: boolean;
};

/**
 * Options for uninstalling a service.
 *
 * See {@link Database#uninstallService}.
 */
export type UninstallServiceOptions = {
  /**
   * Whether the service's "teardown" script should be executed
   * prior to removing that service.
   *
   * Default: `true`
   */
  teardown?: boolean;
  /**
   * If set to `true`, uninstalling a service that does not already exist
   * will be considered successful.
   *
   * Default: `false`
   */
  force?: boolean;
};

/**
 * Object briefly describing a Foxx service.
 */
export type ServiceSummary = {
  /**
   * Service mount point, relative to the database.
   */
  mount: string;
  /**
   * Name defined in the service manifest.
   */
  name?: string;
  /**
   * Version defined in the service manifest.
   */
  version?: string;
  /**
   * Service dependencies the service expects to be able to match as a mapping
   * from dependency names to versions the service is compatible with.
   */
  provides: Record<string, string>;
  /**
   * Whether development mode is enabled for this service.
   */
  development: boolean;
  /**
   * Whether the service is running in legacy compatibility mode.
   */
  legacy: boolean;
};

/**
 * Object describing a Foxx service in detail.
 */
export type ServiceInfo = {
  /**
   * Service mount point, relative to the database.
   */
  mount: string;
  /**
   * File system path of the service.
   */
  path: string;
  /**
   * Name defined in the service manifest.
   */
  name?: string;
  /**
   * Version defined in the service manifest.
   */
  version?: string;
  /**
   * Whether development mode is enabled for this service.
   */
  development: boolean;
  /**
   * Whether the service is running in legacy compatibility mode.
   */
  legacy: boolean;
  /**
   * Content of the service manifest of this service.
   */
  manifest: FoxxManifest;
  /**
   * Internal checksum of the service's initial source bundle.
   */
  checksum: string;
  /**
   * Options for this service.
   */
  options: {
    /**
     * Configuration values set for this service.
     */
    configuration: Record<string, any>;
    /**
     * Service dependency configuration of this service.
     */
    dependencies: Record<string, string>;
  };
};

/**
 * Object describing a configuration option of a Foxx service.
 */
export type ServiceConfiguration = {
  /**
   * Data type of the configuration value.
   *
   * **Note**: `"int"` and `"bool"` are historical synonyms for `"integer"` and
   * `"boolean"`. The `"password"` type is synonymous with `"string"` but can
   * be used to distinguish values which should not be displayed in plain text
   * by software when managing the service.
   */
  type:
    | "integer"
    | "boolean"
    | "string"
    | "number"
    | "json"
    | "password"
    | "int"
    | "bool";
  /**
   * Current value of the configuration option as stored internally.
   */
  currentRaw: any;
  /**
   * Processed current value of the configuration option as exposed in the
   * service code.
   */
  current: any;
  /**
   * Formatted name of the configuration option.
   */
  title: string;
  /**
   * Human-readable description of the configuration option.
   */
  description?: string;
  /**
   * Whether the configuration option must be set in order for the service
   * to be operational.
   */
  required: boolean;
  /**
   * Default value of the configuration option.
   */
  default?: any;
};

/**
 * Object describing a single-service dependency defined by a Foxx service.
 */
export type SingleServiceDependency = {
  /**
   * Whether this is a multi-service dependency.
   */
  multiple: false;
  /**
   * Current mount point the dependency is resolved to.
   */
  current?: string;
  /**
   * Formatted name of the dependency.
   */
  title: string;
  /**
   * Name of the service the dependency expects to match.
   */
  name: string;
  /**
   * Version of the service the dependency expects to match.
   */
  version: string;
  /**
   * Human-readable description of the dependency.
   */
  description?: string;
  /**
   * Whether the dependency must be matched in order for the service
   * to be operational.
   */
  required: boolean;
};

/**
 * Object describing a multi-service dependency defined by a Foxx service.
 */
export type MultiServiceDependency = {
  /**
   * Whether this is a multi-service dependency.
   */
  multiple: true;
  /**
   * Current mount points the dependency is resolved to.
   */
  current?: string[];
  /**
   * Formatted name of the dependency.
   */
  title: string;
  /**
   * Name of the service the dependency expects to match.
   */
  name: string;
  /**
   * Version of the service the dependency expects to match.
   */
  version: string;
  /**
   * Human-readable description of the dependency.
   */
  description?: string;
  /**
   * Whether the dependency must be matched in order for the service
   * to be operational.
   */
  required: boolean;
};

/**
 * Test stats for a Foxx service's tests.
 */
export type ServiceTestStats = {
  /**
   * Total number of tests found.
   */
  tests: number;
  /**
   * Number of tests that ran successfully.
   */
  passes: number;
  /**
   * Number of tests that failed.
   */
  failures: number;
  /**
   * Number of tests skipped or not executed.
   */
  pending: number;
  /**
   * Total test duration in milliseconds.
   */
  duration: number;
};

/**
 * Test results for a single test case using the stream reporter.
 */
export type ServiceTestStreamTest = {
  title: string;
  fullTitle: string;
  duration: number;
  err?: string;
};

/**
 * Test results for a Foxx service's tests using the stream reporter.
 */
export type ServiceTestStreamReport = (
  | ["start", { total: number }]
  | ["pass", ServiceTestStreamTest]
  | ["fail", ServiceTestStreamTest]
  | ["end", ServiceTestStats]
)[];

/**
 * Test results for a single test case using the suite reporter.
 */
export type ServiceTestSuiteTest = {
  result: "pending" | "pass" | "fail";
  title: string;
  duration: number;
  err?: any;
};

/**
 * Test results for a single test suite using the suite reporter.
 */
export type ServiceTestSuite = {
  title: string;
  suites: ServiceTestSuite[];
  tests: ServiceTestSuiteTest[];
};

/**
 * Test results for a Foxx service's tests using the suite reporter.
 */
export type ServiceTestSuiteReport = {
  stats: ServiceTestStats;
  suites: ServiceTestSuite[];
  tests: ServiceTestSuiteTest[];
};

/**
 * Test results for a single test case in XUnit format using the JSONML
 * representation.
 */
export type ServiceTestXunitTest =
  | ["testcase", { classname: string; name: string; time: number }]
  | [
      "testcase",
      { classname: string; name: string; time: number },
      ["failure", { message: string; type: string }, string]
    ];

/**
 * Test results for a Foxx service's tests in XUnit format using the JSONML
 * representation.
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
 * Test results for a Foxx service's tests in TAP format.
 */
export type ServiceTestTapReport = string[];

/**
 * Test results for a single test case using the default reporter.
 */
export type ServiceTestDefaultTest = {
  title: string;
  fullTitle: string;
  duration: number;
  err?: string;
};

/**
 * Test results for a Foxx service's tests using the default reporter.
 */
export type ServiceTestDefaultReport = {
  stats: ServiceTestStats;
  tests: ServiceTestDefaultTest[];
  pending: ServiceTestDefaultTest[];
  failures: ServiceTestDefaultTest[];
  passes: ServiceTestDefaultTest[];
};

/**
 * OpenAPI 2.0 description of a Foxx service.
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
 * Access level for an ArangoDB user's access to a collection or database.
 */
export type AccessLevel = "rw" | "ro" | "none";

/**
 * Properties of an ArangoDB user object.
 */
export type ArangoUser = {
  /**
   * ArangoDB username of the user.
   */
  user: string;
  /**
   * Whether the ArangoDB user account is enabled and can authenticate.
   */
  active: boolean;
  /**
   * Additional information to store about this user.
   */
  extra: Record<string, any>;
};

/**
 * Options for creating an ArangoDB user.
 */
export type CreateUserOptions = {
  /**
   * ArangoDB username of the user.
   */
  user: string;
  /**
   * Password the ArangoDB user will use for authentication.
   */
  passwd: string;
  /**
   * Whether the ArangoDB user account is enabled and can authenticate.
   *
   * Default: `true`
   */
  active?: boolean;
  /**
   * Additional information to store about this user.
   *
   * Default: `{}`
   */
  extra?: Record<string, any>;
};

/**
 * Options for modifying an ArangoDB user.
 */
export type UserOptions = {
  /**
   * Password the ArangoDB user will use for authentication.
   */
  passwd: string;
  /**
   * Whether the ArangoDB user account is enabled and can authenticate.
   *
   * Default: `true`
   */
  active?: boolean;
  /**
   * Additional information to store about this user.
   *
   * Default: `{}`
   */
  extra?: Record<string, any>;
};

/**
 * Options for accessing or manipulating access levels.
 */
export type UserAccessLevelOptions = {
  /**
   * The database to access or manipulate the access level of.
   *
   * If `collection` is an `ArangoCollection`, this option defaults to the
   * database the collection is contained in. Otherwise this option defaults to
   * the current database.
   */
  database?: Database | string;
  /**
   * The collection to access or manipulate the access level of.
   */
  collection?: ArangoCollection | string;
};

/**
 * An object providing methods for accessing queue time metrics of the most
 * recently received server responses if the server supports this feature.
 */
export type QueueTimeMetrics = {
  /**
   * Returns the queue time of the most recently received response in seconds.
   */
  getLatest: () => number | undefined;
  /**
   * Returns a list of the most recently received queue time values as tuples
   * of the timestamp of the response being processed in milliseconds and the
   * queue time in seconds.
   */
  getValues: () => [number, number][];
  /**
   * Returns the average queue time of the most recently received responses
   * in seconds.
   */
  getAvg: () => number;
};

/**
 * (Enterprise Edition only.) Options for creating a hot backup.
 */
export type HotBackupOptions = {
  /**
   * If set to `true` and no global transaction lock can be acquired within the
   * given timeout, a possibly inconsistent backup is taken.
   *
   * Default: `false`
   */
  allowInconsistent?: boolean;
  /**
   * (Enterprise Edition cluster only.) If set to `true` and no global
   * transaction lock can be acquired within the given timeout, all running
   * transactions are forcefully aborted to ensure that a consistent backup
   * can be created.
   *
   * Default: `false`.
   */
  force?: boolean;
  /**
   * Label to appended to the backup's identifier.
   *
   * Default: If omitted or empty, a UUID will be generated.
   */
  label?: string;
  /**
   * Time in seconds that the operation will attempt to get a consistent
   * snapshot.
   *
   * Default: `120`.
   */
  timeout?: number;
};

/**
 * (Enterprise Edition only.) Result of a hot backup.
 */
export type HotBackupResult = {
  id: string;
  potentiallyInconsistent: boolean;
  sizeInBytes: number;
  datetime: string;
  nrDBServers: number;
  nrFiles: number;
};

/**
 * (Enterprise Edition only.) List of known hot backups.
 */
export type HotBackupList = {
  server: string;
  list: Record<
    string,
    HotBackupResult & {
      version: string;
      keys: any[];
      available: boolean;
      nrPiecesPresent: number;
      countIncludesFilesOnly: boolean;
    }
  >;
};

/**
 * Numeric representation of the logging level of a log entry.
 */
export enum LogLevel {
  FATAL,
  ERROR,
  WARNING,
  INFO,
  DEBUG,
}

/**
 * String representation of the logging level of a log entry.
 */
export type LogLevelLabel = "FATAL" | "ERROR" | "WARNING" | "INFO" | "DEBUG";

/**
 * Logging level setting.
 */
export type LogLevelSetting = LogLevelLabel | "DEFAULT";

/**
 * Log sorting direction, ascending or descending.
 */
export type LogSortDirection = "asc" | "desc";

/**
 * Options for retrieving log entries.
 */
export type LogEntriesOptions = {
  /**
   * Maximum log level of the entries to retrieve.
   *
   * Default: `INFO`.
   */
  upto?: LogLevel | LogLevelLabel | Lowercase<LogLevelLabel>;
  /**
   * If set, only log entries with this log level will be returned.
   */
  level?: LogLevel | LogLevelLabel | Lowercase<LogLevelLabel>;
  /**
   * If set, only log entries with an `lid` greater than or equal to this value
   * will be returned.
   */
  start?: number;
  /**
   * If set, only this many entries will be returned.
   */
  size?: number;
  /**
   * If set, this many log entries will be skipped.
   */
  offset?: number;
  /**
   * If set, only log entries containing the specified text will be returned.
   */
  search?: string;
  /**
   * If set to `"desc"`, log entries will be returned in reverse chronological
   * order.
   *
   * Default: `"asc"`.
   */
  sort?: LogSortDirection;
};

/**
 * An object representing a single log entry.
 */
export type LogMessage = {
  id: number;
  topic: string;
  level: LogLevelLabel;
  date: string;
  message: string;
};

/**
 * An object representing a list of log entries.
 */
export type LogEntries = {
  totalAmount: number;
  lid: number[];
  topic: string[];
  level: LogLevel[];
  timestamp: number[];
  text: string[];
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
  constructor(config?: Config);
  /**
   * Creates a new `Database` instance with its own connection pool.
   *
   * See also {@link Database#database}.
   *
   * @param url - Base URL of the ArangoDB server or list of server URLs.
   * Equivalent to the `url` option in {@link connection.Config}.
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
    configOrDatabase: string | string[] | Config | Database = {},
    name?: string
  ) {
    if (isArangoDatabase(configOrDatabase)) {
      const connection = configOrDatabase._connection;
      const databaseName = (name || configOrDatabase.name).normalize("NFC");
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
      this._connection = new Connection(options);
      this._name = databaseName?.normalize("NFC") || "_system";
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
  version(details?: boolean): Promise<VersionInfo> {
    return this.request({
      method: "GET",
      path: "/_api/version",
      qs: { details },
    });
  }

  /**
   * Retrives the server's current system time in milliseconds with microsecond
   * precision.
   */
  time(): Promise<number> {
    return this.request(
      {
        path: "/_admin/time",
      },
      (res) => res.body.time * 1000
    );
  }

  /**
   * Returns a new {@link route.Route} instance for the given path (relative to the
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
   * If `absolutePath` is set to `true`, the database path will not be
   * automatically prepended to the `basePath`.
   *
   * @param T - Return type to use. Defaults to the response object type.
   * @param options - Options for this request.
   * @param transform - An optional function to transform the low-level
   * response object to a more useful return value.
   */
  request<T = any>(
    options: RequestOptions & { absolutePath?: boolean },
    transform?: (res: ArangojsResponse) => T
  ): Promise<T>;
  /**
   * @internal
   *
   * Performs an arbitrary HTTP request against the database.
   *
   * If `absolutePath` is set to `true`, the database path will not be
   * automatically prepended to the `basePath`.
   *
   * @param options - Options for this request.
   * @param transform - If set to `false`, the raw response object will be
   * returned.
   */
  request(
    options: RequestOptions & { absolutePath?: boolean },
    transform: false
  ): Promise<ArangojsResponse>;
  request<T = any>(
    {
      absolutePath = false,
      basePath,
      ...opts
    }: RequestOptions & { absolutePath?: boolean },
    transform: false | ((res: ArangojsResponse) => T) = (res) => res.body
  ): Promise<T> {
    if (!absolutePath) {
      basePath = `/_db/${encodeURIComponent(this._name)}${basePath || ""}`;
    }
    return this._connection.request(
      { basePath, ...opts },
      transform || undefined
    );
  }

  /**
   * Updates the URL list by requesting a list of all coordinators in the
   * cluster and adding any endpoints not initially specified in the
   * {@link connection.Config}.
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
      { path: "/_api/cluster/endpoints" },
      (res) => res.body.endpoints.map((endpoint: any) => endpoint.endpoint)
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
   * Attempts to initiate a clean shutdown of the server.
   */
  shutdown(): Promise<void> {
    return this.request(
      {
        method: "DELETE",
        path: "/_admin/shutdown",
      },
      () => undefined
    );
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
   *   { path: `/_api/analyzer/${encodeURIComponent(analyzer.name)}` },
   *   30000
   * );
   * // Analyzer has been propagated to all coordinators and can safely be used
   * ```
   *
   * @param request - Request to perform against each known coordinator.
   * @param timeout - Maximum number of milliseconds to wait for propagation.
   */
  async waitForPropagation(
    request: RequestOptions,
    timeout?: number
  ): Promise<void>;
  async waitForPropagation(
    { basePath, ...request }: RequestOptions,
    timeout?: number
  ): Promise<void> {
    await this._connection.waitForPropagation(
      {
        ...request,
        basePath: `/_db/${encodeURIComponent(this._name)}${basePath || ""}`,
      },
      timeout
    );
  }

  /**
   * Methods for accessing the server-reported queue times of the mostly
   * recently received responses.
   */
  get queueTime(): QueueTimeMetrics {
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
        path: "/_open/auth",
        body: { username, password },
      },
      (res) => {
        this.useBearerAuth(res.body.jwt);
        return res.body.jwt;
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
        path: "/_open/auth/renew",
      },
      (res) => {
        if (!res.body.jwt) return null;
        this.useBearerAuth(res.body.jwt);
        return res.body.jwt;
      }
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
  getClusterImbalance(): Promise<ClusterRebalanceState> {
    return this.request(
      { path: "/_admin/cluster/rebalance" },
      (res) => res.body.result
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
    opts: ClusterRebalanceOptions
  ): Promise<ClusterRebalanceResult> {
    return this.request(
      {
        method: "POST",
        path: "/_admin/cluster/rebalance",
        body: {
          version: 1,
          ...opts,
        },
      },
      (res) => res.body.result
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
  executeClusterRebalance(moves: ClusterRebalanceMove[]): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/_admin/cluster/rebalance/execute",
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
    opts: ClusterRebalanceOptions
  ): Promise<ClusterRebalanceResult> {
    return this.request({
      method: "PUT",
      path: "/_admin/cluster/rebalance",
      body: {
        version: 1,
        ...opts,
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
   * const myDb = system.database("my_database");
   * ```
   */
  database(databaseName: string) {
    return new Database(this as any, databaseName);
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
    } catch (err: any) {
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
    users: CreateDatabaseUser[]
  ): Promise<Database>;
  createDatabase(
    databaseName: string,
    usersOrOptions: CreateDatabaseUser[] | CreateDatabaseOptions = {}
  ): Promise<Database> {
    const { users, ...options } = Array.isArray(usersOrOptions)
      ? { users: usersOrOptions }
      : usersOrOptions;
    return this.request(
      {
        method: "POST",
        path: "/_api/database",
        body: { name: databaseName.normalize("NFC"), users, options },
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
    return this.request({ path: "/_api/database" }, (res) => res.body.result);
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
      { path: "/_api/database/user" },
      (res) => res.body.result
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
    return this.request({ path: "/_api/database" }, (res) =>
      (res.body.result as string[]).map((databaseName) =>
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
    return this.request({ path: "/_api/database/user" }, (res) =>
      (res.body.result as string[]).map((databaseName) =>
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
    databaseName = databaseName.normalize("NFC");
    return this.request(
      {
        method: "DELETE",
        path: `/_api/database/${encodeURIComponent(databaseName)}`,
      },
      (res) => res.body.result
    );
  }
  //#endregion

  //#region collections
  /**
   * Returns a `Collection` instance for the given collection name.
   *
   * In TypeScript the collection implements both the
   * {@link collection.DocumentCollection} and {@link collection.EdgeCollection}
   * interfaces and can be cast to either type to enforce a stricter API.
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
  collection<T extends Record<string, any> = any>(
    collectionName: string
  ): DocumentCollection<T> & EdgeCollection<T> {
    collectionName = collectionName.normalize("NFC");
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
   * then returns a {@link collection.DocumentCollection} instance for the new collection.
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
  async createCollection<T extends Record<string, any> = any>(
    collectionName: string,
    options?: CreateCollectionOptions & {
      type?: CollectionType.DOCUMENT_COLLECTION;
    }
  ): Promise<DocumentCollection<T>>;
  /**
   * Creates a new edge collection with the given `collectionName` and
   * `options`, then returns an {@link collection.EdgeCollection} instance for the new
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
  async createCollection<T extends Record<string, any> = any>(
    collectionName: string,
    options: CreateCollectionOptions & {
      type: CollectionType.EDGE_COLLECTION;
    }
  ): Promise<EdgeCollection<T>>;
  async createCollection<T extends Record<string, any> = any>(
    collectionName: string,
    options?: CreateCollectionOptions & { type?: CollectionType }
  ): Promise<DocumentCollection<T> & EdgeCollection<T>> {
    const collection = this.collection(collectionName);
    await collection.create(options);
    return collection;
  }

  /**
   * Creates a new edge collection with the given `collectionName` and
   * `options`, then returns an {@link collection.EdgeCollection} instance for the new
   * edge collection.
   *
   * This is a convenience method for calling {@link Database#createCollection}
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
  async createEdgeCollection<T extends Record<string, any> = any>(
    collectionName: string,
    options?: CreateCollectionOptions
  ): Promise<EdgeCollection<T>> {
    return this.createCollection(collectionName, {
      ...options,
      type: CollectionType.EDGE_COLLECTION,
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
  ): Promise<ArangoApiResponse<CollectionMetadata>> {
    collectionName = collectionName.normalize("NFC");
    const result = await this.request({
      method: "PUT",
      path: `/_api/collection/${encodeURIComponent(collectionName)}/rename`,
      body: { name: newName.normalize("NFC") },
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
   * `Collection` instances.
   *
   * In TypeScript these instances implement both the
   * {@link collection.DocumentCollection} and {@link collection.EdgeCollection}
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
  ): Promise<Array<DocumentCollection & EdgeCollection>> {
    const collections = await this.listCollections(excludeSystem);
    return collections.map((data) => this.collection(data.name));
  }
  //#endregion

  //#region graphs
  /**
   * Returns a {@link graph.Graph} instance representing the graph with the given
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
  graph(graphName: string): Graph {
    graphName = graphName.normalize("NFC");
    if (!this._graphs.has(graphName)) {
      this._graphs.set(graphName, new Graph(this, graphName));
    }
    return this._graphs.get(graphName)!;
  }

  /**
   * Creates a graph with the given `graphName` and `edgeDefinitions`, then
   * returns a {@link graph.Graph} instance for the new graph.
   *
   * @param graphName - Name of the graph to be created.
   * @param edgeDefinitions - An array of edge definitions.
   * @param options - An object defining the properties of the graph.
   */
  async createGraph(
    graphName: string,
    edgeDefinitions: EdgeDefinitionOptions[],
    options?: CreateGraphOptions
  ): Promise<Graph> {
    const graph = this.graph(graphName.normalize("NFC"));
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
  listGraphs(): Promise<GraphInfo[]> {
    return this.request({ path: "/_api/gharial" }, (res) => res.body.graphs);
  }

  /**
   * Fetches all graphs from the database and returns an array of {@link graph.Graph}
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
  async graphs(): Promise<Graph[]> {
    const graphs = await this.listGraphs();
    return graphs.map((data: any) => this.graph(data._key));
  }
  //#endregion

  //#region views
  /**
   * Returns a {@link view.View} instance for the given `viewName`.
   *
   * @param viewName - Name of the ArangoSearch or SearchAlias View.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = db.view("potatoes");
   * ```
   */
  view(viewName: string): View {
    viewName = viewName.normalize("NFC");
    if (!this._views.has(viewName)) {
      this._views.set(viewName, new View(this, viewName));
    }
    return this._views.get(viewName)!;
  }

  /**
   * Creates a new View with the given `viewName` and `options`, then returns a
   * {@link view.View} instance for the new View.
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
    options: CreateViewOptions
  ): Promise<View> {
    const view = this.view(viewName.normalize("NFC"));
    await view.create(options);
    return view;
  }

  /**
   * Renames the view `viewName` to `newName`.
   *
   * Additionally removes any stored {@link view.View} instance for `viewName` from
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
  ): Promise<ArangoApiResponse<ViewDescription>> {
    viewName = viewName.normalize("NFC");
    const result = await this.request({
      method: "PUT",
      path: `/_api/view/${encodeURIComponent(viewName)}/rename`,
      body: { name: newName.normalize("NFC") },
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
  listViews(): Promise<ViewDescription[]> {
    return this.request({ path: "/_api/view" }, (res) => res.body.result);
  }

  /**
   * Fetches all Views from the database and returns an array of
   * {@link view.View} instances
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
  async views(): Promise<View[]> {
    const views = await this.listViews();
    return views.map((data) => this.view(data.name));
  }
  //#endregion

  //#region analyzers
  /**
   * Returns an {@link analyzer.Analyzer} instance representing the Analyzer with the
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
    analyzerName = analyzerName.normalize("NFC");
    if (!this._analyzers.has(analyzerName)) {
      this._analyzers.set(analyzerName, new Analyzer(this, analyzerName));
    }
    return this._analyzers.get(analyzerName)!;
  }

  /**
   * Creates a new Analyzer with the given `analyzerName` and `options`, then
   * returns an {@link analyzer.Analyzer} instance for the new Analyzer.
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
   * See also {@link Database#analyzers}.
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
   * {@link analyzer.Analyzer} instances for those Analyzers.
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
  async analyzers(): Promise<Analyzer[]> {
    const analyzers = await this.listAnalyzers();
    return analyzers.map((data) => this.analyzer(data.name));
  }
  //#endregion

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
  listUsers(): Promise<ArangoUser[]> {
    return this.request(
      {
        path: "/_api/user",
      },
      (res) => res.body.result
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
  getUser(username: string): Promise<ArangoApiResponse<ArangoUser>> {
    return this.request({
      path: `/_api/user/${encodeURIComponent(username)}`,
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
  ): Promise<ArangoApiResponse<ArangoUser>>;
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
    options: UserOptions
  ): Promise<ArangoApiResponse<ArangoUser>>;
  createUser(
    username: string,
    options: string | UserOptions
  ): Promise<ArangoApiResponse<ArangoUser>> {
    if (typeof options === "string") {
      options = { passwd: options };
    }
    return this.request(
      {
        method: "POST",
        path: "/_api/user",
        body: { user: username, ...options },
      },
      (res) => res.body
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
  ): Promise<ArangoApiResponse<ArangoUser>>;
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
    options: Partial<UserOptions>
  ): Promise<ArangoApiResponse<ArangoUser>>;
  updateUser(
    username: string,
    options: string | Partial<UserOptions>
  ): Promise<ArangoApiResponse<ArangoUser>> {
    if (typeof options === "string") {
      options = { passwd: options };
    }
    return this.request(
      {
        method: "PATCH",
        path: `/_api/user/${encodeURIComponent(username)}`,
        body: options,
      },
      (res) => res.body
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
    options: UserOptions
  ): Promise<ArangoApiResponse<ArangoUser>> {
    if (typeof options === "string") {
      options = { passwd: options };
    }
    return this.request(
      {
        method: "PUT",
        path: `/_api/user/${encodeURIComponent(username)}`,
        body: options,
      },
      (res) => res.body
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
  removeUser(
    username: string
  ): Promise<ArangoApiResponse<Record<string, never>>> {
    return this.request(
      {
        method: "DELETE",
        path: `/_api/user/${encodeURIComponent(username)}`,
      },
      (res) => res.body
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
    { database, collection }: UserAccessLevelOptions
  ): Promise<AccessLevel> {
    const databaseName = isArangoDatabase(database)
      ? database.name
      : database?.normalize("NFC") ??
        (isArangoCollection(collection)
          ? ((collection as any)._db as Database).name
          : this._name);
    const suffix = collection
      ? `/${encodeURIComponent(
          isArangoCollection(collection)
            ? collection.name
            : collection.normalize("NFC")
        )}`
      : "";
    return this.request(
      {
        path: `/_api/user/${encodeURIComponent(
          username
        )}/database/${encodeURIComponent(databaseName)}${suffix}`,
      },
      (res) => res.body.result
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
    }: UserAccessLevelOptions & { grant: AccessLevel }
  ): Promise<ArangoApiResponse<Record<string, AccessLevel>>> {
    const databaseName = isArangoDatabase(database)
      ? database.name
      : database?.normalize("NFC") ??
        (isArangoCollection(collection)
          ? ((collection as any)._db as Database).name
          : this._name);
    const suffix = collection
      ? `/${encodeURIComponent(
          isArangoCollection(collection)
            ? collection.name
            : collection.normalize("NFC")
        )}`
      : "";
    return this.request(
      {
        method: "PUT",
        path: `/_api/user/${encodeURIComponent(
          username
        )}/database/${encodeURIComponent(databaseName)}${suffix}`,
        body: { grant },
      },
      (res) => res.body
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
    { database, collection }: UserAccessLevelOptions
  ): Promise<ArangoApiResponse<Record<string, AccessLevel>>> {
    const databaseName = isArangoDatabase(database)
      ? database.name
      : database?.normalize("NFC") ??
        (isArangoCollection(collection)
          ? ((collection as any)._db as Database).name
          : this._name);
    const suffix = collection
      ? `/${encodeURIComponent(
          isArangoCollection(collection)
            ? collection.name
            : collection.normalize("NFC")
        )}`
      : "";
    return this.request(
      {
        method: "DELETE",
        path: `/_api/user/${encodeURIComponent(
          username
        )}/database/${encodeURIComponent(databaseName)}${suffix}`,
      },
      (res) => res.body
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
  ): Promise<Record<string, AccessLevel>>;
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
        permission: AccessLevel;
        collections: Record<string, AccessLevel | "undefined">;
      }
    >
  >;
  getUserDatabases(username: string, full?: boolean) {
    return this.request(
      {
        path: `/_api/user/${encodeURIComponent(username)}/database`,
        qs: { full },
      },
      (res) => res.body.result
    );
  }
  //#endregion

  //#region transactions
  /**
   * Performs a server-side JavaScript transaction and returns its return
   * value.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collection.ArangoCollection} interface: `Collection`,
   * {@link graph.GraphVertexCollection}, {@link graph.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collection.DocumentCollection} and {@link collection.EdgeCollection}.
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
    collections: TransactionCollections & { allowImplicit?: boolean },
    action: string,
    options?: TransactionOptions & { params?: any }
  ): Promise<any>;
  /**
   * Performs a server-side transaction and returns its return value.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collection.ArangoCollection} interface: `Collection`,
   * {@link graph.GraphVertexCollection}, {@link graph.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collection.DocumentCollection} and {@link collection.EdgeCollection}.
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
    collections: (string | ArangoCollection)[],
    action: string,
    options?: TransactionOptions & { params?: any }
  ): Promise<any>;
  /**
   * Performs a server-side transaction and returns its return value.
   *
   * The Collection can be specified as a collection name (string) or an object
   * implementing the {@link collection.ArangoCollection} interface: `Collection`,
   * {@link graph.GraphVertexCollection}, {@link graph.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collection.DocumentCollection} and {@link collection.EdgeCollection}.
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
    options: TransactionOptions & { params?: any } = {}
  ): Promise<any> {
    const { allowDirtyRead = undefined, ...opts } = options;
    return this.request(
      {
        method: "POST",
        path: "/_api/transaction",
        allowDirtyRead,
        body: {
          collections: coerceTransactionCollections(collections),
          action,
          ...opts,
        },
      },
      (res) => res.body.result
    );
  }

  /**
   * Returns a {@link transaction.Transaction} instance for an existing streaming
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
  transaction(transactionId: string): Transaction {
    return new Transaction(this, transactionId);
  }

  /**
   * Begins a new streaming transaction for the given collections, then returns
   * a {@link transaction.Transaction} instance for the transaction.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collection.ArangoCollection} interface: `Collection`,
   * {@link graph.GraphVertexCollection}, {@link graph.GraphEdgeCollection} as
   * well as (in TypeScript) {@link collection.DocumentCollection} and
   * {@link collection.EdgeCollection}.
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
    collections: TransactionCollections,
    options?: TransactionOptions
  ): Promise<Transaction>;
  /**
   * Begins a new streaming transaction for the given collections, then returns
   * a {@link transaction.Transaction} instance for the transaction.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collection.ArangoCollection} interface: `Collection`,
   * {@link graph.GraphVertexCollection}, {@link graph.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collection.DocumentCollection} and {@link collection.EdgeCollection}.
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
    collections: (string | ArangoCollection)[],
    options?: TransactionOptions
  ): Promise<Transaction>;
  /**
   * Begins a new streaming transaction for the given collections, then returns
   * a {@link transaction.Transaction} instance for the transaction.
   *
   * The Collection can be specified as a collection name (string) or an object
   * implementing the {@link collection.ArangoCollection} interface: `Collection`,
   * {@link graph.GraphVertexCollection}, {@link graph.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collection.DocumentCollection} and {@link collection.EdgeCollection}.
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
    collection: string | ArangoCollection,
    options?: TransactionOptions
  ): Promise<Transaction>;
  beginTransaction(
    collections:
      | TransactionCollections
      | (string | ArangoCollection)[]
      | string
      | ArangoCollection,
    options: TransactionOptions = {}
  ): Promise<Transaction> {
    const { allowDirtyRead = undefined, ...opts } = options;
    return this.request(
      {
        method: "POST",
        path: "/_api/transaction/begin",
        allowDirtyRead,
        body: {
          collections: coerceTransactionCollections(collections),
          ...opts,
        },
      },
      (res) => new Transaction(this, res.body.result.id)
    );
  }

  /**
   * Begins and commits a transaction using the given callback. Individual
   * requests that are part of the transaction need to be wrapped in the step
   * function passed into the callback. If the promise returned by the callback
   * is rejected, the transaction will be aborted.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collection.ArangoCollection} interface: `Collection`,
   * {@link graph.GraphVertexCollection}, {@link graph.GraphEdgeCollection} as
   * well as (in TypeScript) {@link collection.DocumentCollection} and
   * {@link collection.EdgeCollection}.
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
    collections: TransactionCollections,
    callback: (step: Transaction["step"]) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
  /**
   * Begins and commits a transaction using the given callback. Individual
   * requests that are part of the transaction need to be wrapped in the step
   * function passed into the callback. If the promise returned by the callback
   * is rejected, the transaction will be aborted.
   *
   * Collections can be specified as collection names (strings) or objects
   * implementing the {@link collection.ArangoCollection} interface: `Collection`,
   * {@link graph.GraphVertexCollection}, {@link graph.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collection.DocumentCollection} and {@link collection.EdgeCollection}.
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
    collections: (string | ArangoCollection)[],
    callback: (step: Transaction["step"]) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
  /**
   * Begins and commits a transaction using the given callback. Individual
   * requests that are part of the transaction need to be wrapped in the step
   * function passed into the callback. If the promise returned by the callback
   * is rejected, the transaction will be aborted.
   *
   * The Collection can be specified as a collection name (string) or an object
   * implementing the {@link collection.ArangoCollection} interface: `Collection`,
   * {@link graph.GraphVertexCollection}, {@link graph.GraphEdgeCollection} as well as
   * (in TypeScript) {@link collection.DocumentCollection} and {@link collection.EdgeCollection}.
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
    collection: string | ArangoCollection,
    callback: (step: Transaction["step"]) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
  async withTransaction<T>(
    collections:
      | TransactionCollections
      | (string | ArangoCollection)[]
      | string
      | ArangoCollection,
    callback: (step: Transaction["step"]) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const trx = await this.beginTransaction(
      collections as TransactionCollections,
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
  listTransactions(): Promise<TransactionDetails[]> {
    return this._connection.request(
      { path: "/_api/transaction" },
      (res) => res.body.transactions
    );
  }

  /**
   * Fetches all active transactions from the database and returns an array of
   * {@link transaction.Transaction} instances for those transactions.
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
  async transactions(): Promise<Transaction[]> {
    const transactions = await this.listTransactions();
    return transactions.map((data) => this.transaction(data.id));
  }
  //#endregion

  //#region queries
  /**
   * Performs a database query using the given `query`, then returns a new
   * {@link cursor.ArrayCursor} instance for the result set.
   *
   * See the {@link aql!aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An object containing an AQL query string and bind
   * parameters, e.g. the object returned from an {@link aql!aql} template string.
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
    query: AqlQuery<T>,
    options?: QueryOptions
  ): Promise<ArrayCursor<T>>;
  /**
   * Performs a database query using the given `query` and `bindVars`, then
   * returns a new {@link cursor.ArrayCursor} instance for the result set.
   *
   * See the {@link aql!aql} template string handler for a safer and easier
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
    query: string | AqlLiteral,
    bindVars?: Record<string, any>,
    options?: QueryOptions
  ): Promise<ArrayCursor<T>>;
  query<T = any>(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<ArrayCursor<T>> {
    if (isAqlQuery(query)) {
      options = bindVars ?? {};
      bindVars = query.bindVars;
      query = query.query;
    } else if (isAqlLiteral(query)) {
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
        retryOnConflict,
        timeout,
      },
      (res) =>
        new BatchedArrayCursor<T>(
          this,
          res.body,
          res.arangojsHostUrl,
          allowDirtyRead
        ).items
    );
  }

  /**
   * Explains a database query using the given `query`.
   *
   * See the {@link aql!aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An object containing an AQL query string and bind
   * parameters, e.g. the object returned from an {@link aql!aql} template string.
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
    query: AqlQuery,
    options?: ExplainOptions & { allPlans?: false }
  ): Promise<ArangoApiResponse<SingleExplainResult>>;
  /**
   * Explains a database query using the given `query`.
   *
   * See the {@link aql!aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An object containing an AQL query string and bind
   * parameters, e.g. the object returned from an {@link aql!aql} template string.
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
    query: AqlQuery,
    options?: ExplainOptions & { allPlans: true }
  ): Promise<ArangoApiResponse<MultiExplainResult>>;
  /**
   * Explains a database query using the given `query` and `bindVars`.
   *
   * See the {@link aql!aql} template string handler for a safer and easier
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
    query: string | AqlLiteral,
    bindVars?: Record<string, any>,
    options?: ExplainOptions & { allPlans?: false }
  ): Promise<ArangoApiResponse<SingleExplainResult>>;
  /**
   * Explains a database query using the given `query` and `bindVars`.
   *
   * See the {@link aql!aql} template string handler for a safer and easier
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
    query: string | AqlLiteral,
    bindVars?: Record<string, any>,
    options?: ExplainOptions & { allPlans: true }
  ): Promise<ArangoApiResponse<MultiExplainResult>>;
  explain(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: Record<string, any>,
    options?: ExplainOptions
  ): Promise<ArangoApiResponse<SingleExplainResult | MultiExplainResult>> {
    if (isAqlQuery(query)) {
      options = bindVars;
      bindVars = query.bindVars;
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }
    return this.request({
      method: "POST",
      path: "/_api/explain",
      body: { query, bindVars, options },
    });
  }

  /**
   * Parses the given query and returns the result.
   *
   * See the {@link aql!aql} template string handler for information about how
   * to create a query string without manually defining bind parameters nor
   * having to worry about escaping variables.
   *
   * @param query - An AQL query string or an object containing an AQL query
   * string and bind parameters, e.g. the object returned from an {@link aql!aql}
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
   */
  parse(query: string | AqlQuery | AqlLiteral): Promise<ParseResult> {
    if (isAqlQuery(query)) {
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }
    return this.request({
      method: "POST",
      path: "/_api/query",
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
  queryRules(): Promise<QueryOptimizerRule[]> {
    return this.request({
      path: "/_api/query/rules",
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
  queryTracking(): Promise<QueryTracking>;
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
  listRunningQueries(): Promise<QueryInfo[]> {
    return this.request({
      method: "GET",
      path: "/_api/query/current",
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
  listSlowQueries(): Promise<QueryInfo[]> {
    return this.request({
      method: "GET",
      path: "/_api/query/slow",
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
        path: "/_api/query/slow",
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
        path: `/_api/query/${encodeURIComponent(queryId)}`,
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
  ): Promise<ArangoApiResponse<{ isNewlyCreated: boolean }>> {
    return this.request({
      method: "POST",
      path: "/_api/aqlfunction",
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
   * await db.dropFunction("ACME::ACCOUNTING::CALCULATE_VAT");
   * // the function no longer exists
   * ```
   */
  dropFunction(
    name: string,
    group: boolean = false
  ): Promise<ArangoApiResponse<{ deletedCount: number }>> {
    return this.request({
      method: "DELETE",
      path: `/_api/aqlfunction/${encodeURIComponent(name)}`,
      qs: { group },
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
  listServices(excludeSystem: boolean = true): Promise<ServiceSummary[]> {
    return this.request({
      path: "/_api/foxx",
      qs: { excludeSystem },
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
   * // Using a node.js file stream as source
   * const source = fs.createReadStream("./my-foxx-service.zip");
   * const info = await db.installService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a node.js Buffer as source
   * const source = fs.readFileSync("./my-foxx-service.zip");
   * const info = await db.installService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a File (Blob) from a browser file input
   * const element = document.getElementById("my-file-input");
   * const source = element.files[0];
   * const info = await db.installService("/hello", source);
   * ```
   */
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
    return await this.request({
      ...req,
      method: "POST",
      path: "/_api/foxx",
      isBinary: true,
      qs: { ...qs, mount },
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
   * // Using a node.js file stream as source
   * const source = fs.createReadStream("./my-foxx-service.zip");
   * const info = await db.replaceService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a node.js Buffer as source
   * const source = fs.readFileSync("./my-foxx-service.zip");
   * const info = await db.replaceService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a File (Blob) from a browser file input
   * const element = document.getElementById("my-file-input");
   * const source = element.files[0];
   * const info = await db.replaceService("/hello", source);
   * ```
   */
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
    return await this.request({
      ...req,
      method: "PUT",
      path: "/_api/foxx/service",
      isBinary: true,
      qs: { ...qs, mount },
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
   * // Using a node.js file stream as source
   * const source = fs.createReadStream("./my-foxx-service.zip");
   * const info = await db.upgradeService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a node.js Buffer as source
   * const source = fs.readFileSync("./my-foxx-service.zip");
   * const info = await db.upgradeService("/hello", source);
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * // Using a File (Blob) from a browser file input
   * const element = document.getElementById("my-file-input");
   * const source = element.files[0];
   * const info = await db.upgradeService("/hello", source);
   * ```
   */
  async upgradeService(
    mount: string,
    source: Readable | Buffer | Blob | string,
    options: UpgradeServiceOptions = {}
  ): Promise<ServiceInfo> {
    const { configuration, dependencies, ...qs } = options;
    const req = await toForm({
      configuration,
      dependencies,
      source,
    });
    return await this.request({
      ...req,
      method: "PATCH",
      path: "/_api/foxx/service",
      isBinary: true,
      qs: { ...qs, mount },
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
  getService(mount: string): Promise<ServiceInfo> {
    return this.request({
      path: "/_api/foxx/service",
      qs: { mount },
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
  ): Promise<Record<string, ServiceConfiguration>>;
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
      path: "/_api/foxx/configuration",
      qs: { mount, minimal },
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
  ): Promise<Record<string, ServiceConfiguration & { warning?: string }>>;
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
      path: "/_api/foxx/configuration",
      body: cfg,
      qs: { mount, minimal },
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
  ): Promise<Record<string, ServiceConfiguration & { warning?: string }>>;
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
      path: "/_api/foxx/configuration",
      body: cfg,
      qs: { mount, minimal },
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
  ): Promise<Record<string, SingleServiceDependency | MultiServiceDependency>>;
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
      path: "/_api/foxx/dependencies",
      qs: { mount, minimal },
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
      (SingleServiceDependency | MultiServiceDependency) & { warning?: string }
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
      path: "/_api/foxx/dependencies",
      body: deps,
      qs: { mount, minimal },
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
      (SingleServiceDependency | MultiServiceDependency) & { warning?: string }
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
      path: "/_api/foxx/dependencies",
      body: deps,
      qs: { mount, minimal },
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
  ): Promise<ServiceInfo> {
    return this.request({
      method: enabled ? "POST" : "DELETE",
      path: "/_api/foxx/development",
      qs: { mount },
    });
  }

  /**
   * Retrieves a list of scripts defined in the service manifest's "scripts"
   * section mapped to their human readable representations.
   *
   * @param mount - The service's mount point, relative to the database.
   *
   * @example
   * ```js
   * const db = new Database();
   * const scripts = await db.listServiceScripts("/my-service");
   * for (const [name, title] of Object.entries(scripts)) {
   *   console.log(`${name}: ${title}`);
   * }
   * ```
   */
  listServiceScripts(mount: string): Promise<Record<string, string>> {
    return this.request({
      path: "/_api/foxx/scripts",
      qs: { mount },
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
      path: `/_api/foxx/scripts/${encodeURIComponent(name)}`,
      body: params,
      qs: { mount },
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
  ): Promise<ServiceTestDefaultReport>;
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
  ): Promise<ServiceTestSuiteReport>;
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
  ): Promise<ServiceTestStreamReport>;
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
  ): Promise<ServiceTestTapReport>;
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
  ): Promise<ServiceTestXunitReport>;
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
      path: "/_api/foxx/tests",
      qs: {
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
      path: "/_api/foxx/readme",
      qs: { mount },
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
  getServiceDocumentation(mount: string): Promise<SwaggerJson> {
    return this.request({
      path: "/_api/foxx/swagger",
      qs: { mount },
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
      path: "/_api/foxx/download",
      qs: { mount },
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
        path: "/_api/foxx/commit",
        qs: { replace },
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
  createHotBackup(options: HotBackupOptions = {}): Promise<HotBackupResult> {
    return this.request(
      {
        method: "POST",
        path: "/_admin/backup/create",
        body: options,
      },
      (res) => res.body.result
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
   * const backups = await db.listHotBackups();
   * for (const backup of backups) {
   *   console.log(backup.id);
   * }
   * ```
   */
  listHotBackups(id?: string | string[]): Promise<HotBackupList> {
    return this.request(
      {
        method: "POST",
        path: "/_admin/backup/list",
        body: id ? { id } : undefined,
      },
      (res) => res.body.result
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
        path: "/_admin/backup/restore",
        body: { id },
      },
      (res) => res.body.result.previous
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
        path: "/_admin/backup/delete",
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
  getLogEntries(options?: LogEntriesOptions): Promise<LogEntries> {
    return this.request(
      {
        path: "/_admin/log",
        qs: options,
      },
      (res) => res.body
    );
  }

  /**
   * Retrieves the log messages from the server's global log.
   *
   * @param options - Options for retrieving the log entries.
   *
   * @example
   * ```js
   * const messages = await db.getLogMessages();
   * for (const m of messages) {
   *   console.log(`${m.date} - [${m.level}] ${m.message} (#${m.id})`);
   * }
   * ```
   */
  getLogMessages(options?: LogEntriesOptions): Promise<LogMessage[]> {
    return this.request(
      {
        path: "/_admin/log",
        qs: options,
      },
      (res) => res.body.messages
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
  getLogLevel(): Promise<Record<string, LogLevelSetting>> {
    return this.request({
      path: "/_admin/log/level",
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
    levels: Record<string, LogLevelSetting>
  ): Promise<Record<string, LogLevelSetting>> {
    return this.request({
      method: "PUT",
      path: "/_admin/log/level",
      body: levels,
    });
  }
  //#endregion
  //#region async jobs
  /**
   * Returns a {@link job.Job} instance for the given `jobId`.
   *
   * @param jobId - ID of the async job.
   *
   * @example
   * ```js
   * const db = new Database();
   * const job = db.job("12345");
   * ```
   */
  job(jobId: string): Job {
    return new Job(this, jobId);
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
        path: "/_api/job/pending",
      },
      (res) => res.body
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
        path: "/_api/job/done",
      },
      (res) => res.body
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
        path: `/_api/job/expired`,
        qs: { stamp: threshold / 1000 },
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
        path: `/_api/job/all`,
      },
      () => undefined
    );
  }
  //#endregion
}
