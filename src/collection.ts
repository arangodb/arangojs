/**
 * TODO
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
  EnsureIndexFulltextOptions,
  EnsureIndexGeoOptions,
  EnsureIndexHashOptions,
  EnsureIndexPersistentOptions,
  EnsureIndexSkiplistOptions,
  EnsureIndexTtlOptions,
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
 * TODO
 */
export type ShardingStrategy =
  | "hash"
  | "enterprise-hash-smart-edge"
  | "community-compat"
  | "enterprise-compat"
  | "enterprise-smart-edge-compat";

/**
 * TODO
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryAllKeys = "id" | "key" | "path";

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
 * TODO
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
export type CollectionProperties = CollectionMetadata & {
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
 * TODO
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
   * TODO
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
 * TODO
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
 * TODO
 */
export type CollectionReadOptions = {
  /**
   * TODO
   */
  graceful?: boolean;
  /**
   * TODO
   */
  allowDirtyRead?: boolean;
};

/**
 * TODO
 */
export type CollectionSaveOptions = {
  /**
   * TODO
   */
  waitForSync?: boolean;
  /**
   * TODO
   */
  silent?: boolean;
  /**
   * TODO
   */
  returnNew?: boolean;
  /**
   * TODO
   */
  returnOld?: boolean;
};

/**
 * TODO
 */
export type CollectionInsertOptions = CollectionSaveOptions & {
  /**
   * TODO
   *
   * @deprecated ArangoDB 3.7
   */
  overwrite?: boolean;
  /**
   * TODO
   */
  overwriteMode?: "update" | "replace";
};

/**
 * TODO
 */
export type CollectionReplaceOptions = CollectionSaveOptions & {
  /**
   * TODO
   */
  ignoreRevs?: boolean;
};

/**
 * TODO
 */
export type CollectionUpdateOptions = CollectionReplaceOptions & {
  /**
   * TODO
   */
  keepNull?: boolean;
  /**
   * TODO
   */
  mergeObjects?: boolean;
};

/**
 * TODO
 */
export type CollectionRemoveOptions = {
  /**
   * TODO
   */
  rSync?: boolean;
  /**
   * TODO
   */
  returnOld?: boolean;
  /**
   * TODO
   */
  silent?: boolean;
};

/**
 * TODO
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
 * TODO
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
 * TODO
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryAllOptions = SimpleQueryByExampleOptions & {
  /**
   * TODO
   */
  stream?: boolean;
};

/**
 * TODO
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
 * TODO
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
 * TODO
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryReplaceByExampleOptions = SimpleQueryRemoveByExampleOptions;

/**
 * TODO
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
 * TODO
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
 * TODO
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type TraversalOptions = {
  /**
   * TODO
   */
  init?: string;
  /**
   * TODO
   */
  filter?: string;
  /**
   * TODO
   */
  sort?: string;
  /**
   * TODO
   */
  visitor?: string;
  /**
   * TODO
   */
  expander?: string;
  /**
   * TODO
   */
  direction?: "inbound" | "outbound" | "any";
  /**
   * TODO
   */
  itemOrder?: "forward" | "backward";
  /**
   * TODO
   */
  strategy?: "depthfirst" | "breadthfirst";
  /**
   * TODO
   */
  order?: "preorder" | "postorder" | "preorder-expander";
  /**
   * TODO
   */
  uniqueness?: {
    /**
     * TODO
     */
    vertices?: "none" | "global" | "path";
    /**
     * TODO
     */
    edges?: "none" | "global" | "path";
  };
  /**
   * TODO
   */
  minDepth?: number;
  /**
   * TODO
   */
  maxDepth?: number;
  /**
   * TODO
   */
  maxIterations?: number;
};

// Results

/**
 * TODO
 */
export type CollectionCount = {
  /**
   * The number of documents in this collection.
   */
  count: number;
};

/**
 * TODO
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
 * TODO
 */
export type CollectionRevision = {
  /**
   * TODO
   */
  revision: string;
};

/**
 * TODO
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
 * TODO
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
 * TODO
 */
export type CollectionInsertResult<T> = DocumentMetadata & {
  /**
   * TODO
   */
  new?: T;
};

/**
 * TODO
 */
export type CollectionRemoveResult<T> = DocumentMetadata & {
  /**
   * TODO
   */
  old?: T;
};

/**
 * TODO
 */
export type CollectionSaveResult<T> = CollectionInsertResult<T> &
  CollectionRemoveResult<T>;

/**
 * TODO
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryRemoveByExampleResult = {
  /**
   * TODO
   */
  deleted: number;
};

/**
 * TODO
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryReplaceByExampleResult = {
  /**
   * TODO
   */
  replaced: number;
};

/**
 * TODO
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryUpdateByExampleResult = {
  /**
   * TODO
   */
  updated: number;
};

/**
 * TODO
 *
 * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
 * replaced with AQL queries.
 */
export type SimpleQueryRemoveByKeysResult<T extends object = any> = {
  /**
   * TODO
   */
  removed: number;
  /**
   * TODO
   */
  ignored: number;
  /**
   * TODO
   */
  old?: DocumentMetadata[] | Document<T>[];
};

/**
 * TODO
 */
export type CollectionIndexResult = {
  /**
   * TODO
   */
  id: string;
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
   * @param options - Options for creating the collection.s
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
  ): Promise<ArangoResponseMetadata & CollectionProperties>;
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
  properties(): Promise<ArangoResponseMetadata & CollectionProperties>;
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
  ): Promise<ArangoResponseMetadata & CollectionProperties>;
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
    ArangoResponseMetadata & CollectionProperties & CollectionCount
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
    ArangoResponseMetadata & CollectionProperties & CollectionRevision
  >;
  /**
   * Retrieves the collection checksum.
   *
   * @param options - TODO
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
   * TODO
   */
  documentId(selector: DocumentSelector): string;
  /**
   * TODO
   */
  documentExists(selector: DocumentSelector): Promise<boolean>;
  /**
   * TODO
   */
  document(
    selector: DocumentSelector,
    options?: CollectionReadOptions & { graceful?: false }
  ): Promise<Document<T>>;
  /**
   * TODO
   */
  document(
    selector: DocumentSelector,
    options: CollectionReadOptions & { graceful: true }
  ): Promise<Document<T> | null>;
  /**
   * TODO
   */
  document(selector: DocumentSelector, graceful: false): Promise<Document<T>>;
  /**
   * TODO
   */
  document(
    selector: DocumentSelector,
    graceful: true
  ): Promise<Document<T> | null>;
  /**
   * TODO
   */
  save(
    data: DocumentData<T>,
    options?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  /**
   * TODO
   */
  saveAll(
    data: Array<DocumentData<T>>,
    options?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  /**
   * TODO
   */
  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    options?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  /**
   * TODO
   */
  replaceAll(
    newValues: Array<DocumentData<T> & ({ _key: string } | { _id: string })>,
    options?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  /**
   * TODO
   */
  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    options?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  /**
   * TODO
   */
  updateAll(
    newValues: Array<
      Patch<DocumentData<T>> & ({ _key: string } | { _id: string })
    >,
    options?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  /**
   * TODO
   */
  remove(
    selector: DocumentSelector,
    options?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Document<T>>>;
  /**
   * TODO
   */
  removeAll(
    selector: Array<DocumentSelector>,
    options?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Document<T>>[]>;
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
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  list(type?: SimpleQueryAllKeys): Promise<ArrayCursor<string>>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  all(options?: SimpleQueryAllOptions): Promise<ArrayCursor<Document<T>>>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  any(): Promise<Document<T>>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  byExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryByExampleOptions
  ): Promise<ArrayCursor<Document<T>>>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  firstExample(example: Partial<DocumentData<T>>): Promise<Document<T>>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  removeByExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryRemoveByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryRemoveByExampleResult>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  replaceByExample(
    example: Partial<DocumentData<T>>,
    newValue: DocumentData<T>,
    options?: SimpleQueryReplaceByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryReplaceByExampleResult>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  updateByExample(
    example: Partial<DocumentData<T>>,
    newValue: Patch<DocumentData<T>>,
    options?: SimpleQueryUpdateByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryUpdateByExampleResult>;
  /**
   * TODO
   */
  remove(
    selector: DocumentSelector,
    options?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Edge<T>>>;
  /**
   * TODO
   */
  removeAll(
    selector: Array<DocumentSelector>,
    options?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Edge<T>>[]>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  lookupByKeys(keys: string[]): Promise<Document<T>[]>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  removeByKeys(
    keys: string[],
    options?: SimpleQueryRemoveByKeysOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryRemoveByKeysResult<T>>;

  /**
   * TODO
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
   * TODO
   */
  indexes(): Promise<Index[]>;
  /**
   * TODO
   */
  index(selector: IndexSelector): Promise<Index[]>;
  /**
   * TODO
   */
  ensureIndex(
    details: EnsureIndexFulltextOptions
  ): Promise<
    ArangoResponseMetadata & FulltextIndex & { isNewlyCreated: boolean }
  >;
  /**
   * TODO
   */
  ensureIndex(
    details: EnsureIndexGeoOptions
  ): Promise<ArangoResponseMetadata & GeoIndex & { isNewlyCreated: boolean }>;
  /**
   * TODO
   */
  ensureIndex(
    details: EnsureIndexHashOptions
  ): Promise<ArangoResponseMetadata & HashIndex & { isNewlyCreated: boolean }>;
  /**
   * TODO
   */
  ensureIndex(
    details: EnsureIndexPersistentOptions
  ): Promise<
    ArangoResponseMetadata & PersistentIndex & { isNewlyCreated: boolean }
  >;
  /**
   * TODO
   */
  ensureIndex(
    details: EnsureIndexSkiplistOptions
  ): Promise<
    ArangoResponseMetadata & SkiplistIndex & { isNewlyCreated: boolean }
  >;
  /**
   * TODO
   */
  ensureIndex(
    details: EnsureIndexTtlOptions
  ): Promise<ArangoResponseMetadata & TtlIndex & { isNewlyCreated: boolean }>;
  /**
   * TODO
   */
  dropIndex(
    selector: IndexSelector
  ): Promise<ArangoResponseMetadata & CollectionIndexResult>;
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
  //#region crud
  /**
   * TODO
   */
  edge(
    selector: DocumentSelector,
    options?: CollectionReadOptions & { graceful?: false }
  ): Promise<Edge<T>>;
  /**
   * TODO
   */
  edge(
    selector: DocumentSelector,
    options: CollectionReadOptions & { graceful: true }
  ): Promise<Edge<T> | null>;
  /**
   * TODO
   */
  edge(selector: DocumentSelector, graceful: false): Promise<Edge<T>>;
  /**
   * TODO
   */
  edge(selector: DocumentSelector, graceful: true): Promise<Edge<T> | null>;
  /**
   * TODO
   */
  document(
    selector: DocumentSelector,
    options?: CollectionReadOptions & { graceful?: false }
  ): Promise<Edge<T>>;
  /**
   * TODO
   */
  document(
    selector: DocumentSelector,
    options: CollectionReadOptions & { graceful: true }
  ): Promise<Edge<T> | null>;
  /**
   * TODO
   */
  document(selector: DocumentSelector, graceful?: false): Promise<Edge<T>>;
  /**
   * TODO
   */
  document(selector: DocumentSelector, graceful: true): Promise<Edge<T> | null>;
  /**
   * TODO
   */
  save(
    data: EdgeData<T>,
    options?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  /**
   * TODO
   */
  saveAll(
    data: Array<EdgeData<T>>,
    options?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
  /**
   * TODO
   */
  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    options?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  /**
   * TODO
   */
  replaceAll(
    newValues: Array<DocumentData<T> & ({ _key: string } | { _id: string })>,
    options?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
  /**
   * TODO
   */
  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    options?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  /**
   * TODO
   */
  updateAll(
    newValues: Array<
      Patch<DocumentData<T>> & ({ _key: string } | { _id: string })
    >,
    options?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
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
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  all(options?: SimpleQueryAllOptions): Promise<ArrayCursor<Edge<T>>>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  any(): Promise<Edge<T>>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  byExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryByExampleOptions
  ): Promise<ArrayCursor<Edge<T>>>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  firstExample(example: Partial<DocumentData<T>>): Promise<Edge<T>>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  lookupByKeys(keys: string[]): Promise<Edge<T>[]>;

  /**
   * TODO
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
   * TODO
   */
  edges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  /**
   * TODO
   */
  inEdges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  /**
   * TODO
   */
  outEdges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
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
    if (!properties) return this._get<CollectionProperties>("properties");
    return this._put<CollectionProperties>("properties", properties);
  }

  count() {
    return this._get<CollectionProperties & CollectionCount>("count");
  }

  async recalculateCount() {
    const body = await this._put<{ result: boolean }>("recalculateCount");
    return body.result;
  }

  figures() {
    return this._get<
      CollectionProperties & CollectionCount & CollectionFigures
    >("figures");
  }

  revision() {
    return this._get<CollectionProperties & CollectionRevision>("revision");
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

  edge(
    selector: DocumentSelector,
    options: boolean | CollectionReadOptions = {}
  ) {
    return this.document(selector, options) as Promise<Edge<T>>;
  }

  save(data: DocumentData<T>, options?: CollectionInsertOptions) {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/document/${this._name}`,
        body: data,
        qs: options,
      },
      (res) => res.body
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
      (res) => res.body
    );
  }

  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    options?: CollectionReplaceOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        body: newValue,
        qs: options,
      },
      (res) => res.body
    );
  }

  replaceAll(
    newValues: Array<DocumentData<T> & ({ _key: string } | { _id: string })>,
    options?: CollectionReplaceOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/document/${this._name}`,
        body: newValues,
        qs: options,
      },
      (res) => res.body
    );
  }

  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    options?: CollectionUpdateOptions
  ) {
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        body: newValue,
        qs: options,
      },
      (res) => res.body
    );
  }

  updateAll(
    newValues: Array<
      Patch<DocumentData<T>> & ({ _key: string } | { _id: string })
    >,
    options?: CollectionUpdateOptions
  ) {
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/document/${this._name}`,
        body: newValues,
        qs: options,
      },
      (res) => res.body
    );
  }

  remove(selector: DocumentSelector, options?: CollectionRemoveOptions) {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        qs: options,
      },
      (res) => res.body
    );
  }

  removeAll(
    selectors: Array<DocumentSelector>,
    options?: CollectionRemoveOptions
  ) {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/document/${this._name}`,
        body: selectors,
        qs: options,
      },
      (res) => res.body
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
  list(type: SimpleQueryAllKeys = "id") {
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
    newValue: DocumentData<T>,
    options?: SimpleQueryReplaceByExampleOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/replace-by-example",
        body: {
          ...options,
          example,
          newValue,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }

  updateByExample(
    example: Partial<DocumentData<T>>,
    newValue: Patch<DocumentData<T>>,
    options?: SimpleQueryUpdateByExampleOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/update-by-example",
        body: {
          ...options,
          example,
          newValue,
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
      | EnsureIndexHashOptions
      | EnsureIndexSkiplistOptions
      | EnsureIndexPersistentOptions
      | EnsureIndexGeoOptions
      | EnsureIndexFulltextOptions
      | EnsureIndexTtlOptions
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
