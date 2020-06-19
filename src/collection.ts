/**
 * ```ts
 * import type {
 *   DocumentCollection,
 *   EdgeCollection,
 * } from "arangojs/collection";
 * ```
 *
 * The "collection" module provides collection related types and interfaces
 * for TypeScript.
 *
 * @packageDocumentation
 */
import { ArangoResponseMetadata, Params } from "./connection";
import { ArrayCursor } from "./cursor";
import { Database } from "./database";
import {
  Document,
  DocumentData,
  DocumentMetadata,
  DocumentSelector,
  Edge,
  EdgeData,
  _documentHandle,
} from "./documents";
import { isArangoError } from "./error";
import {
  EnsureFulltextIndexOptions,
  EnsureGeoIndexOptions,
  EnsureHashIndexOptions,
  EnsurePersistentIndexOptions,
  EnsureSkiplistIndexOptions,
  EnsureTtlIndexOptions,
  FulltextIndex,
  GeoIndex,
  HashIndex,
  Index,
  IndexSelector,
  PersistentIndex,
  SkiplistIndex,
  TtlIndex,
  _indexHandle,
} from "./indexes";
import { Blob } from "./lib/blob";
import { COLLECTION_NOT_FOUND, DOCUMENT_NOT_FOUND } from "./util/codes";
import { Patch } from "./util/types";

/**
 * Indicates whether the given value represents an {@link ArangoCollection}.
 *
 * @param collection - A value that might be a collection.
 */
export function isArangoCollection(
  collection: any
): collection is ArangoCollection {
  return Boolean(collection && collection.isArangoCollection);
}

/**
 * A marker interface identifying objects that can be used in AQL template
 * strings to create references to ArangoDB collections.
 *
 * See {@link aql}.
 */
export interface ArangoCollection {
  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB collection.
   */
  readonly isArangoCollection: true;
  /**
   * Name of the collection.
   */
  readonly name: string;
}

/**
 * Integer values indicating the collection type.
 */
export enum CollectionType {
  DOCUMENT_COLLECTION = 2,
  EDGE_COLLECTION = 3,
}

/**
 * Integer values indicating the collection loading status.
 */
export enum CollectionStatus {
  NEWBORN = 1,
  UNLOADED = 2,
  LOADED = 3,
  UNLOADING = 4,
  DELETED = 5,
  LOADING = 6,
}

/**
 * The type of key generator.
 */
export type KeyGenerator = "traditional" | "autoincrement" | "uuid" | "padded";

/**
 * Strategy for sharding a collection.
 */
export type ShardingStrategy =
  | "hash"
  | "enterprise-hash-smart-edge"
  | "community-compat"
  | "enterprise-compat"
  | "enterprise-smart-edge-compat";

/**
 * Type of document reference.
 *
 * See {@link Collection.list}.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryListType = "id" | "key" | "path";

/**
 * TODO
 */
export type ValidationLevel = "none" | "new" | "moderate" | "strict";

/**
 * General information about a collection.
 */
export type CollectionMetadata = {
  /**
   * The collection name.
   */
  name: string;
  /**
   * A globally unique identifier for this collection.
   */
  globallyUniqueId: string;
  /**
   * An integer indicating the collection loading status.
   */
  status: CollectionStatus;
  /**
   * An integer indicating the collection type.
   */
  type: CollectionType;
  /**
   * @internal
   *
   * Whether the collection is a system collection.
   */
  isSystem: boolean;
};

/**
 * An object defining the collection's key generation.
 */
export type CollectionKeyProperties = {
  /**
   * Type of key generator to use.
   */
  type: KeyGenerator;
  /**
   * Whether documents can be created with a user-specified `_key` attribute.
   */
  allowUserKeys: boolean;
  /**
   * (Autoincrement only.) How many steps to increment the key each time.
   */
  increment?: number;
  /**
   * (Autoincrement only.) The initial offset for the key.
   */
  offset?: number;
  /**
   * The most recent key that has been generated.
   */
  lastValue: number;
};

/**
 * Properties for validating documents in a collection.
 */
export type ValidationProperties = {
  /**
   * TODO
   */
  rule: any;
  /**
   * TODO
   */
  type: "json";
  /**
   * TODO
   */
  level: ValidationLevel;
  /**
   * TODO
   */
  message: string;
};

/**
 * An object defining the properties of a collection.
 */
export type CollectionProperties = {
  /**
   * A human-readable representation of the collection loading status.
   */
  statusString: string;
  /**
   * Whether data should be synchronized to disk before returning from
   * a document create, update, replace or removal operation.
   */
  waitForSync: boolean;
  /**
   * An object defining the collection's key generation.
   */
  keyOptions: CollectionKeyProperties;
  /**
   * TODO
   */
  validation: ValidationProperties | null;
  /**
   * (Cluster only.) TODO
   */
  writeConcern: number;
  /**
   * (Cluster only.) TODO
   *
   * @deprecated Renamed to `writeConcern` in ArangoDB 3.6.
   */
  minReplicationFactor: number;
  /**
   * (Cluster only.) The number of shards of this collection.
   */
  numberOfShards?: number;
  /**
   * (Cluster only.) The keys of this collection that will be used for
   * sharding.
   */
  shardKeys?: string[];
  /**
   * (Cluster only.) The collection's replication factor.
   */
  replicationFactor?: number;
  /**
   * (Cluster only.) The collection's sharding strategy.
   */
  shardingStrategy?: ShardingStrategy;
  /**
   * (MMFiles only.) TODO
   */
  doCompact?: boolean;
  /**
   * (MMFiles only.) TODO
   */
  journalSize?: number;
  /**
   * (MMFiles only.) TODO
   */
  indexBuckets?: number;
  /**
   * (MMFiles only.) TODO
   */
  isVolatile?: boolean;
  /**
   * (Enterprise Edition cluster only.) TODO
   */
  distributeShardsLike?: string;
  /**
   * (Enterprise Edition cluster only.) TODO
   */
  smartJoinAttribute?: string;
};

// Options

/**
 * Options for validating collection documents.
 */
export type ValidationOptions = {
  /**
   * TODO
   */
  rule: any;
  /**
   * TODO
   */
  level?: ValidationLevel;
  /**
   * TODO
   */
  message?: string;
};

/**
 * Options for setting a collection's properties.
 *
 * See {@link Collection.properties}.
 */
export type CollectionPropertiesOptions = {
  /**
   * Whether data should be synchronized to disk before returning from
   * a document create, update, replace or removal operation.
   */
  waitForSync?: boolean;
  /**
   * Options for validating documents in this collection.
   */
  validation?: ValidationOptions;
  /**
   * (MMFiles only.) The maximum size for each journal or datafile in bytes.
   *
   * Must be a number greater than or equal to `1048576` (1 MiB).
   */
  journalSize?: number;
};

/**
 * Options for retrieving a collection checksum.
 */
export type CollectionChecksumOptions = {
  /**
   * TODO
   */
  withRevisions?: boolean;
  /**
   * TODO
   */
  withData?: boolean;
};

/**
 * Options for dropping collections.
 */
export type CollectionDropOptions = {
  /**
   * Whether the collection is a system collection. If the collection is a
   * system collection, this option must be set to `true` or ArangoDB will
   * refuse to drop the collection.
   *
   * Default: `false`
   */
  isSystem?: boolean;
};

/**
 * An object defining the collection's key generation.
 */
export type CollectionKeyOptions = {
  /**
   * Type of key generator to use.
   */
  type?: KeyGenerator;
  /**
   * Unless set to `false`, documents can be created with a user-specified
   * `_key` attribute.
   *
   * Default: `true`
   */
  allowUserKeys?: boolean;
  /**
   * (Autoincrement only.) How many steps to increment the key each time.
   */
  increment?: number;
  /**
   * (Autoincrement only.) The initial offset for the key.
   */
  offset?: number;
};

/**
 * Options for creating a collection.
 *
 * See {@link Database.createCollection}, {@link Database.createEdgeCollection}
 * and {@link Collection.create}.
 */
export type CreateCollectionOptions = {
  /**
   * If set to `true`, data will be synchronized to disk before returning from
   * a document create, update, replace or removal operation.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * @internal
   *
   * Whether the collection should be created as a system collection.
   *
   * Default: `false`
   */
  isSystem?: boolean;
  /**
   * An object defining the collection's key generation.
   */
  keyOptions?: CollectionKeyOptions;
  /**
   * TODO
   */
  validation?: ValidationOptions;
  /**
   * (Cluster only.) Unless set to `false`, the server will wait for all
   * replicas to create the collection before returning.
   *
   * Default: `true`
   */
  waitForSyncReplication?: boolean;
  /**
   * (Cluster only.) Unless set to `false`, the server will check whether
   * enough replicas are available at creation time and bail out otherwise.
   *
   * Default: `true`
   */
  enforceReplicationFactor?: boolean;
  /**
   * (Cluster only.) Number of shards to distribute the collection across.
   *
   * Default: `1`
   */
  numberOfShards?: number;
  /**
   * (Cluster only.) Document attributes to use to determine the target shard
   * for each document.
   *
   * Default: `["_key"]`
   */
  shardKeys?: string[];
  /**
   * (Cluster only.) How many copies of each document should be kept in the
   * cluster.
   *
   * Default: `1`
   */
  replicationFactor?: number;
  /**
   * (Cluster only.) Write concern for this collection.
   */
  writeConcern?: number;
  /**
   * (Cluster only.) Write concern for this collection.
   *
   * @deprecated Renamed to `writeConcern` in ArangoDB 3.6.
   */
  minReplicationFactor?: number;
  /**
   * (Cluster only.) Sharding strategy to use.
   */
  shardingStrategy?: ShardingStrategy;
  /**
   * (MMFiles only.) Number of buckets into which indexes using hash tables are
   * split.
   *
   * Must be a power of 2 and less than or equal to `1024`.
   *
   * Default: `16`
   */
  indexBuckets?: number;
  /**
   * (MMFiles only.) Whether the collection will be compacted.
   *
   * Default: `true`
   */
  doCompact?: boolean;
  /**
   * (MMFiles only.) The maximum size for each journal or datafile in bytes.
   *
   * Must be a number greater than or equal to `1048576` (1 MiB).
   */
  journalSize?: number;
  /**
   * (MMFiles only.) If set to `true`, the collection will only be kept
   * in-memory and discarded when unloaded, resulting in full data loss.
   *
   * Default: `false`
   */
  isVolatile?: boolean;
  /**
   * (Enterprise Edition cluster only.) If set to a collection name, sharding
   * of the new collection will follow the rules for that collection. As long
   * as the new collection exists, the indicated collection can not be dropped.
   */
  distributeShardsLike?: string;
  /**
   * (Enterprise Edition cluster only.) Attribute containing the shard key
   * value of the referred-to smart join collection.
   */
  smartJoinAttribute?: string;
};

/**
 * Options for retrieving a document from a collection.
 */
export type CollectionReadOptions = {
  /**
   * If set to `true`, `null` is returned instead of an exception being thrown
   * if the document does not exist.
   */
  graceful?: boolean;
  /**
   * If set to `true`, the request will explicitly permit ArangoDB to return a
   * potentially dirty or stale result and arangojs will load balance the
   * request without distinguishing between leaders and followers.
   */
  allowDirtyRead?: boolean;
};

/**
 * Options for inserting a new document into a collection.
 */
export type CollectionInsertOptions = {
  /**
   * If set to `true`, data will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `true`, no data will be returned by the server. This option can
   * be used to reduce network traffic.
   *
   * Default: `false`
   */
  silent?: boolean;
  /**
   * If set to `true`, the complete new document will be returned as the `new`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnNew?: boolean;
  /**
   * If set to `true`, a document with the same `_key` or `_id` already
   * existing will be overwritten instead of resulting in an exception.
   *
   * @deprecated This option has been deprecated in ArangoDB 3.7 and replaced
   * with the `overwriteMode` option.
   */
  overwrite?: boolean;
  /**
   * Defines what should happen if a document with the same `_key` or `_id`
   * already exists, instead of throwing an exception.
   */
  overwriteMode?: "update" | "replace";
};

/**
 * Options for replacing an existing document in a collection.
 */
export type CollectionReplaceOptions = {
  /**
   * If set to `true`, data will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `true`, no data will be returned by the server. This option can
   * be used to reduce network traffic.
   *
   * Default: `false`
   */
  silent?: boolean;
  /**
   * If set to `true`, the complete new document will be returned as the `new`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnNew?: boolean;
  /**
   * If set to `false`, the existing document will only be modified if its
   * `_rev` property matches the same property on the new data.
   *
   * Default: `true`
   */
  ignoreRevs?: boolean;
  /**
   * If set to `true`, the complete old document will be returned as the `old`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnOld?: boolean;
};

/**
 * Options for updating a document in a collection.
 */
export type CollectionUpdateOptions = {
  /**
   * If set to `true`, data will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `true`, no data will be returned by the server. This option can
   * be used to reduce network traffic.
   *
   * Default: `false`
   */
  silent?: boolean;
  /**
   * If set to `true`, the complete new document will be returned as the `new`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnNew?: boolean;
  /**
   * If set to `false`, the existing document will only be modified if its
   * `_rev` property matches the same property on the new data.
   *
   * Default: `true`
   */
  ignoreRevs?: boolean;
  /**
   * If set to `true`, the complete old document will be returned as the `old`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnOld?: boolean;
  /**
   * If set to `false`, properties with a value of `null` will be removed from
   * the new document.
   *
   * Default: `true`
   */
  keepNull?: boolean;
  /**
   * If set to `false`, object properties that already exist in the old
   * document will be overwritten rather than merged. This does not affect
   * arrays.
   *
   * Default: `true`
   */
  mergeObjects?: boolean;
};

/**
 * Options for removing a document from a collection.
 */
export type CollectionRemoveOptions = {
  /**
   * If set to `true`, changes will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `true`, the complete old document will be returned as the `old`
   * property on the result object. Has no effect if `silent` is set to `true`.
   *
   * Default: `false`
   */
  returnOld?: boolean;
  /**
   * If set to `true`, no data will be returned by the server. This option can
   * be used to reduce network traffic.
   *
   * Default: `false`
   */
  silent?: boolean;
};

/**
 * Options for bulk importing documents into a collection.
 */
export type CollectionImportOptions = {
  /**
   * (Edge collections only.) Prefix to prepend to `_from` attribute values.
   */
  fromPrefix?: string;
  /**
   * (Edge collections only.) Prefix to prepend to `_to` attribute values.
   */
  toPrefix?: string;
  /**
   * If set to `true`, the collection is truncated before the data is imported.
   *
   * Default: `false`
   */
  overwrite?: boolean;
  /**
   * Whether to wait for the documents to have been synced to disk.
   */
  waitForSync?: boolean;
  /**
   * Controls behavior when a unique constraint is violated.
   *
   * * `"error"`: the document will not be imported.
   * * `"update`: the document will be merged into the existing document.
   * * `"replace"`: the document will replace the existing document.
   * * `"ignore"`: the document will not be imported and the unique constraint
   *   error will be ignored.
   *
   * Default: `"error"`
   */
  onDuplicate?: "error" | "update" | "replace" | "ignore";
  /**
   * If set to `true`, the import will abort if any error occurs.
   */
  complete?: boolean;
  /**
   * Whether the response should contain additional details about documents
   * that could not be imported.
   */
  details?: boolean;
};

/**
 * Options for retrieving documents by example.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryByExampleOptions = {
  /**
   * TODO
   */
  skip?: number;
  /**
   * TODO
   */
  limit?: number;
  /**
   * TODO
   */
  batchSize?: number;
  /**
   * TODO
   */
  ttl?: number;
};

/**
 * Options for retrieving all documents in a collection.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryAllOptions = {
  /**
   * TODO
   */
  skip?: number;
  /**
   * TODO
   */
  limit?: number;
  /**
   * TODO
   */
  batchSize?: number;
  /**
   * TODO
   */
  ttl?: number;
  /**
   * TODO
   */
  stream?: boolean;
};

/**
 * Options for updating documents by example.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryUpdateByExampleOptions = {
  /**
   * TODO
   */
  keepNull?: boolean;
  /**
   * TODO
   */
  waitForSync?: boolean;
  /**
   * TODO
   */
  limit?: number;
  /**
   * TODO
   */
  mergeObjects?: boolean;
};

/**
 * Options for removing documents by example.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryRemoveByExampleOptions = {
  /**
   * TODO
   */
  waitForSync?: boolean;
  /**
   * TODO
   */
  limit?: number;
};

/**
 * Options for replacing documents by example.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryReplaceByExampleOptions = SimpleQueryRemoveByExampleOptions;

/**
 * Options for removing documents by keys.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryRemoveByKeysOptions = {
  /**
   * TODO
   */
  returnOld?: boolean;
  /**
   * TODO
   */
  silent?: boolean;
  /**
   * TODO
   */
  waitForSync?: boolean;
};

/**
 * Options for performing a fulltext query.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryFulltextOptions = {
  /**
   * TODO
   */
  index?: string;
  /**
   * TODO
   */
  limit?: number;
  /**
   * TODO
   */
  skip?: number;
};

/**
 * Options for performing a graph traversal.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type TraversalOptions = {
  /**
   * A string evaluating to the body of a JavaScript function to be executed
   * on the server to initialize the traversal result object.
   *
   * The code has access to two variables: `config`, `result`.
   * The code may modify the `result` object.
   *
   * **Note**: This code will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any other variables.
   *
   * See the official ArangoDB documentation for
   * {@link https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html | the JavaScript `@arangodb` module}
   * for information about accessing the database from within ArangoDB's
   * server-side JavaScript environment.
   */
  init?: string;
  /**
   * A string evaluating to the body of a JavaScript function to be executed
   * on the server to filter nodes.
   *
   * The code has access to three variables: `config`, `vertex`, `path`.
   * The code may include a return statement for the following values:
   *
   * * `"exclude"`: The vertex will not be visited.
   * * `"prune"`: The edges of the vertex will not be followed.
   * * `""` or `undefined`: The vertex will be visited and its edges followed.
   * * an array including any of the above values.
   *
   * **Note**: This code will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any other variables.
   *
   * See the official ArangoDB documentation for
   * {@link https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html | the JavaScript `@arangodb` module}
   * for information about accessing the database from within ArangoDB's
   * server-side JavaScript environment.
   */
  filter?: string;
  /**
   * A string evaluating to the body of a JavaScript function to be executed
   * on the server to sort edges if `expander` is not set.
   *
   * The code has access to two variables representing edges: `l`, `r`.
   * The code must return `-1` if `l < r`, `1` if `l > r` or `0` if both
   * values are equal.
   *
   * **Note**: This code will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any other variables.
   *
   * See the official ArangoDB documentation for
   * {@link https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html | the JavaScript `@arangodb` module}
   * for information about accessing the database from within ArangoDB's
   * server-side JavaScript environment.
   */
  sort?: string;
  /**
   * A string evaluating to the body of a JavaScript function to be executed
   * on the server when a node is visited.
   *
   * The code has access to five variables: `config`, `result`, `vertex`,
   * `path`, `connected`.
   * The code may modify the `result` object.
   *
   * **Note**: This code will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any other variables.
   *
   * See the official ArangoDB documentation for
   * {@link https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html | the JavaScript `@arangodb` module}
   * for information about accessing the database from within ArangoDB's
   * server-side JavaScript environment.
   */
  visitor?: string;
  /**
   * A string evaluating to the body of a JavaScript function to be executed
   * on the server to use when `direction` is not set.
   *
   * The code has access to three variables: `config`, `vertex`, `path`.
   * The code must return an array of objects with `edge` and `vertex`
   * attributes representing the connections for the vertex.
   *
   * **Note**: This code will be evaluated and executed on the
   * server inside ArangoDB's embedded JavaScript environment and can not
   * access any other variables.
   *
   * See the official ArangoDB documentation for
   * {@link https://www.arangodb.com/docs/stable/appendix-java-script-modules-arango-db.html | the JavaScript `@arangodb` module}
   * for information about accessing the database from within ArangoDB's
   * server-side JavaScript environment.
   */
  expander?: string;
  /**
   * Direction of the traversal, relative to the starting vertex if `expander`
   * is not set.
   */
  direction?: "inbound" | "outbound" | "any";
  /**
   * Item iteration order.
   */
  itemOrder?: "forward" | "backward";
  /**
   * Traversal strategy.
   */
  strategy?: "depthfirst" | "breadthfirst";
  /**
   * Traversal order.
   */
  order?: "preorder" | "postorder" | "preorder-expander";
  /**
   * Specifies uniqueness for vertices and edges.
   */
  uniqueness?: {
    /**
     * Uniqueness for vertices.
     */
    vertices?: "none" | "global" | "path";
    /**
     * Uniqueness for edges.
     */
    edges?: "none" | "global" | "path";
  };
  /**
   * If specified, only nodes in at least this depth will be visited.
   */
  minDepth?: number;
  /**
   * If specified, only nodes in at most this depth will be visited.
   */
  maxDepth?: number;
  /**
   * Maximum number of iterations before a traversal is aborted because of a
   * potential endless loop.
   */
  maxIterations?: number;
};

// Results

/**
 * Number of documents in a collection.
 */
export type CollectionCount = {
  /**
   * The number of documents in this collection.
   */
  count: number;
};

/**
 * Statistics of a collection.
 */
export type CollectionFigures = {
  /**
   * TODO
   */
  figures: {
    /**
     * TODO
     */
    alive: {
      count: number;
      size: number;
    };
    /**
     * TODO
     */
    dead: {
      count: number;
      size: number;
      deletion: number;
    };
    /**
     * TODO
     */
    datafiles: {
      count: number;
      fileSize: number;
    };
    /**
     * TODO
     */
    journals: {
      count: number;
      fileSize: number;
    };
    /**
     * TODO
     */
    compactors: {
      count: number;
      fileSize: number;
    };
    /**
     * TODO
     */
    shapefiles: {
      count: number;
      fileSize: number;
    };
    /**
     * TODO
     */
    shapes: {
      count: number;
      size: number;
    };
    /**
     * TODO
     */
    attributes: {
      count: number;
      size: number;
    };
    /**
     * TODO
     */
    indexes: {
      count: number;
      size: number;
    };
    /**
     * TODO
     */
    lastTick: number;
    /**
     * TODO
     */
    uncollectedLogfileEntries: number;
    /**
     * TODO
     */
    documentReferences: number;
    /**
     * TODO
     */
    waitingFor: string;
    /**
     * TODO
     */
    compactionStatus: {
      /**
       * TODO
       */
      time: string;
      /**
       * TODO
       */
      message: string;
      /**
       * TODO
       */
      count: number;
      /**
       * TODO
       */
      filesCombined: number;
      /**
       * TODO
       */
      bytesRead: number;
      /**
       * TODO
       */
      bytesWritten: number;
    };
  };
};

/**
 * Revision of a collection.
 */
export type CollectionRevision = {
  /**
   * TODO
   */
  revision: string;
};

/**
 * Checksum of a collection.
 */
export type CollectionChecksum = {
  /**
   * TODO
   */
  checksum: string;
};

/**
 * The result of a collection bulk import.
 */
export type CollectionImportResult = {
  /**
   * Whether the import failed.
   */
  error: false;
  /**
   * The number of new documents imported.
   */
  created: number;
  /**
   * The number of documents that failed with an error.
   */
  errors: number;
  /**
   * The number of empty documents.
   */
  empty: number;
  /**
   * The number of documents updated.
   */
  updated: number;
  /**
   * The number of documents that failed with an error that is ignored.
   */
  ignored: number;
  /**
   * Additional details about any errors encountered during the import.
   */
  details?: string[];
};

/**
 * Result of retrieving edges in a collection.
 */
export type CollectionEdgesResult<T extends object = any> = {
  /**
   * TODO
   */
  edges: Edge<T>[];
  /**
   * TODO
   */
  stats: {
    /**
     * TODO
     */
    scannedIndex: number;
    /**
     * TODO
     */
    filtered: number;
  };
};

/**
 * Result of removing documents by an example.
 *
 * See {@link Collection.removeByExample}.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryRemoveByExampleResult = {
  /**
   * Number of documents removed.
   */
  deleted: number;
};

/**
 * Result of replacing documents by an example.
 *
 * See {@link Collection.replaceByExample}.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryReplaceByExampleResult = {
  /**
   * Number of documents replaced.
   */
  replaced: number;
};

/**
 * Result of updating documents by an example.
 *
 * See {@link Collection.updateByExample}.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryUpdateByExampleResult = {
  /**
   * Number of documents updated.
   */
  updated: number;
};

/**
 * Result of removing documents by keys.
 *
 * See {@link Collection.removeByKeys}.
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryRemoveByKeysResult<T extends object = any> = {
  /**
   * Number of documents removed.
   */
  removed: number;
  /**
   * Number of documents not removed.
   */
  ignored: number;
  /**
   * Documents that have been removed.
   */
  old?: DocumentMetadata[] | Document<T>[];
};

// Collections

/**
 * Represents an document collection in a {@link Database}.
 *
 * See {@link EdgeCollection} for a variant of this interface more suited for
 * edge collections.
 */
export interface DocumentCollection<T extends object = any>
  extends ArangoCollection {
  /**
   * Checks whether the collection exists.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const result = await collection.exists();
   * // result indicates whether the collection exists
   * ```
   */
  exists(): Promise<boolean>;
  /**
   * Retrieves general information about the collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const data = await collection.get();
   * // data contains general information about the collection
   * ```
   */
  get(): Promise<ArangoResponseMetadata & CollectionMetadata>;
  /**
   * Creates a collection with the given `options` and the instance's name.
   *
   * See also {@link Database.createCollection} and
   * {@link Database.createEdgeCollection}.
   *
   * **Note**: When called on an {@link EdgeCollection} instance in TypeScript,
   * the `type` option must still be set to the correct {@link CollectionType}.
   * Otherwise this will result in the collection being created with the
   * default type (i.e. as a document collection).
   *
   * @param options - Options for creating the collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("potatoes");
   * await collection.create();
   * // the document collection "potatoes" now exists
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("friends");
   * await collection.create({ type: CollectionType.EDGE_COLLECTION });
   * // the edge collection "friends" now exists
   * ```
   *
   * @example
   * ```ts
   * interface Friend {
   *   startDate: number;
   *   endDate?: number;
   * }
   * const db = new Database();
   * const collection = db.collection("friends") as EdgeCollection<Friend>;
   * // even in TypeScript you still need to indicate the collection type
   * // if you want to create an edge collection
   * await collection.create({ type: CollectionType.EDGE_COLLECTION });
   * // the edge collection "friends" now exists
   * ```
   */
  create(
    options?: CreateCollectionOptions & {
      type?: CollectionType;
    }
  ): Promise<
    ArangoResponseMetadata & CollectionMetadata & CollectionProperties
  >;
  /**
   * Retrieves the collection's properties.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const data = await collection.properties();
   * // data contains the collection's properties
   * ```
   */
  properties(): Promise<
    ArangoResponseMetadata & CollectionMetadata & CollectionProperties
  >;
  /**
   * Replaces the properties of the collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const result = await collection.setProperties({ waitForSync: true });
   * // the collection will now wait for data being written to disk
   * // whenever a document is changed
   * ```
   */
  properties(
    properties: CollectionPropertiesOptions
  ): Promise<
    ArangoResponseMetadata & CollectionMetadata & CollectionProperties
  >;
  /**
   * Retrieves information about the number of documents in a collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const data = await collection.count();
   * // data contains the collection's count
   * ```
   */
  count(): Promise<
    ArangoResponseMetadata &
      CollectionMetadata &
      CollectionProperties &
      CollectionCount
  >;
  /**
   * (RocksDB only.) Instructs ArangoDB to recalculate the collection's
   * document count to fix any inconsistencies.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("inconsistent-collection");
   * const badData = await collection.count();
   * // oh no, the collection count looks wrong -- fix it!
   * await collection.recalculateCount();
   * const goodData = await collection.count();
   * // goodData contains the collection's improved count
   * ```
   */
  recalculateCount(): Promise<boolean>;
  /**
   * Retrieves statistics for a collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const data = await collection.figures();
   * // data contains the collection's figures
   * ```
   */
  figures(): Promise<
    ArangoResponseMetadata &
      CollectionMetadata &
      CollectionProperties &
      CollectionCount &
      CollectionFigures
  >;
  /**
   * Retrieves the collection revision ID.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const data = await collection.revision();
   * // data contains the collection's revision
   * ```
   */
  revision(): Promise<
    ArangoResponseMetadata &
      CollectionMetadata &
      CollectionProperties &
      CollectionRevision
  >;
  /**
   * Retrieves the collection checksum.
   *
   * @param options - Options for retrieving the checksum.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const data = await collection.checksum();
   * // data contains the collection's checksum
   * ```
   */
  checksum(
    options?: CollectionChecksumOptions
  ): Promise<
    ArangoResponseMetadata &
      CollectionMetadata &
      CollectionRevision &
      CollectionChecksum
  >;
  /**
   * Instructs ArangoDB to load the collection into memory.
   *
   * @param count - Whether the number of documents in the collection should
   * be included in the server response. Disabling this may speed up this
   * process in future versions of ArangoDB.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.load();
   * // the collection has now been loaded into memory
   * ```
   */
  load(
    count?: true
  ): Promise<ArangoResponseMetadata & CollectionMetadata & CollectionCount>;
  /**
   * Instructs ArangoDB to load the collection into memory.
   *
   * @param count - Whether the number of documents in the collection should
   * be included in the server response. Disabling this may speed up this
   * process in future versions of ArangoDB.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.load(false);
   * // the collection has now been loaded into memory
   * ```
   */
  load(count: false): Promise<ArangoResponseMetadata & CollectionMetadata>;
  /**
   * (RocksDB only.) Instructs ArangoDB to load as many indexes of the
   * collection into memory as permitted by the memory limit.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("indexed-collection");
   * await collection.loadIndexes();
   * // the indexes are now loaded into memory
   * ```
   */
  loadIndexes(): Promise<boolean>;
  /**
   * Instructs ArangoDB to remove the collection from memory.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.unload();
   * // the collection has now been unloaded from memory
   * ```
   */
  unload(): Promise<ArangoResponseMetadata & CollectionMetadata>;
  /**
   * Renames the collection and updates the instance's `name` to `newName`.
   *
   * Additionally removes the instance from the {@link Database}'s internal
   * cache.
   *
   * **Note**: Renaming collections may not be supported when ArangoDB is
   * running in a cluster configuration.
   *
   * @param newName - The new name of the collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection1 = db.collection("some-collection");
   * await collection1.rename("other-collection");
   * const collection2 = db.collection("some-collection");
   * const collection3 = db.collection("other-collection");
   * // Note all three collection instances are different objects but
   * // collection1 and collection3 represent the same ArangoDB collection!
   * ```
   */
  rename(newName: string): Promise<ArangoResponseMetadata & CollectionMetadata>;
  /**
   * (MMFiles single-server only.) Rotates the journal of the collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const rotated = await collection.rotate();
   * ```
   */
  rotate(): Promise<boolean>;
  /**
   * Deletes all documents in the collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.truncate();
   * // millions of documents cry out in terror and are suddenly silenced,
   * // the collection "some-collection" is now empty
   * ```
   */
  truncate(): Promise<ArangoResponseMetadata & CollectionMetadata>;
  /**
   * Deletes the collection from the database.
   *
   * @param options - Options for dropping the collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.drop();
   * // The collection "some-collection" is now an ex-collection
   * ```
   */
  drop(options?: CollectionDropOptions): Promise<ArangoResponseMetadata>;

  //#region crud
  /**
   * TODO
   */
  getResponsibleShard(document: Partial<Document<T>>): Promise<string>;
  /**
   * Derives a document `_id` from the given selector for this collection.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const meta = await collection.save({ foo: "bar" }, { returnNew: true });
   * const doc = meta.new;
   * console.log(collection.documentId(meta)); // via meta._id
   * console.log(collection.documentId(doc)); // via doc._id
   * console.log(collection.documentId(meta._key)); // also works
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection1 = db.collection("some-collection");
   * const collection2 = db.collection("other-collection");
   * const meta = await collection1.save({ foo: "bar" });
   * // Mixing collections is usually a mistake
   * console.log(collection1.documentId(meta)); // ok: same collection
   * console.log(collection2.documentId(meta)); // throws: wrong collection
   * console.log(collection2.documentId(meta._id)); // also throws
   * console.log(collection2.documentId(meta._key)); // ok but wrong collection
   * ```
   */
  documentId(selector: DocumentSelector): string;
  /**
   * Checks whether a document matching the given key or id exists in this
   * collection.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const exists = await collection.documentExists("abc123");
   * if (!exists) {
   *   console.log("Document does not exist");
   * }
   * ```
   */
  documentExists(selector: DocumentSelector): Promise<boolean>;
  /**
   * Retrives the document matching the given key or id.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param options - Options for retrieving the document.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * try {
   *   const document = await collection.document("abc123");
   *   console.log(document);
   * } catch (e) {
   *   console.error("Could not find document");
   * }
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const document = await collection.document("abc123", { graceful: true });
   * if (document) {
   *   console.log(document);
   * } else {
   *   console.error("Could not find document");
   * }
   * ```
   */
  document(
    selector: DocumentSelector,
    options?: CollectionReadOptions
  ): Promise<Document<T>>;
  /**
   * Retrives the document matching the given key or id.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param graceful - If set to `true`, `null` is returned instead of an
   * exception being thrown if the document does not exist.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * try {
   *   const document = await collection.document("abc123");
   *   console.log(document);
   * } catch (e) {
   *   console.error("Could not find document");
   * }
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const document = await collection.document("abc123", true);
   * if (document) {
   *   console.log(document);
   * } else {
   *   console.error("Could not find document");
   * }
   * ```
   */
  document(selector: DocumentSelector, graceful: boolean): Promise<Document<T>>;
  /**
   * Inserts a new document with the given `data` into the collection.
   *
   * @param data - The contents of the new document.
   * @param options - Options for inserting the document.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const result = await collection.save(
   *   { _key: "a", color: "blue", count: 1 },
   *   { returnNew: true }
   * );
   * console.log(result.new.color, result.new.count); // "blue" 1
   * ```
   */
  save(
    data: DocumentData<T>,
    options?: CollectionInsertOptions
  ): Promise<DocumentMetadata & { new?: Document<T> }>;
  /**
   * Inserts new documents with the given `data` into the collection.
   *
   * @param data - The contents of the new documents.
   * @param options - Options for inserting the documents.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const result = await collection.save(
   *   [
   *     { _key: "a", color: "blue", count: 1 },
   *     { _key: "b", color: "red", count: 2 },
   *   ],
   *   { returnNew: true }
   * );
   * console.log(result[0].new.color, result[0].new.count); // "blue" 1
   * console.log(result[1].new.color, result[1].new.count); // "red" 2
   * ```
   */
  saveAll(
    data: Array<DocumentData<T>>,
    options?: CollectionInsertOptions
  ): Promise<Array<DocumentMetadata & { new?: Document<T> }>>;
  /**
   * Replaces an existing document in the collection.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param newData - The contents of the new document.
   * @param options - Options for replacing the document.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.save({ _key: "a", color: "blue", count: 1 });
   * const result = await collection.replace(
   *   "a",
   *   { color: "red" },
   *   { returnNew: true }
   * );
   * console.log(result.new.color, result.new.count); // "red" undefined
   * ```
   */
  replace(
    selector: DocumentSelector,
    newData: DocumentData<T>,
    options?: CollectionReplaceOptions
  ): Promise<DocumentMetadata & { new?: Document<T>; old?: Document<T> }>;
  /**
   * Replaces existing documents in the collection, identified by the `_key` or
   * `_id` of each document.
   *
   * @param newData - The documents to replace.
   * @param options - Options for replacing the documents.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.save({ _key: "a", color: "blue", count: 1 });
   * await collection.save({ _key: "b", color: "green", count: 3 });
   * const result = await collection.replaceAll(
   *   [
   *     { _key: "a", color: "red" },
   *     { _key: "b", color: "yellow", count: 2 }
   *   ],
   *   { returnNew: true }
   * );
   * console.log(result[0].new.color, result[0].new.count); // "red" undefined
   * console.log(result[1].new.color, result[1].new.count); // "yellow" 2
   * ```
   */
  replaceAll(
    newData: Array<DocumentData<T> & ({ _key: string } | { _id: string })>,
    options?: CollectionReplaceOptions
  ): Promise<
    Array<DocumentMetadata & { new?: Document<T>; old?: Document<T> }>
  >;
  /**
   * Updates an existing document in the collection.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param newData - The data for updating the document.
   * @param options - Options for updating the document.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.save({ _key: "a", color: "blue", count: 1 });
   * const result = await collection.update(
   *   "a",
   *   { count: 2 },
   *   { returnNew: true }
   * );
   * console.log(result.new.color, result.new.count); // "blue" 2
   * ```
   */
  update(
    selector: DocumentSelector,
    newData: Patch<DocumentData<T>>,
    options?: CollectionUpdateOptions
  ): Promise<DocumentMetadata & { new?: Document<T>; old?: Document<T> }>;
  /**
   * Updates existing documents in the collection, identified by the `_key` or
   * `_id` of each document.
   *
   * @param newData - The data for updating the documents.
   * @param options - Options for updating the documents.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.save({ _key: "a", color: "blue", count: 1 });
   * await collection.save({ _key: "b", color: "green", count: 3 });
   * const result = await collection.updateAll(
   *   [
   *     { _key: "a", count: 2 },
   *     { _key: "b", count: 4 }
   *   ],
   *   { returnNew: true }
   * );
   * console.log(result[0].new.color, result[0].new.count); // "blue" 2
   * console.log(result[1].new.color, result[1].new.count); // "green" 4
   * ```
   */
  updateAll(
    newData: Array<
      Patch<DocumentData<T>> & ({ _key: string } | { _id: string })
    >,
    options?: CollectionUpdateOptions
  ): Promise<
    Array<DocumentMetadata & { new?: Document<T>; old?: Document<T> }>
  >;
  /**
   * Removes an existing document from the collection.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param options - Options for removing the document.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.remove("abc123");
   * // document with key "abc123" deleted
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const doc = await collection.document("abc123");
   * await collection.remove(doc);
   * // document with key "abc123" deleted
   * ```
   */
  remove(
    selector: DocumentSelector,
    options?: CollectionRemoveOptions
  ): Promise<DocumentMetadata & { old?: Document<T> }>;
  /**
   * Removes existing documents from the collection.
   *
   * Throws an exception when passed any document or `_id` from a different
   * collection.
   *
   * @param selectors - Documents `_key`, `_id` or objects with either of those
   * properties (e.g. documents from this collection).
   * @param options - Options for removing the documents.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.removeAll(["abc123", "def456"]);
   * // document with keys "abc123" and "def456" deleted
   * ```
   */
  removeAll(
    selectors: DocumentSelector[],
    options?: CollectionRemoveOptions
  ): Promise<Array<DocumentMetadata & { old?: Document<T> }>>;
  /**
   * Bulk imports the given `data` into the collection.
   *
   * @param data - The data to import, as an array of document data.
   * @param options - Options for importing the data.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.import(
   *   [
   *     { _key: "jcd", password: "bionicman" },
   *     { _key: "jreyes", password: "amigo" },
   *     { _key: "ghermann", password: "zeitgeist" }
   *   ]
   * );
   * ```
   */
  import(
    data: DocumentData<T>[],
    options?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  /**
   * Bulk imports the given `data` into the collection.
   *
   * @param data - The data to import, as an array containing a single array of
   * attribute names followed by one or more arrays of attribute values for
   * each document.
   * @param options - Options for importing the data.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.import(
   *   [
   *     [ "_key", "password" ],
   *     [ "jcd", "bionicman" ],
   *     [ "jreyes", "amigo" ],
   *     [ "ghermann", "zeitgeist" ]
   *   ]
   * );
   * ```
   */
  import(
    data: any[][],
    options?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  /**
   * Bulk imports the given `data` into the collection.
   *
   * If `type` is omitted, `data` must contain one JSON array per line with
   * the first array providing the attribute names and all other arrays
   * providing attribute values for each document.
   *
   * If `type` is set to `"documents"`, `data` must contain one JSON document
   * per line.
   *
   * If `type` is set to `"list"`, `data` must contain a JSON array of
   * documents.
   *
   * If `type` is set to `"auto"`, `data` can be in either of the formats
   * supported by `"documents"` or `"list"`.
   *
   * @param data - The data to import as a Buffer (Node), Blob (browser) or
   * string.
   * @param options - Options for importing the data.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.import(
   *   '{"_key":"jcd","password":"bionicman"}\r\n' +
   *   '{"_key":"jreyes","password":"amigo"}\r\n' +
   *   '{"_key":"ghermann","password":"zeitgeist"}\r\n',
   *   { type: "documents" } // or "auto"
   * );
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.import(
   *   '[{"_key":"jcd","password":"bionicman"},' +
   *   '{"_key":"jreyes","password":"amigo"},' +
   *   '{"_key":"ghermann","password":"zeitgeist"}]',
   *   { type: "list" } // or "auto"
   * );
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.import(
   *   '["_key","password"]\r\n' +
   *   '["jcd","bionicman"]\r\n' +
   *   '["jreyes","amigo"]\r\n' +
   *   '["ghermann","zeitgeist"]\r\n'
   * );
   * ```
   */
  import(
    data: Buffer | Blob | string,
    options?: CollectionImportOptions & {
      type?: "documents" | "list" | "auto";
    }
  ): Promise<CollectionImportResult>;
  //#endregion

  //#region simple queries

  /**
   * Retrives a list of references for all documents in the collection.
   *
   * @param type - The type of document reference to retrieve.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  list(type?: SimpleQueryListType): Promise<ArrayCursor<string>>;

  /**
   * Retrieves all documents in the collection.
   *
   * @param options - Options for retrieving the documents.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  all(options?: SimpleQueryAllOptions): Promise<ArrayCursor<Document<T>>>;

  /**
   * Retrieves a random document from the collection.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  any(): Promise<Document<T>>;

  /**
   * Retrieves all documents in the collection matching the given example.
   *
   * @param example - An object representing an example for documents.
   * @param options - Options for retrieving the documents.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  byExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryByExampleOptions
  ): Promise<ArrayCursor<Document<T>>>;

  /**
   * Retrieves a single document in he collection matching the given example.
   *
   * @param example - An object representing an example for the document.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  firstExample(example: Partial<DocumentData<T>>): Promise<Document<T>>;

  /**
   * Removes all documents in the collection matching the given example.
   *
   * @param example - An object representing an example for the document.
   * @param options - Options for removing the documents.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  removeByExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryRemoveByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryRemoveByExampleResult>;

  /**
   * Replaces all documents in the collection matching the given example.
   *
   * @param example - An object representing an example for the documents.
   * @param newData - Document data to replace the matching documents with.
   * @param options - Options for replacing the documents.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  replaceByExample(
    example: Partial<DocumentData<T>>,
    newData: DocumentData<T>,
    options?: SimpleQueryReplaceByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryReplaceByExampleResult>;

  /**
   * Updates all documents in the collection matching the given example.
   *
   * @param example - An object representing an example for the documents.
   * @param newData - Document data to update the matching documents with.
   * @param options - Options for updating the documents.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  updateByExample(
    example: Partial<DocumentData<T>>,
    newData: Patch<DocumentData<T>>,
    options?: SimpleQueryUpdateByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryUpdateByExampleResult>;

  /**
   * Retrieves all documents matching the given document keys.
   *
   * @param keys - An array of document keys to look up.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  lookupByKeys(keys: string[]): Promise<Document<T>[]>;

  /**
   * Removes all documents matching the given document keys.
   *
   * @param keys - An array of document keys to remove.
   * @param options - Options for removing the documents.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  removeByKeys(
    keys: string[],
    options?: SimpleQueryRemoveByKeysOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryRemoveByKeysResult<T>>;

  /**
   * Performs a fulltext query in the given `attribute` on the collection.
   *
   * @param attribute - Name of the field to search.
   * @param query - Fulltext query string to search for.
   * @param options - Options for performing the fulltext query.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  fulltext(
    attribute: string,
    query: string,
    options?: SimpleQueryFulltextOptions
  ): Promise<ArrayCursor<Document<T>>>;
  //#endregion

  //#region indexes
  /**
   * Returns a list of all index descriptions for the collection.
   */
  indexes(): Promise<Index[]>;
  /**
   * Returns an index description by name or `id` if it exists.
   *
   * @param selector - Index name, id or object with either property.
   */
  index(selector: IndexSelector): Promise<Index>;
  /**
   * Creates a persistent index on the collection if it does not already exist.
   *
   * @param details - Options for creating the persistent index.
   *
   * @example
   * ```js
   * // Create a unique index for looking up documents by username
   * await collection.ensureIndex({
   *   type: "persistent",
   *   fields: ["username"],
   *   name: "unique-usernames",
   *   unique: true
   * });
   * ```
   */
  ensureIndex(
    details: EnsurePersistentIndexOptions
  ): Promise<
    ArangoResponseMetadata & PersistentIndex & { isNewlyCreated: boolean }
  >;
  /**
   * Creates a hash index on the collection if it does not already exist.
   *
   * When using the RocksDB storage engine, hash indexes behave identically
   * to persistent indexes.
   *
   * @param details - Options for creating the hash index.
   *
   * @example
   * ```js
   * // Create a unique index for looking up documents by username
   * await collection.ensureIndex({
   *   type: "hash",
   *   fields: ["username"],
   *   name: "unique-usernames",
   *   unique: true
   * });
   * ```
   */
  ensureIndex(
    details: EnsureHashIndexOptions
  ): Promise<ArangoResponseMetadata & HashIndex & { isNewlyCreated: boolean }>;
  /**
   * Creates a skiplist index on the collection if it does not already exist.
   *
   * When using the RocksDB storage engine, skiplist indexes behave identically
   * to persistent indexes.
   *
   * @param details - Options for creating the skiplist index.
   *
   * @example
   * ```js
   * // Create an index for sorting email addresses
   * await collection.ensureIndex({
   *   type: "skiplist",
   *   fields: ["email"]
   * });
   * ```
   */
  ensureIndex(
    details: EnsureSkiplistIndexOptions
  ): Promise<
    ArangoResponseMetadata & SkiplistIndex & { isNewlyCreated: boolean }
  >;
  /**
   * Creates a TTL index on the collection if it does not already exist.
   *
   * @param details - Options for creating the TTL index.
   *
   * @example
   * ```js
   * // Expire documents with "createdAt" timestamp one day after creation
   * await collection.ensureIndex({
   *   type: "ttl",
   *   fields: ["createdAt"],
   *   expireAfter: 60 * 60 * 24 // 24 hours
   * });
   * ```
   *
   * @example
   * ```js
   * // Expire documents with "expiresAt" timestamp according to their value
   * await collection.ensureIndex({
   *   type: "ttl",
   *   fields: ["expiresAt"],
   *   expireAfter: 0 // when attribute value is exceeded
   * });
   * ```
   */
  ensureIndex(
    details: EnsureTtlIndexOptions
  ): Promise<ArangoResponseMetadata & TtlIndex & { isNewlyCreated: boolean }>;
  /**
   * Creates a fulltext index on the collection if it does not already exist.
   *
   * @param details - Options for creating the fulltext index.
   *
   * @example
   * ```js
   * // Create a fulltext index for tokens longer than or equal to 3 characters
   * await collection.ensureIndex({
   *   type: "fulltext",
   *   fields: ["description"],
   *   minLength: 3
   * });
   * ```
   */
  ensureIndex(
    details: EnsureFulltextIndexOptions
  ): Promise<
    ArangoResponseMetadata & FulltextIndex & { isNewlyCreated: boolean }
  >;
  /**
   * Creates a geo index on the collection if it does not already exist.
   *
   * @param details - Options for creating the geo index.
   *
   * @example
   * ```js
   * // Create an index for GeoJSON data
   * await collection.ensureIndex({
   *   type: "geo",
   *   fields: ["lngLat"],
   *   geoJson: true
   * });
   * ```
   */
  ensureIndex(
    details: EnsureGeoIndexOptions
  ): Promise<ArangoResponseMetadata & GeoIndex & { isNewlyCreated: boolean }>;
  /**
   * Deletes the index with the given name or `id` from the database.
   *
   * @param selector - Index name, id or object with either property.
   */
  dropIndex(
    selector: IndexSelector
  ): Promise<ArangoResponseMetadata & { id: string }>;
  //#endregion
}

/**
 * Represents an edge collection in a {@link Database}.
 *
 * See {@link DocumentCollection} for a more generic variant of this interface
 * more suited for regular document collections.
 */
export interface EdgeCollection<T extends object = any>
  extends DocumentCollection<T> {
  /**
   * Retrives the document matching the given key or id.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection, or if the document does not exist.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param options - Options for retrieving the document.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * try {
   *   const document = await collection.document("abc123");
   *   console.log(document);
   * } catch (e) {
   *   console.error("Could not find document");
   * }
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const document = await collection.document("abc123", { graceful: true });
   * if (document) {
   *   console.log(document);
   * } else {
   *   console.error("Document does not exist");
   * }
   * ```
   */
  document(
    selector: DocumentSelector,
    options?: CollectionReadOptions
  ): Promise<Edge<T>>;
  /**
   * Retrives the document matching the given key or id.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection, or if the document does not exist.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param graceful - If set to `true`, `null` is returned instead of an
   * exception being thrown if the document does not exist.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * try {
   *   const document = await collection.document("abc123");
   *   console.log(document);
   * } catch (e) {
   *   console.error("Could not find document");
   * }
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const document = await collection.document("abc123", true);
   * if (document) {
   *   console.log(document);
   * } else {
   *   console.error("Document does not exist");
   * }
   * ```
   */
  document(selector: DocumentSelector, graceful: boolean): Promise<Edge<T>>;
  /**
   * Inserts a new document with the given `data` into the collection.
   *
   * @param data - The contents of the new document.
   * @param options - Options for inserting the document.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("friends");
   * const result = await collection.save(
   *   { _from: "users/rana", _to: "users/mudasir", active: false },
   *   { returnNew: true }
   * );
   * ```
   */
  save(
    data: EdgeData<T>,
    options?: CollectionInsertOptions
  ): Promise<DocumentMetadata & { new?: Edge<T> }>;
  /**
   * Inserts new documents with the given `data` into the collection.
   *
   * @param data - The contents of the new documents.
   * @param options - Options for inserting the documents.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("friends");
   * const result = await collection.saveAll(
   *   [
   *     { _from: "users/rana", _to: "users/mudasir", active: false },
   *     { _from: "users/rana", _to: "users/salman", active: true }
   *   ],
   *   { returnNew: true }
   * );
   * ```
   */
  saveAll(
    data: Array<EdgeData<T>>,
    options?: CollectionInsertOptions
  ): Promise<Array<DocumentMetadata & { new?: Edge<T> }>>;
  /**
   * Replaces an existing document in the collection.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param newData - The contents of the new document.
   * @param options - Options for replacing the document.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("friends");
   * await collection.save(
   *   {
   *     _key: "musadir",
   *     _from: "users/rana",
   *     _to: "users/mudasir",
   *     active: true,
   *     best: true
   *   }
   * );
   * const result = await collection.replace(
   *   "musadir",
   *   { active: false },
   *   { returnNew: true }
   * );
   * console.log(result.new.active, result.new.best); // false undefined
   * ```
   */
  replace(
    selector: DocumentSelector,
    newData: DocumentData<T>,
    options?: CollectionReplaceOptions
  ): Promise<DocumentMetadata & { new?: Edge<T>; old?: Edge<T> }>;
  /**
   * Replaces existing documents in the collection, identified by the `_key` or
   * `_id` of each document.
   *
   * @param newData - The documents to replace.
   * @param options - Options for replacing the documents.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("friends");
   * await collection.save(
   *   {
   *     _key: "musadir",
   *     _from: "users/rana",
   *     _to: "users/mudasir",
   *     active: true,
   *     best: true
   *   }
   * );
   * await collection.save(
   *   {
   *     _key: "salman",
   *     _from: "users/rana",
   *     _to: "users/salman",
   *     active: false,
   *     best: false
   *   }
   * );
   * const result = await collection.replaceAll(
   *   [
   *     { _key: "musadir", active: false },
   *     { _key: "salman", active: true, best: true }
   *   ],
   *   { returnNew: true }
   * );
   * console.log(result[0].new.active, result[0].new.best); // false undefined
   * console.log(result[1].new.active, result[1].new.best); // true true
   * ```
   */
  replaceAll(
    newData: Array<DocumentData<T> & ({ _key: string } | { _id: string })>,
    options?: CollectionReplaceOptions
  ): Promise<Array<DocumentMetadata & { new?: Edge<T>; old?: Edge<T> }>>;
  /**
   * Updates an existing document in the collection.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param newData - The data for updating the document.
   * @param options - Options for updating the document.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("friends");
   * await collection.save(
   *   {
   *     _key: "musadir",
   *     _from: "users/rana",
   *     _to: "users/mudasir",
   *     active: true,
   *     best: true
   *   }
   * );
   * const result = await collection.update(
   *   "musadir",
   *   { active: false },
   *   { returnNew: true }
   * );
   * console.log(result.new.active, result.new.best); // false true
   */
  update(
    selector: DocumentSelector,
    newData: Patch<DocumentData<T>>,
    options?: CollectionUpdateOptions
  ): Promise<DocumentMetadata & { new?: Edge<T>; old?: Edge<T> }>;
  /**
   * Updates existing documents in the collection, identified by the `_key` or
   * `_id` of each document.
   *
   * @param newData - The data for updating the documents.
   * @param options - Options for updating the documents.
   * ```js
   * const db = new Database();
   * const collection = db.collection("friends");
   * await collection.save(
   *   {
   *     _key: "musadir",
   *     _from: "users/rana",
   *     _to: "users/mudasir",
   *     active: true,
   *     best: true
   *   }
   * );
   * await collection.save(
   *   {
   *     _key: "salman",
   *     _from: "users/rana",
   *     _to: "users/salman",
   *     active: false,
   *     best: false
   *   }
   * );
   * const result = await collection.updateAll(
   *   [
   *     { _key: "musadir", active: false },
   *     { _key: "salman", active: true, best: true }
   *   ],
   *   { returnNew: true }
   * );
   * console.log(result[0].new.active, result[0].new.best); // false true
   * console.log(result[1].new.active, result[1].new.best); // true true
   * ```
   */
  updateAll(
    newData: Array<
      Patch<DocumentData<T>> & ({ _key: string } | { _id: string })
    >,
    options?: CollectionUpdateOptions
  ): Promise<Array<DocumentMetadata & { new?: Edge<T>; old?: Edge<T> }>>;
  /**
   * Removes an existing document from the collection.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param options - Options for removing the document.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("friends");
   * const doc = await collection.document("musadir");
   * await collection.remove(doc);
   * // document with key "musadir" deleted
   * ```
   */
  remove(
    selector: DocumentSelector,
    options?: CollectionRemoveOptions
  ): Promise<DocumentMetadata & { old?: Edge<T> }>;
  /**
   * Removes existing documents from the collection.
   *
   * Throws an exception when passed any document or `_id` from a different
   * collection.
   *
   * @param selectors - Documents `_key`, `_id` or objects with either of those
   * properties (e.g. documents from this collection).
   * @param options - Options for removing the documents.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("friends");
   * await collection.removeAll(["musadir", "salman"]);
   * // document with keys "musadir" and "salman" deleted
   * ```
   */
  removeAll(
    selectors: DocumentSelector[],
    options?: CollectionRemoveOptions
  ): Promise<Array<DocumentMetadata & { old?: Edge<T> }>>;
  /**
   * Bulk imports the given `data` into the collection.
   *
   * @param data - The data to import, as an array of edge data.
   * @param options - Options for importing the data.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.import(
   *   [
   *     { _key: "x", _from: "vertices/a", _to: "vertices/b", weight: 1 },
   *     { _key: "y", _from: "vertices/a", _to: "vertices/c", weight: 2 }
   *   ]
   * );
   * ```
   */
  import(
    data: EdgeData<T>[],
    options?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  /**
   * Bulk imports the given `data` into the collection.
   *
   * @param data - The data to import, as an array containing a single array of
   * attribute names followed by one or more arrays of attribute values for
   * each edge document.
   * @param options - Options for importing the data.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.import(
   *   [
   *     [ "_key", "_from", "_to", "weight" ],
   *     [ "x", "vertices/a", "vertices/b", 1 ],
   *     [ "y", "vertices/a", "vertices/c", 2 ]
   *   ]
   * );
   * ```
   */
  import(
    data: any[][],
    options?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  /**
   * Bulk imports the given `data` into the collection.
   *
   * If `type` is omitted, `data` must contain one JSON array per line with
   * the first array providing the attribute names and all other arrays
   * providing attribute values for each edge document.
   *
   * If `type` is set to `"documents"`, `data` must contain one JSON document
   * per line.
   *
   * If `type` is set to `"list"`, `data` must contain a JSON array of
   * edge documents.
   *
   * If `type` is set to `"auto"`, `data` can be in either of the formats
   * supported by `"documents"` or `"list"`.
   *
   * @param data - The data to import as a Buffer (Node), Blob (browser) or
   * string.
   * @param options - Options for importing the data.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.import(
   *   '{"_key":"x","_from":"vertices/a","_to":"vertices/b","weight":1}\r\n' +
   *   '{"_key":"y","_from":"vertices/a","_to":"vertices/c","weight":2}\r\n',
   *   { type: "documents" } // or "auto"
   * );
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.import(
   *   '[{"_key":"x","_from":"vertices/a","_to":"vertices/b","weight":1},' +
   *   '{"_key":"y","_from":"vertices/a","_to":"vertices/c","weight":2}]',
   *   { type: "list" } // or "auto"
   * );
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.import(
   *   '["_key","_from","_to","weight"]\r\n' +
   *   '["x","vertices/a","vertices/b",1]\r\n' +
   *   '["y","vertices/a","vertices/c",2]\r\n'
   * );
   * ```
   */
  import(
    data: Buffer | Blob | string,
    options?: CollectionImportOptions & {
      type?: "documents" | "list" | "auto";
    }
  ): Promise<CollectionImportResult>;
  //#endregion

  //#region simple queries

  /**
   * Retrieves all documents in the collection.
   *
   * @param options - Options for retrieving the documents.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  all(options?: SimpleQueryAllOptions): Promise<ArrayCursor<Edge<T>>>;

  /**
   * Retrieves a random document from the collection.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  any(): Promise<Edge<T>>;

  /**
   * Retrieves all documents in the collection matching the given example.
   *
   * @param example - An object representing an example for documents.
   * @param options - Options for retrieving the documents.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  byExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryByExampleOptions
  ): Promise<ArrayCursor<Edge<T>>>;

  /**
   * Retrieves a single document in he collection matching the given example.
   *
   * @param example - An object representing an example for the document.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  firstExample(example: Partial<DocumentData<T>>): Promise<Edge<T>>;

  /**
   * Retrieves all documents matching the given document keys.
   *
   * @param keys - An array of document keys to look up.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  lookupByKeys(keys: string[]): Promise<Edge<T>[]>;

  /**
   * Performs a fulltext query in the given `attribute` on the collection.
   *
   * @param attribute - Name of the field to search.
   * @param query - Fulltext query string to search for.
   * @param options - Options for performing the fulltext query.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  fulltext(
    attribute: string,
    query: string,
    options?: SimpleQueryFulltextOptions
  ): Promise<ArrayCursor<Edge<T>>>;
  //#endregion

  //#region edges
  /**
   * Retrieves a list of all edges of the document matching the given
   * `selector`.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("edges");
   * await collection.import([
   *   ["_key", "_from", "_to"],
   *   ["x", "vertices/a", "vertices/b"],
   *   ["y", "vertices/a", "vertices/c"],
   *   ["z", "vertices/d", "vertices/a"],
   * ]);
   * const edges = await collection.edges("vertices/a");
   * console.log(edges.map((edge) => edge._key)); // ["x", "y", "z"]
   * ```
   */
  edges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  /**
   * Retrieves a list of all incoming edges of the document matching the given
   * `selector`.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("edges");
   * await collection.import([
   *   ["_key", "_from", "_to"],
   *   ["x", "vertices/a", "vertices/b"],
   *   ["y", "vertices/a", "vertices/c"],
   *   ["z", "vertices/d", "vertices/a"],
   * ]);
   * const edges = await collection.inEdges("vertices/a");
   * console.log(edges.map((edge) => edge._key)); // ["z"]
   */
  inEdges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  /**
   * Retrieves a list of all outgoing edges of the document matching the given
   * `selector`.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("edges");
   * await collection.import([
   *   ["_key", "_from", "_to"],
   *   ["x", "vertices/a", "vertices/b"],
   *   ["y", "vertices/a", "vertices/c"],
   *   ["z", "vertices/d", "vertices/a"],
   * ]);
   * const edges = await collection.outEdges("vertices/a");
   * console.log(edges.map((edge) => edge._key)); // ["x", "y"]
   * ```
   */
  outEdges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;

  /**
   * Performs a traversal starting from the given `startVertex` and following
   * edges contained in this edge collection.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * See also {@link Graph.traversal}.
   *
   * @param startVertex - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param options - Options for performing the traversal.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("edges");
   * await collection.import([
   *   ["_key", "_from", "_to"],
   *   ["x", "vertices/a", "vertices/b"],
   *   ["y", "vertices/b", "vertices/c"],
   *   ["z", "vertices/c", "vertices/d"],
   * ]);
   * const result = await collection.traversal("vertices/a", {
   *   direction: "outbound",
   *   init: "result.vertices = [];",
   *   visitor: "result.vertices.push(vertex._key);",
   * });
   * console.log(result.vertices); // ["a", "b", "c", "d"]
   * ```
   */
  traversal(
    startVertex: DocumentSelector,
    options?: TraversalOptions
  ): Promise<any>;
  //#endregion
}

/**
 * The `Collection` type represents a collection in a {@link Database}.
 *
 * When using TypeScript, collections can be cast to {@link DocumentCollection}
 * or {@link EdgeCollection} in order to increase type safety.
 *
 * @param T - Type to use for document data. Defaults to `any`.
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
export class Collection<T extends object = any>
  implements EdgeCollection<T>, DocumentCollection<T> {
  //#region attributes
  protected _name: string;
  protected _db: Database;
  //#endregion

  /**
   * @internal
   * @hidden
   */
  constructor(db: Database, name: string) {
    this._name = name;
    this._db = db;
  }

  //#region internals
  protected _get<T extends {}>(path: string, qs?: any) {
    return this._db.request(
      { path: `/_api/collection/${this._name}/${path}`, qs },
      (res) => res.body as ArangoResponseMetadata & T
    );
  }

  protected _put<T extends {}>(path: string, body?: any) {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/collection/${this._name}/${path}`,
        body,
      },
      (res) => res.body as ArangoResponseMetadata & T
    );
  }
  //#endregion

  //#region metadata
  get isArangoCollection(): true {
    return true;
  }

  get name() {
    return this._name;
  }

  get() {
    return this._db.request(
      { path: `/_api/collection/${this._name}` },
      (res) => res.body
    );
  }

  async exists() {
    try {
      await this.get();
      return true;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === COLLECTION_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  create(
    options?: CreateCollectionOptions & {
      type?: CollectionType;
    }
  ) {
    const {
      waitForSyncReplication = undefined,
      enforceReplicationFactor = undefined,
      ...opts
    } = options || {};
    const qs: Params = {};
    if (typeof waitForSyncReplication === "boolean") {
      qs.waitForSyncReplication = waitForSyncReplication ? 1 : 0;
    }
    if (typeof enforceReplicationFactor === "boolean") {
      qs.enforceReplicationFactor = enforceReplicationFactor ? 1 : 0;
    }
    return this._db.request(
      {
        method: "POST",
        path: "/_api/collection",
        qs,
        body: {
          ...opts,
          name: this.name,
        },
      },
      (res) => res.body
    );
  }

  properties(properties?: CollectionPropertiesOptions) {
    if (!properties)
      return this._get<CollectionMetadata & CollectionProperties>("properties");
    return this._put<CollectionMetadata & CollectionProperties>(
      "properties",
      properties
    );
  }

  count() {
    return this._get<
      CollectionMetadata & CollectionProperties & CollectionCount
    >("count");
  }

  async recalculateCount() {
    const body = await this._put<{ result: boolean }>("recalculateCount");
    return body.result;
  }

  figures() {
    return this._get<
      CollectionMetadata &
        CollectionProperties &
        CollectionCount &
        CollectionFigures
    >("figures");
  }

  revision() {
    return this._get<
      CollectionMetadata & CollectionProperties & CollectionRevision
    >("revision");
  }

  checksum(options?: CollectionChecksumOptions) {
    return this._get<
      CollectionMetadata & CollectionRevision & CollectionChecksum
    >("checksum", options);
  }

  load(count?: boolean) {
    return this._put<CollectionMetadata & CollectionCount>(
      "load",
      typeof count === "boolean" ? { count } : undefined
    );
  }

  async loadIndexes() {
    const body = await this._put<{ result: boolean }>("loadIndexesIntoMemory");
    return body.result;
  }

  unload() {
    return this._put<CollectionMetadata>("unload");
  }

  async rename(newName: string) {
    const result = await this._db.renameCollection(this._name, newName);
    this._name = newName;
    return result;
  }

  async rotate() {
    const body = await this._put<{ result: boolean }>("rotate");
    return body.result;
  }

  truncate() {
    return this._put<CollectionMetadata>("truncate");
  }

  drop(options?: CollectionDropOptions) {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/collection/${this._name}`,
        qs: options,
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region crud
  getResponsibleShard(document: Partial<Document<T>>): Promise<string> {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/collection/${this.name}/responsibleShard`,
        body: document,
      },
      (res) => res.body.shardId
    );
  }

  documentId(selector: DocumentSelector): string {
    return _documentHandle(selector, this._name);
  }

  async documentExists(selector: DocumentSelector): Promise<boolean> {
    try {
      return await this._db.request(
        {
          method: "HEAD",
          path: `/_api/document/${_documentHandle(selector, this._name)}`,
        },
        () => true
      );
    } catch (err) {
      if (err.statusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  async document(
    selector: DocumentSelector,
    options: boolean | CollectionReadOptions = {}
  ) {
    if (typeof options === "boolean") {
      options = { graceful: options };
    }
    const { allowDirtyRead = undefined, graceful = false } = options;
    const result = this._db.request(
      {
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        allowDirtyRead,
      },
      (res) => res.body
    );
    if (!graceful) return result;
    try {
      return await result;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === DOCUMENT_NOT_FOUND) {
        return null;
      }
      throw err;
    }
  }

  save(data: DocumentData<T>, options?: CollectionInsertOptions) {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/document/${this._name}`,
        body: data,
        qs: options,
      },
      (res) => (options && options.silent ? undefined : res.body)
    );
  }

  saveAll(data: Array<DocumentData<T>>, options?: CollectionInsertOptions) {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/document/${this._name}`,
        body: data,
        qs: options,
      },
      (res) => (options && options.silent ? undefined : res.body)
    );
  }

  replace(
    selector: DocumentSelector,
    newData: DocumentData<T>,
    options?: CollectionReplaceOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        body: newData,
        qs: options,
      },
      (res) => (options && options.silent ? undefined : res.body)
    );
  }

  replaceAll(
    newData: Array<DocumentData<T> & ({ _key: string } | { _id: string })>,
    options?: CollectionReplaceOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/document/${this._name}`,
        body: newData,
        qs: options,
      },
      (res) => (options && options.silent ? undefined : res.body)
    );
  }

  update(
    selector: DocumentSelector,
    newData: Patch<DocumentData<T>>,
    options?: CollectionUpdateOptions
  ) {
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        body: newData,
        qs: options,
      },
      (res) => (options && options.silent ? undefined : res.body)
    );
  }

  updateAll(
    newData: Array<
      Patch<DocumentData<T>> & ({ _key: string } | { _id: string })
    >,
    options?: CollectionUpdateOptions
  ) {
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/document/${this._name}`,
        body: newData,
        qs: options,
      },
      (res) => (options && options.silent ? undefined : res.body)
    );
  }

  remove(selector: DocumentSelector, options?: CollectionRemoveOptions) {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        qs: options,
      },
      (res) => (options && options.silent ? undefined : res.body)
    );
  }

  removeAll(selectors: DocumentSelector[], options?: CollectionRemoveOptions) {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/document/${this._name}`,
        body: selectors.map((selector) =>
          _documentHandle(selector, this._name)
        ),
        qs: options,
      },
      (res) => (options && options.silent ? undefined : res.body)
    );
  }

  import(
    data: Buffer | Blob | string | any[],
    options: CollectionImportOptions & {
      type?: "documents" | "list" | "auto";
    } = {}
  ): Promise<CollectionImportResult> {
    const qs = { ...options, collection: this._name };
    if (Array.isArray(data)) {
      qs.type = Array.isArray(data[0]) ? undefined : "documents";
      const lines = data as any[];
      data = lines.map((line) => JSON.stringify(line)).join("\r\n") + "\r\n";
    }
    return this._db.request(
      {
        method: "POST",
        path: "/_api/import",
        body: data,
        isBinary: true,
        qs,
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region edges
  protected _edges(selector: DocumentSelector, direction?: "in" | "out") {
    return this._db.request(
      {
        path: `/_api/edges/${this._name}`,
        qs: {
          direction,
          vertex: _documentHandle(selector, this._name),
        },
      },
      (res) => res.body
    );
  }

  edges(vertex: DocumentSelector) {
    return this._edges(vertex);
  }

  inEdges(vertex: DocumentSelector) {
    return this._edges(vertex, "in");
  }

  outEdges(vertex: DocumentSelector) {
    return this._edges(vertex, "out");
  }

  traversal(startVertex: DocumentSelector, options?: TraversalOptions) {
    return this._db.request(
      {
        method: "POST",
        path: "/_api/traversal",
        body: {
          ...options,
          startVertex,
          edgeCollection: this._name,
        },
      },
      (res) => res.body.result
    );
  }
  //#endregion

  //#region simple queries
  list(type: SimpleQueryListType = "id") {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/all-keys",
        body: { type, collection: this._name },
      },
      (res) => new ArrayCursor(this._db, res.body, res.arangojsHostId)
    );
  }

  all(options?: SimpleQueryAllOptions) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/all",
        body: {
          ...options,
          collection: this._name,
        },
      },
      (res) => new ArrayCursor(this._db, res.body, res.arangojsHostId)
    );
  }

  any() {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/any",
        body: { collection: this._name },
      },
      (res) => res.body.document
    );
  }

  byExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryByExampleOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/by-example",
        body: {
          ...options,
          example,
          collection: this._name,
        },
      },
      (res) => new ArrayCursor(this._db, res.body, res.arangojsHostId)
    );
  }

  firstExample(example: Partial<DocumentData<T>>) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/first-example",
        body: {
          example,
          collection: this._name,
        },
      },
      (res) => res.body.document
    );
  }

  removeByExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryRemoveByExampleOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/remove-by-example",
        body: {
          ...options,
          example,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }

  replaceByExample(
    example: Partial<DocumentData<T>>,
    newData: DocumentData<T>,
    options?: SimpleQueryReplaceByExampleOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/replace-by-example",
        body: {
          ...options,
          example,
          newData,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }

  updateByExample(
    example: Partial<DocumentData<T>>,
    newData: Patch<DocumentData<T>>,
    options?: SimpleQueryUpdateByExampleOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/update-by-example",
        body: {
          ...options,
          example,
          newData,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }

  lookupByKeys(keys: string[]) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/lookup-by-keys",
        body: {
          keys,
          collection: this._name,
        },
      },
      (res) => res.body.documents
    );
  }

  removeByKeys(keys: string[], options?: SimpleQueryRemoveByKeysOptions) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/remove-by-keys",
        body: {
          options: options,
          keys,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region indexes
  indexes() {
    return this._db.request(
      {
        path: "/_api/index",
        qs: { collection: this._name },
      },
      (res) => res.body.indexes
    );
  }

  index(selector: IndexSelector) {
    return this._db.request(
      { path: `/_api/index/${_indexHandle(selector, this._name)}` },
      (res) => res.body
    );
  }

  ensureIndex(
    options:
      | EnsureHashIndexOptions
      | EnsureSkiplistIndexOptions
      | EnsurePersistentIndexOptions
      | EnsureGeoIndexOptions
      | EnsureFulltextIndexOptions
      | EnsureTtlIndexOptions
  ) {
    return this._db.request(
      {
        method: "POST",
        path: "/_api/index",
        body: options,
        qs: { collection: this._name },
      },
      (res) => res.body
    );
  }

  dropIndex(selector: IndexSelector) {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/index/${_indexHandle(selector, this._name)}`,
      },
      (res) => res.body
    );
  }

  fulltext(
    attribute: string,
    query: string,
    { index, ...options }: SimpleQueryFulltextOptions = {}
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/fulltext",
        body: {
          ...options,
          index: index ? _indexHandle(index, this._name) : undefined,
          attribute,
          query,
          collection: this._name,
        },
      },
      (res) => new ArrayCursor(this._db, res.body, res.arangojsHostId)
    );
  }
  //#endregion
}
