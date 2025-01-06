/**
 * ```ts
 * import type { QueryOptions } from "arangojs/queries";
 * ```
 *
 * The "query" module provides query related types for TypeScript.
 *
 * @packageDocumentation
 */
/** @import databases from "./databases.js" */

//#region Query operation options
/**
 * Options for executing a query.
 *
 * See {@link databases.Database#query}.
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
   * Maximum size of transactions in bytes.
   */
  maxTransactionSize?: number;
  /**
   * Maximum number of operations after which an intermediate commit is
   * automatically performed.
   */
  intermediateCommitCount?: number;
  /**
   * Maximum total size of operations in bytes after which an intermediate
   * commit is automatically performed.
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
 * See {@link databases.Database#explain}.
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
 * Options for query tracking.
 *
 * See {@link databases.Database#queryTracking}.
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
 * Options for adjusting the global properties for the AQL query results cache.
 */
export type QueryCachePropertiesOptions = {
  /**
   * If set to `true`, the query cache will include queries that involve
   * system collections.
   */
  includeSystem?: boolean;
  /**
   * Maximum individual size of query results that will be stored per
   * database-specific cache.
   */
  maxEntrySize?: number;
  /**
   * Maximum number of query results that will be stored per database-specific
   * cache.
   */
  maxResults?: number;
  /**
   * Maximum cumulated size of query results that will be stored per
   * database-specific cache.
   */
  maxResultsSize?: number;
  /**
   * Mode the AQL query cache should operate in.
   */
  mode?: "off" | "on" | "demand";
};
//#endregion

//#region Query operation results
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
 * Node in an AQL abstract syntax tree (AST).
 */
export type AstNode = {
  [key: string]: any;
  type: string;
  subNodes: AstNode[];
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
export type QueryTrackingInfo = {
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
 * Entry in the AQL query results cache.
 */
export type QueryCacheEntry = {
  /**
   * Hash of the query results.
   */
  hash: string;
  /**
   * Query string.
   */
  query: string;
  /**
   * Bind parameters used in the query. Only shown if tracking for bind
   * variables was enabled at server start.
   */
  bindVars: Record<string, any>;
  /**
   * Size of the query results and bind parameters in bytes.
   */
  size: number;
  /**
   * Number of documents/rows in the query results.
   */
  results: number;
  /**
   * Date and time the query was started as an ISO 8601 timestamp.
   */
  started: string;
  /**
   * Number of times the result was served from the cache.
   */
  hits: number;
  /**
   * Running time of the query in seconds.
   */
  runTime: number;
  /**
   * Collections and views involved in the query.
   */
  dataSources: string[];
};

/**
 * Properties of the global AQL query results cache configuration.
 */
export type QueryCacheProperties = {
  /**
   * If set to `true`, the query cache will include queries that involve
   * system collections.
   */
  includeSystem: boolean;
  /**
   * Maximum individual size of query results that will be stored per
   * database-specific cache.
   */
  maxEntrySize: number;
  /**
   * Maximum number of query results that will be stored per database-specific
   * cache.
   */
  maxResults: number;
  /**
   * Maximum cumulated size of query results that will be stored per
   * database-specific cache.
   */
  maxResultsSize: number;
  /**
   * Mode the AQL query cache should operate in.
   */
  mode: "off" | "on" | "demand";
};
//#endregion

//#region QueryDescription
/**
 * Object describing a query.
 */
export type QueryDescription = {
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
//#endregion

//#region UserFunctionDescription
/**
 * Definition of an AQL User Function.
 */
export type UserFunctionDescription = {
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
   * See {@link databases.Database#createUserFunction}.
   */
  isDeterministic: boolean;
};
//#endregion
