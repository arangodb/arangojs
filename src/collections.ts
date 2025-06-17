/**
 * ```ts
 * import type {
 *   DocumentCollection,
 *   EdgeCollection,
 * } from "arangojs/collections";
 * ```
 *
 * The "collections" module provides collection related types and interfaces
 * for TypeScript.
 *
 * @packageDocumentation
 */
import * as aql from "./aql.js";
import * as connection from "./connection.js";
import * as databases from "./databases.js";
import * as documents from "./documents.js";
import * as errors from "./errors.js";
import * as indexes from "./indexes.js";
import { COLLECTION_NOT_FOUND, DOCUMENT_NOT_FOUND } from "./lib/codes.js";

//#region ArangoCollection interface
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
 * Coerces the given collection name or {@link ArangoCollection} object to
 * a string representing the collection name.
 *
 * @param collection - Collection name or {@link ArangoCollection} object.
 */
export function collectionToString(
  collection: string | ArangoCollection
): string {
  if (isArangoCollection(collection)) {
    return String(collection.name);
  } else return String(collection);
}

/**
 * A marker interface identifying objects that can be used in AQL template
 * strings to create references to ArangoDB collections.
 *
 * See {@link aql.aql}.
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
//#endregion

//#region Shared types
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
 * Type of key generator.
 */
export type KeyGenerator = "traditional" | "autoincrement" | "uuid" | "padded";

/**
 * Strategy for sharding a collection.
 */
export type ShardingStrategy =
  | "hash"
  | "enterprise-hash-smart-edge"
  | "enterprise-hash-smart-vertex"
  | "community-compat"
  | "enterprise-compat"
  | "enterprise-smart-edge-compat";

/**
 * When a validation should be applied.
 *
 * * `"none"`: No validation.
 * * `"new"`: Newly inserted documents are validated.
 * * `"moderate"`: New and modified documents are validated unless the modified
 *   document was already invalid.
 * * `"strict"`: New and modified documents are always validated.
 */
export type ValidationLevel = "none" | "new" | "moderate" | "strict";

/**
 * Write operation that can result in a computed value being computed.
 */
export type WriteOperation = "insert" | "update" | "replace";
//#endregion

//#region Collection operation options
/**
 * Options for creating a collection.
 *
 * See {@link databases.Database#createCollection}, {@link databases.Database#createEdgeCollection}
 * and {@link DocumentCollection#create} or {@link EdgeCollection#create}.
 */
export type CreateCollectionOptions = CollectionPropertiesOptions & {
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
   * (Cluster only.) Sharding strategy to use.
   */
  shardingStrategy?: ShardingStrategy;
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
  /**
   * (Enterprise Edition cluster only.) Attribute used for sharding.
   */
  smartGraphAttribute?: string;
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
   * (Autoincrement only.) Initial offset for the key.
   */
  offset?: number;
};

/**
 * Options for setting a collection's properties.
 *
 * See {@link DocumentCollection#properties} and {@link EdgeCollection#properties}.
 */
export type CollectionPropertiesOptions = {
  /**
   * If set to `true`, data will be synchronized to disk before returning from
   * a document create, update, replace or removal operation.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * (Cluster only.) How many copies of each document should be kept in the
   * cluster.
   *
   * Default: `1`
   */
  replicationFactor?: number | "satellite";
  /**
   * (Cluster only.) Write concern for this collection.
   */
  writeConcern?: number;
  /**
   * Options for validating documents in this collection.
   */
  schema?: SchemaOptions;
  /**
   * Computed values to apply to documents in this collection.
   */
  computedValues?: ComputedValueOptions[];
  /**
   * Whether the in-memory hash cache is enabled for this collection.
   *
   * Default: `false`
   */
  cacheEnabled?: boolean;
};

/**
 * Options for validating collection documents.
 */
export type SchemaOptions = {
  /**
   * JSON Schema description of the validation schema for documents.
   */
  rule: any;
  /**
   * When validation should be applied.
   *
   * Default: `"strict"`
   */
  level?: ValidationLevel;
  /**
   * Message to be used if validation fails.
   */
  message?: string;
};

/**
 * Options for creating a computed value.
 */
export type ComputedValueOptions = {
  /**
   * Name of the target attribute of the computed value.
   */
  name: string;
  /**
   * AQL `RETURN` expression that computes the value.
   *
   * Note that when passing an AQL query object, the `bindVars` will be ignored.
   */
  expression: string | aql.AqlLiteral | aql.AqlQuery;
  /**
   * If set to `false`, the computed value will not be applied if the
   * expression evaluates to `null`.
   *
   * Default: `true`
   */
  overwrite?: boolean;
  /**
   * Which operations should result in the value being computed.
   *
   * Default: `["insert", "update", "replace"]`
   */
  computeOn?: WriteOperation[];
  /**
   * If set to `false`, the field will be unset if the expression evaluates to
   * `null`. Otherwise the field will be set to the value `null`. Has no effect
   * if `overwrite` is set to `false`.
   *
   * Default: `true`
   */
  keepNull?: boolean;
  /**
   * Whether the write operation should fail if the expression produces a
   * warning.
   *
   * Default: `false`
   */
  failOnWarning?: boolean;
};

/**
 * Options for retrieving a collection checksum.
 */
export type CollectionChecksumOptions = {
  /**
   * If set to `true`, revision IDs will be included in the calculation
   * of the checksum.
   *
   * Default: `false`
   */
  withRevisions?: boolean;
  /**
   * If set to `true`, document data will be included in the calculation
   * of the checksum.
   *
   * Default: `false`
   */
  withData?: boolean;
};

/**
 * Options for truncating collections.
 */
export type TruncateCollectionOptions = {
  /**
   * Whether the collection should be compacted after truncation.
   */
  compact?: boolean;
  /**
   * Whether data should be synchronized to disk before returning from this
   * operation.
   */
  waitForSync?: boolean;
};

/**
 * Options for dropping collections.
 */
export type DropCollectionOptions = {
  /**
   * Whether the collection is a system collection. If the collection is a
   * system collection, this option must be set to `true` or ArangoDB will
   * refuse to drop the collection.
   *
   * Default: `false`
   */
  isSystem?: boolean;
};
//#endregion

//#region CollectionDescription
/**
 * General information about a collection.
 */
export type CollectionDescription = {
  /**
   * Collection name.
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
//#endregion

//#region CollectionProperties
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
   * Properties for validating documents in the collection.
   */
  schema: SchemaProperties | null;
  /**
   * (Cluster only.) Write concern for this collection.
   */
  writeConcern: number;
  /**
   * (Cluster only.) Number of shards of this collection.
   */
  numberOfShards?: number;
  /**
   * (Cluster only.) Keys of this collection that will be used for
   * sharding.
   */
  shardKeys?: string[];
  /**
   * (Cluster only.) Replication factor of the collection.
   */
  replicationFactor?: number | "satellite";
  /**
   * (Cluster only.) Sharding strategy of the collection.
   */
  shardingStrategy?: ShardingStrategy;
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
  /**
   * (Enterprise Edition cluster only.) Attribute used for sharding.
   */
  smartGraphAttribute?: string;
  /**
   * Computed values applied to documents in this collection.
   */
  computedValues: ComputedValueProperties[];
  /**
   * Whether the in-memory hash cache is enabled for this collection.
   */
  cacheEnabled: boolean;
  /**
   * Whether the newer revision-based replication protocol is enabled for
   * this collection.
   */
  syncByRevision: boolean;
  /**
   * (Enterprise Edition only.) Whether the collection is used in a SmartGraph or EnterpriseGraph.
   */
  isSmart?: boolean;
  /**
   * (Enterprise Edition only.) Whether the SmartGraph this collection belongs to is disjoint.
   */
  isDisjoint?: string;
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
   * (Autoincrement only.) Initial offset for the key.
   */
  offset?: number;
  /**
   * Most recent key that has been generated.
   */
  lastValue: number;
};

/**
 * Properties for validating documents in a collection.
 */
export type SchemaProperties = {
  /**
   * Type of document validation.
   */
  type: "json";
  /**
   * JSON Schema description of the validation schema for documents.
   */
  rule: any;
  /**
   * When validation should be applied.
   */
  level: ValidationLevel;
  /**
   * Message to be used if validation fails.
   */
  message: string;
};

/**
 * Properties defining a computed value.
 */
export type ComputedValueProperties = {
  /**
   * Name of the target attribute of the computed value.
   */
  name: string;
  /**
   * AQL `RETURN` expression that computes the value.
   */
  expression: string;
  /**
   * If set to `false`, the computed value will not be applied if the
   * expression evaluates to `null`.
   */
  overwrite: boolean;
  /**
   * Which operations should result in the value being computed.
   */
  computeOn: WriteOperation[];
  /**
   * If set to `false`, the field will be unset if the expression evaluates to
   * `null`. Otherwise the field will be set to the value `null`. Has no effect
   * if `overwrite` is set to `false`.
   */
  keepNull: boolean;
  /**
   * Whether the write operation should fail if the expression produces a
   * warning.
   */
  failOnWarning: boolean;
};
//#endregion

//#region DocumentCollection interface
/**
 * Represents an document collection in a {@link databases.Database}.
 *
 * See {@link EdgeCollection} for a variant of this interface more suited for
 * edge collections.
 *
 * When using TypeScript, collections can be cast to a specific document data
 * type to increase type safety.
 *
 * @param EntryResultType - Type to represent document contents returned by the
 * server (including computed properties).
 * @param EntryInputType - Type to represent document contents passed when
 * inserting or replacing documents (without computed properties).
 *
 * @example
 * ```ts
 * interface Person {
 *   name: string;
 * }
 * const db = new Database();
 * const documents = db.collection("persons") as DocumentCollection<Person>;
 * ```
 */
export interface DocumentCollection<
  EntryResultType extends Record<string, any> = any,
  EntryInputType extends Record<string, any> = EntryResultType,
> extends ArangoCollection {
  /**
   * Database this collection belongs to.
   */
  readonly database: databases.Database;
  //#region Collection operations
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
  get(): Promise<connection.ArangoApiResponse<CollectionDescription>>;
  /**
   * Creates a collection with the given `options` and the instance's name.
   *
   * See also {@link databases.Database#createCollection} and
   * {@link databases.Database#createEdgeCollection}.
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
    connection.ArangoApiResponse<CollectionDescription & CollectionProperties>
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
    connection.ArangoApiResponse<CollectionDescription & CollectionProperties>
  >;
  /**
   * Replaces the properties of the collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const result = await collection.properties({ waitForSync: true });
   * // the collection will now wait for data being written to disk
   * // whenever a document is changed
   * ```
   */
  properties(
    properties: CollectionPropertiesOptions
  ): Promise<
    connection.ArangoApiResponse<CollectionDescription & CollectionProperties>
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
    connection.ArangoApiResponse<
      CollectionDescription & CollectionProperties & { count: number }
    >
  >;
  /**
   * Instructs ArangoDB to recalculate the collection's document count to fix
   * any inconsistencies.
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
   * @param details - whether to return extended storage engine-specific details
   * to the figures, which may cause additional load and impact performance
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const data = await collection.figures();
   * // data contains the collection's figures
   * ```
   */
  figures(
    details?: boolean
  ): Promise<
    connection.ArangoApiResponse<
      CollectionDescription &
        CollectionProperties & { count: number; figures: Record<string, any> }
    >
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
    connection.ArangoApiResponse<
      CollectionDescription & CollectionProperties & { revision: string }
    >
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
    connection.ArangoApiResponse<
      CollectionDescription & { revision: string; checksum: string }
    >
  >;
  /**
   * Retrieves the collection's shard IDs.
   *
   * @param details - If set to `true`, the response will include the responsible
   * servers for each shard.
   */
  shards(
    details?: false
  ): Promise<
    connection.ArangoApiResponse<
      CollectionDescription & CollectionProperties & { shards: string[] }
    >
  >;
  /**
   * Retrieves the collection's shard IDs and the responsible servers for each
   * shard.
   *
   * @param details - If set to `false`, the response will only include the
   * shard IDs without the responsible servers for each shard.
   */
  shards(
    details: true
  ): Promise<
    connection.ArangoApiResponse<
      CollectionDescription &
        CollectionProperties & { shards: Record<string, string[]> }
    >
  >;
  /**
   * Retrieves the collection's shard IDs.
   *
   * @param details - If set to `true`, the response will include the responsible
   * servers for each shard.
   */
  shards(
    details?: false
  ): Promise<
    connection.ArangoApiResponse<
      CollectionDescription & CollectionProperties & { shards: string[] }
    >
  >;
  /**
   * Retrieves the collection's shard IDs and the responsible servers for each
   * shard.
   *
   * @param details - If set to `false`, the response will only include the
   * shard IDs without the responsible servers for each shard.
   */
  shards(
    details: true
  ): Promise<
    connection.ArangoApiResponse<
      CollectionDescription &
        CollectionProperties & { shards: Record<string, string[]> }
    >
  >;
  /**
   * Renames the collection and updates the instance's `name` to `newName`.
   *
   * Additionally removes the instance from the {@link databases.Database}'s internal
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
  rename(
    newName: string
  ): Promise<connection.ArangoApiResponse<CollectionDescription>>;
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
  truncate(
    options?: TruncateCollectionOptions
  ): Promise<connection.ArangoApiResponse<CollectionDescription>>;
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
  drop(
    options?: DropCollectionOptions
  ): Promise<connection.ArangoApiResponse<{ id: string }>>;
  /**
   * Triggers compaction for a collection.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.compact();
   * // Background compaction is triggered on the collection
   * ```
   */
  compact(): Promise<connection.ArangoApiResponse<CollectionDescription>>;
  //#endregion

  //#region Document operations
  /**
   * Retrieves the `shardId` of the shard responsible for the given document.
   *
   * @param document - Document in the collection to look up the `shardId` of.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const responsibleShard = await collection.getResponsibleShard();
   * ```
   */
  getResponsibleShard(
    document: Partial<documents.Document<EntryResultType>>
  ): Promise<string>;
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
  documentId(selector: documents.DocumentSelector): string;
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
  documentExists(
    selector: documents.DocumentSelector,
    options?: documents.DocumentExistsOptions
  ): Promise<boolean>;
  /**
   * Retrieves the document matching the given key or id.
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
   * } catch (e: any) {
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
    selector: documents.DocumentSelector,
    options?: documents.ReadDocumentOptions
  ): Promise<documents.Document<EntryResultType>>;
  /**
   * Retrieves the document matching the given key or id.
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
   *   const document = await collection.document("abc123", false);
   *   console.log(document);
   * } catch (e: any) {
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
  document(
    selector: documents.DocumentSelector,
    graceful: boolean
  ): Promise<documents.Document<EntryResultType>>;
  /**
   * Retrieves the documents matching the given key or id values.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection, or if the document does not exist.
   *
   * @param selectors - Array of document `_key`, `_id` or objects with either
   * of those properties (e.g. a document from this collection).
   * @param options - Options for retrieving the documents.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * try {
   *   const documents = await collection.documents(["abc123", "xyz456"]);
   *   console.log(documents);
   * } catch (e: any) {
   *   console.error("Could not find document");
   * }
   * ```
   */
  documents(
    selectors: (string | documents.ObjectWithDocumentKey)[],
    options?: documents.BulkReadDocumentsOptions
  ): Promise<documents.Document<EntryResultType>[]>;
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
    data: documents.DocumentData<EntryInputType>,
    options?: documents.InsertDocumentOptions
  ): Promise<
    documents.DocumentOperationMetadata & {
      new?: documents.Document<EntryResultType>;
      old?: documents.Document<EntryResultType>;
    }
  >;
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
   * const result = await collection.saveAll(
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
    data: Array<documents.DocumentData<EntryInputType>>,
    options?: documents.InsertDocumentOptions
  ): Promise<
    Array<
      | (documents.DocumentOperationMetadata & {
          new?: documents.Document<EntryResultType>;
          old?: documents.Document<EntryResultType>;
        })
      | documents.DocumentOperationFailure
    >
  >;
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
    selector: documents.DocumentSelector,
    newData: documents.DocumentData<EntryInputType>,
    options?: documents.ReplaceDocumentOptions
  ): Promise<
    documents.DocumentOperationMetadata & {
      new?: documents.Document<EntryResultType>;
      old?: documents.Document<EntryResultType>;
    }
  >;
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
    newData: Array<
      documents.DocumentData<EntryInputType> &
        ({ _key: string } | { _id: string })
    >,
    options?: Omit<documents.ReplaceDocumentOptions, "ifMatch">
  ): Promise<
    Array<
      | (documents.DocumentOperationMetadata & {
          new?: documents.Document<EntryResultType>;
          old?: documents.Document<EntryResultType>;
        })
      | documents.DocumentOperationFailure
    >
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
    selector: documents.DocumentSelector,
    newData: documents.Patch<documents.DocumentData<EntryInputType>>,
    options?: documents.UpdateDocumentOptions
  ): Promise<
    documents.DocumentOperationMetadata & {
      new?: documents.Document<EntryResultType>;
      old?: documents.Document<EntryResultType>;
    }
  >;
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
      documents.Patch<documents.DocumentData<EntryInputType>> &
        ({ _key: string } | { _id: string })
    >,
    options?: Omit<documents.UpdateDocumentOptions, "ifMatch">
  ): Promise<
    Array<
      | (documents.DocumentOperationMetadata & {
          new?: documents.Document<EntryResultType>;
          old?: documents.Document<EntryResultType>;
        })
      | documents.DocumentOperationFailure
    >
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
    selector: documents.DocumentSelector,
    options?: documents.RemoveDocumentOptions
  ): Promise<
    documents.DocumentMetadata & { old?: documents.Document<EntryResultType> }
  >;
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
    selectors: (string | documents.ObjectWithDocumentKey)[],
    options?: Omit<documents.RemoveDocumentOptions, "ifMatch">
  ): Promise<
    Array<
      | (documents.DocumentMetadata & {
          old?: documents.Document<EntryResultType>;
        })
      | documents.DocumentOperationFailure
    >
  >;
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
    data: documents.DocumentData<EntryInputType>[],
    options?: documents.ImportDocumentsOptions
  ): Promise<documents.ImportDocumentsResult>;
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
    options?: documents.ImportDocumentsOptions
  ): Promise<documents.ImportDocumentsResult>;
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
    options?: documents.ImportDocumentsOptions & {
      type?: "documents" | "list" | "auto";
    }
  ): Promise<documents.ImportDocumentsResult>;
  //#endregion

  //#region Index operations
  /**
   * Instructs ArangoDB to load as many indexes of the collection into memory
   * as permitted by the memory limit.
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
   * Returns a list of all index descriptions for the collection.
   *
   * @param options - Options for fetching the index list.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const indexes = await collection.indexes();
   * ```
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const allIndexes = await collection.indexes<HiddenIndexDescription>({
   *   withHidden: true
   * });
   * ```
   */
  indexes<
    IndexType extends
      | indexes.IndexDescription
      | indexes.HiddenIndexDescription = indexes.IndexDescription,
  >(
    options?: indexes.ListIndexesOptions
  ): Promise<IndexType[]>;
  /**
   * Returns an index description by name or `id` if it exists.
   *
   * @param selector - Index name, id or object with either property.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * const index = await collection.index("some-index");
   * ```
   */
  index(selector: indexes.IndexSelector): Promise<indexes.IndexDescription>;
  /**
   * Creates a persistent index on the collection if it does not already exist.
   *
   * @param options - Options for creating the persistent index.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
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
    options: indexes.EnsurePersistentIndexOptions
  ): Promise<
    connection.ArangoApiResponse<
      indexes.PersistentIndexDescription & { isNewlyCreated: boolean }
    >
  >;
  /**
   * Creates a TTL index on the collection if it does not already exist.
   *
   * @param options - Options for creating the TTL index.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
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
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * // Expire documents with "expiresAt" timestamp according to their value
   * await collection.ensureIndex({
   *   type: "ttl",
   *   fields: ["expiresAt"],
   *   expireAfter: 0 // when attribute value is exceeded
   * });
   * ```
   */
  ensureIndex(
    options: indexes.EnsureTtlIndexOptions
  ): Promise<
    connection.ArangoApiResponse<
      indexes.TtlIndexDescription & { isNewlyCreated: boolean }
    >
  >;
  /**
   * Creates a multi-dimensional index on the collection if it does not already exist.
   *
   * @param options - Options for creating the multi-dimensional index.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-points");
   * // Create a multi-dimensional index for the attributes x, y and z
   * await collection.ensureIndex({
   *   type: "mdi",
   *   fields: ["x", "y", "z"],
   *   fieldValueTypes: "double"
   * });
   * ```
   * ```
   */
  ensureIndex(
    options: indexes.EnsureMdiIndexOptions
  ): Promise<
    connection.ArangoApiResponse<
      indexes.MdiIndexDescription & { isNewlyCreated: boolean }
    >
  >;
  /**
   * Creates a prefixed multi-dimensional index on the collection if it does
   * not already exist.
   *
   * @param options - Options for creating the prefixed multi-dimensional index.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-points");
   * // Create a multi-dimensional index for the attributes x, y and z
   * await collection.ensureIndex({
   *   type: "mdi-prefixed",
   *   fields: ["x", "y", "z"],
   *   prefixFields: ["x"],
   *   fieldValueTypes: "double"
   * });
   * ```
   * ```
   */
  ensureIndex(
    options: indexes.EnsureMdiPrefixedIndexOptions
  ): Promise<
    connection.ArangoApiResponse<
      indexes.MdiPrefixedIndexDescription & { isNewlyCreated: boolean }
    >
  >;
  /**
   * Creates a prefixed multi-dimensional index on the collection if it does not already exist.
   *
   * @param details - Options for creating the prefixed multi-dimensional index.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-points");
   * // Create a multi-dimensional index for the attributes x, y and z
   * await collection.ensureIndex({
   *   type: "mdi-prefixed",
   *   fields: ["x", "y", "z"],
   *   prefixFields: ["x"],
   *   fieldValueTypes: "double"
   * });
   * ```
   * ```
   */
  ensureIndex(
    details: indexes.EnsureMdiPrefixedIndexOptions
  ): Promise<
    connection.ArangoApiResponse<
      indexes.MdiPrefixedIndexDescription & { isNewlyCreated: boolean }
    >
  >;
  /**
   * Creates a geo index on the collection if it does not already exist.
   *
   * @param options - Options for creating the geo index.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * // Create an index for GeoJSON data
   * await collection.ensureIndex({
   *   type: "geo",
   *   fields: ["lngLat"],
   *   geoJson: true
   * });
   * ```
   */
  ensureIndex(
    options: indexes.EnsureGeoIndexOptions
  ): Promise<
    connection.ArangoApiResponse<
      indexes.GeoIndexDescription & { isNewlyCreated: boolean }
    >
  >;
  /**
   * Creates a inverted index on the collection if it does not already exist.
   *
   * @param options - Options for creating the inverted index.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * // Create an inverted index
   * await collection.ensureIndex({
   *   type: "inverted",
   *   fields: ["a", { name: "b", analyzer: "text_en" }]
   * });
   * ```
   */
  ensureIndex(
    options: indexes.EnsureInvertedIndexOptions
  ): Promise<
    connection.ArangoApiResponse<
      indexes.InvertedIndexDescription & { isNewlyCreated: boolean }
    >
  >;
  /**
   * Creates an index on the collection if it does not already exist.
   *
   * @param options - Options for creating the index.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
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
    options: indexes.EnsureIndexOptions
  ): Promise<
    connection.ArangoApiResponse<
      indexes.IndexDescription & { isNewlyCreated: boolean }
    >
  >;
  /**
   * Deletes the index with the given name or `id` from the database.
   *
   * @param selector - Index name, id or object with either property.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * await collection.dropIndex("some-index");
   * // The index "some-index" no longer exists
   * ```
   */
  dropIndex(
    selector: indexes.IndexSelector
  ): Promise<connection.ArangoApiResponse<{ id: string }>>;
  //#endregion
}
//#endregion

//#region EdgeCollection interface
/**
 * Represents an edge collection in a {@link databases.Database}.
 *
 * See {@link DocumentCollection} for a more generic variant of this interface
 * more suited for regular document collections.
 *
 * See also {@link graphs.GraphEdgeCollection} for the type representing an edge
 * collection in a {@link graphs.Graph}.
 *
 * When using TypeScript, collections can be cast to a specific edge document
 * data type to increase type safety.
 *
 * @param EntryResultType - Type to represent edge document contents returned
 * by the server (including computed properties).
 * @param EntryInputType - Type to represent edge document contents passed when
 * inserting or replacing edge documents (without computed properties).
 *
 * @example
 * ```ts
 * interface Friend {
 *   startDate: number;
 *   endDate?: number;
 * }
 * const db = new Database();
 * const edges = db.collection("friends") as EdgeCollection<Friend>;
 * ```
 */
export interface EdgeCollection<
  EntryResultType extends Record<string, any> = any,
  EntryInputType extends Record<string, any> = EntryResultType,
> extends DocumentCollection<EntryResultType, EntryInputType> {
  //#region Document operations
  /**
   * Retrieves the document matching the given key or id.
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
   * } catch (e: any) {
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
    selector: documents.DocumentSelector,
    options?: documents.ReadDocumentOptions
  ): Promise<documents.Edge<EntryResultType>>;
  /**
   * Retrieves the document matching the given key or id.
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
   *   const document = await collection.document("abc123", false);
   *   console.log(document);
   * } catch (e: any) {
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
  document(
    selector: documents.DocumentSelector,
    graceful: boolean
  ): Promise<documents.Edge<EntryResultType>>;
  /**
   * Retrieves the documents matching the given key or id values.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection, or if the document does not exist.
   *
   * @param selectors - Array of document `_key`, `_id` or objects with either
   * of those properties (e.g. a document from this collection).
   * @param options - Options for retrieving the documents.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("some-collection");
   * try {
   *   const documents = await collection.documents(["abc123", "xyz456"]);
   *   console.log(documents);
   * } catch (e: any) {
   *   console.error("Could not find document");
   * }
   * ```
   */
  documents(
    selectors: (string | documents.ObjectWithDocumentKey)[],
    options?: documents.BulkReadDocumentsOptions
  ): Promise<documents.Edge<EntryResultType>[]>;
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
    data: documents.EdgeData<EntryInputType>,
    options?: documents.InsertDocumentOptions
  ): Promise<
    documents.DocumentOperationMetadata & {
      new?: documents.Edge<EntryResultType>;
      old?: documents.Edge<EntryResultType>;
    }
  >;
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
    data: Array<documents.EdgeData<EntryInputType>>,
    options?: documents.InsertDocumentOptions
  ): Promise<
    Array<
      | (documents.DocumentOperationMetadata & {
          new?: documents.Edge<EntryResultType>;
          old?: documents.Edge<EntryResultType>;
        })
      | documents.DocumentOperationFailure
    >
  >;
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
    selector: documents.DocumentSelector,
    newData: documents.DocumentData<EntryInputType>,
    options?: documents.ReplaceDocumentOptions
  ): Promise<
    documents.DocumentOperationMetadata & {
      new?: documents.Edge<EntryResultType>;
      old?: documents.Edge<EntryResultType>;
    }
  >;
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
    newData: Array<
      documents.DocumentData<EntryInputType> &
        ({ _key: string } | { _id: string })
    >,
    options?: documents.ReplaceDocumentOptions
  ): Promise<
    Array<
      | (documents.DocumentOperationMetadata & {
          new?: documents.Edge<EntryResultType>;
          old?: documents.Edge<EntryResultType>;
        })
      | documents.DocumentOperationFailure
    >
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
   * ```
   */
  update(
    selector: documents.DocumentSelector,
    newData: documents.Patch<documents.DocumentData<EntryInputType>>,
    options?: documents.UpdateDocumentOptions
  ): Promise<
    documents.DocumentOperationMetadata & {
      new?: documents.Edge<EntryResultType>;
      old?: documents.Edge<EntryResultType>;
    }
  >;
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
      documents.Patch<documents.DocumentData<EntryInputType>> &
        ({ _key: string } | { _id: string })
    >,
    options?: documents.UpdateDocumentOptions
  ): Promise<
    Array<
      | (documents.DocumentOperationMetadata & {
          new?: documents.Edge<EntryResultType>;
          old?: documents.Edge<EntryResultType>;
        })
      | documents.DocumentOperationFailure
    >
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
   * const collection = db.collection("friends");
   * const doc = await collection.document("musadir");
   * await collection.remove(doc);
   * // document with key "musadir" deleted
   * ```
   */
  remove(
    selector: documents.DocumentSelector,
    options?: documents.RemoveDocumentOptions
  ): Promise<
    documents.DocumentMetadata & { old?: documents.Edge<EntryResultType> }
  >;
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
    selectors: documents.DocumentSelector[],
    options?: documents.RemoveDocumentOptions
  ): Promise<
    Array<
      | (documents.DocumentMetadata & { old?: documents.Edge<EntryResultType> })
      | documents.DocumentOperationFailure
    >
  >;
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
    data: documents.EdgeData<EntryInputType>[],
    options?: documents.ImportDocumentsOptions
  ): Promise<documents.ImportDocumentsResult>;
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
    options?: documents.ImportDocumentsOptions
  ): Promise<documents.ImportDocumentsResult>;
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
    options?: documents.ImportDocumentsOptions & {
      type?: "documents" | "list" | "auto";
    }
  ): Promise<documents.ImportDocumentsResult>;
  //#endregion

  //#region Edge operations
  /**
   * Retrieves a list of all edges in this collection of the document matching
   * the given `selector`.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param options - Options for retrieving the edges.
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
    selector: documents.DocumentSelector,
    options?: documents.DocumentEdgesOptions
  ): Promise<
    connection.ArangoApiResponse<documents.DocumentEdgesResult<EntryResultType>>
  >;
  /**
   * Retrieves a list of all incoming edges of the document matching the given
   * `selector`.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param options - Options for retrieving the edges.
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
   * ```
   */
  inEdges(
    selector: documents.DocumentSelector,
    options?: documents.DocumentEdgesOptions
  ): Promise<
    connection.ArangoApiResponse<documents.DocumentEdgesResult<EntryResultType>>
  >;
  /**
   * Retrieves a list of all outgoing edges of the document matching the given
   * `selector`.
   *
   * Throws an exception when passed a document or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a document from this collection).
   * @param options - Options for retrieving the edges.
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
    selector: documents.DocumentSelector,
    options?: documents.DocumentEdgesOptions
  ): Promise<
    connection.ArangoApiResponse<documents.DocumentEdgesResult<EntryResultType>>
  >;
  //#endregion
}
//#endregion

//#region Collection class
/**
 * @internal
 */
export class Collection<
    EntryResultType extends Record<string, any> = any,
    EntryInputType extends Record<string, any> = EntryResultType,
  >
  implements
    EdgeCollection<EntryResultType, EntryInputType>,
    DocumentCollection<EntryResultType, EntryInputType>
{
  protected _name: string;
  protected _db: databases.Database;

  /**
   * @internal
   */
  constructor(db: databases.Database, name: string) {
    this._name = name;
    this._db = db;
  }

  get isArangoCollection(): true {
    return true;
  }

  get database() {
    return this._db;
  }

  get name() {
    return this._name;
  }

  //#region Collection operations
  get() {
    return this._db.request({
      pathname: `/_api/collection/${encodeURIComponent(this._name)}`,
    });
  }

  async exists() {
    try {
      await this.get();
      return true;
    } catch (err: any) {
      if (errors.isArangoError(err) && err.errorNum === COLLECTION_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  create(
    options: CreateCollectionOptions & {
      type?: CollectionType;
    } = {}
  ) {
    const {
      waitForSyncReplication = undefined,
      enforceReplicationFactor = undefined,
      ...opts
    } = options;
    if (opts.computedValues) {
      opts.computedValues = opts.computedValues.map((computedValue) => {
        if (aql.isAqlLiteral(computedValue.expression)) {
          return {
            ...computedValue,
            expression: computedValue.expression.toAQL(),
          };
        }
        if (aql.isAqlQuery(computedValue.expression)) {
          return {
            ...computedValue,
            expression: computedValue.expression.query,
          };
        }
        return computedValue;
      });
    }
    const search: Record<string, any> = {};
    if (typeof waitForSyncReplication === "boolean") {
      search.waitForSyncReplication = waitForSyncReplication ? 1 : 0;
    }
    if (typeof enforceReplicationFactor === "boolean") {
      search.enforceReplicationFactor = enforceReplicationFactor ? 1 : 0;
    }
    return this._db.request({
      method: "POST",
      pathname: "/_api/collection",
      search,
      body: {
        ...opts,
        name: this._name,
      },
    });
  }

  properties(
    properties?: CollectionPropertiesOptions
  ): Promise<
    connection.ArangoApiResponse<CollectionDescription & CollectionProperties>
  > {
    if (!properties) {
      return this._db.request({
        pathname: `/_api/collection/${encodeURIComponent(this._name)}/properties`,
      });
    }
    return this._db.request({
      method: "PUT",
      pathname: `/_api/collection/${encodeURIComponent(this._name)}/properties`,
      body: properties,
    });
  }

  count(): Promise<
    connection.ArangoApiResponse<
      CollectionDescription & CollectionProperties & { count: number }
    >
  > {
    return this._db.request({
      pathname: `/_api/collection/${encodeURIComponent(this._name)}/count`,
    });
  }

  async recalculateCount(): Promise<boolean> {
    return this._db.request(
      {
        method: "PUT",
        pathname: `/_api/collection/${encodeURIComponent(
          this._name
        )}/recalculateCount`,
      },
      (res) => res.parsedBody.result
    );
  }

  figures(
    details = false
  ): Promise<
    connection.ArangoApiResponse<
      CollectionDescription &
        CollectionProperties & { count: number; figures: Record<string, any> }
    >
  > {
    return this._db.request({
      pathname: `/_api/collection/${encodeURIComponent(this._name)}/figures`,
      search: { details },
    });
  }

  revision(): Promise<
    connection.ArangoApiResponse<
      CollectionDescription & CollectionProperties & { revision: string }
    >
  > {
    return this._db.request({
      pathname: `/_api/collection/${encodeURIComponent(this._name)}/revision`,
    });
  }

  checksum(
    options?: CollectionChecksumOptions
  ): Promise<
    connection.ArangoApiResponse<
      CollectionDescription & { revision: string; checksum: string }
    >
  > {
    return this._db.request({
      pathname: `/_api/collection/${encodeURIComponent(this._name)}/checksum`,
      search: options,
    });
  }

  shards(
    details?: boolean
  ): Promise<
    connection.ArangoApiResponse<
      CollectionDescription & CollectionProperties & { shards: any }
    >
  > {
    return this._db.request({
      pathname: `/_api/collection/${encodeURIComponent(this._name)}/shards`,
      search: { details },
    });
  }

  async rename(newName: string) {
    const result = await this._db.renameCollection(this._name, newName);
    this._name = newName;
    return result;
  }

  truncate(
    options?: TruncateCollectionOptions
  ): Promise<connection.ArangoApiResponse<CollectionDescription>> {
    return this._db.request({
      method: "PUT",
      pathname: `/_api/collection/${this._name}/truncate`,
      search: options,
    });
  }

  drop(options?: DropCollectionOptions) {
    return this._db.request({
      method: "DELETE",
      pathname: `/_api/collection/${encodeURIComponent(this._name)}`,
      search: options,
    });
  }

  compact() {
    return this._db.request({
      method: "PUT",
      pathname: `/_api/collection/${this._name}/compact`,
    });
  }
  //#endregion

  //#region Document operations
  getResponsibleShard(
    document: Partial<documents.Document<EntryResultType>>
  ): Promise<string> {
    return this._db.request(
      {
        method: "PUT",
        pathname: `/_api/collection/${encodeURIComponent(
          this._name
        )}/responsibleShard`,
        body: document,
      },
      (res) => res.parsedBody.shardId
    );
  }

  documentId(selector: documents.DocumentSelector): string {
    return documents._documentHandle(selector, this._name);
  }

  async documentExists(
    selector: documents.DocumentSelector,
    options: documents.DocumentExistsOptions = {}
  ): Promise<boolean> {
    const { ifMatch = undefined, ifNoneMatch = undefined } = options;
    const headers = {} as Record<string, string>;
    if (ifMatch) headers["if-match"] = ifMatch;
    if (ifNoneMatch) headers["if-none-match"] = ifNoneMatch;
    try {
      return await this._db.request(
        {
          method: "HEAD",
          pathname: `/_api/document/${encodeURI(
            documents._documentHandle(selector, this._name)
          )}`,
          headers,
        },
        (res) => {
          if (ifNoneMatch && res.status === 304) {
            throw new errors.HttpError(res);
          }
          return true;
        }
      );
    } catch (err: any) {
      if (err.code === 404) {
        return false;
      }
      throw err;
    }
  }

  documents(
    selectors: (string | documents.ObjectWithDocumentKey)[],
    options: documents.BulkReadDocumentsOptions = {}
  ) {
    const { allowDirtyRead = undefined } = options;
    return this._db.request({
      method: "PUT",
      pathname: `/_api/document/${encodeURIComponent(this._name)}`,
      search: { onlyget: true },
      allowDirtyRead,
      body: selectors,
    });
  }

  async document(
    selector: documents.DocumentSelector,
    options: boolean | documents.ReadDocumentOptions = {}
  ) {
    if (typeof options === "boolean") {
      options = { graceful: options };
    }
    const {
      allowDirtyRead = undefined,
      graceful = false,
      ifMatch = undefined,
      ifNoneMatch = undefined,
    } = options;
    const headers = {} as Record<string, string>;
    if (ifMatch) headers["if-match"] = ifMatch;
    if (ifNoneMatch) headers["if-none-match"] = ifNoneMatch;
    const result = this._db.request(
      {
        pathname: `/_api/document/${encodeURI(
          documents._documentHandle(selector, this._name)
        )}`,
        headers,
        allowDirtyRead,
      },
      (res) => {
        if (ifNoneMatch && res.status === 304) {
          throw new errors.HttpError(res);
        }
        return res.parsedBody;
      }
    );
    if (!graceful) return result;
    try {
      return await result;
    } catch (err: any) {
      if (errors.isArangoError(err) && err.errorNum === DOCUMENT_NOT_FOUND) {
        return null;
      }
      throw err;
    }
  }

  save(
    data: documents.DocumentData<EntryInputType>,
    options?: documents.InsertDocumentOptions
  ) {
    return this._db.request(
      {
        method: "POST",
        pathname: `/_api/document/${encodeURIComponent(this._name)}`,
        body: data,
        search: options,
      },
      (res) => (options?.silent ? undefined : res.parsedBody)
    );
  }

  saveAll(
    data: Array<documents.DocumentData<EntryInputType>>,
    options?: documents.InsertDocumentOptions
  ) {
    return this._db.request(
      {
        method: "POST",
        pathname: `/_api/document/${encodeURIComponent(this._name)}`,
        body: data,
        search: options,
      },
      (res) => (options?.silent ? undefined : res.parsedBody)
    );
  }

  replace(
    selector: documents.DocumentSelector,
    newData: documents.DocumentData<EntryInputType>,
    options: documents.ReplaceDocumentOptions = {}
  ) {
    const { ifMatch = undefined, ...opts } = options;
    const headers = {} as Record<string, string>;
    if (ifMatch) headers["if-match"] = ifMatch;
    return this._db.request(
      {
        method: "PUT",
        pathname: `/_api/document/${encodeURI(
          documents._documentHandle(selector, this._name)
        )}`,
        headers,
        body: newData,
        search: opts,
      },
      (res) => (options?.silent ? undefined : res.parsedBody)
    );
  }

  replaceAll(
    newData: Array<
      documents.DocumentData<EntryInputType> &
        ({ _key: string } | { _id: string })
    >,
    options?: documents.ReplaceDocumentOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        pathname: `/_api/document/${encodeURIComponent(this._name)}`,
        body: newData,
        search: options,
      },
      (res) => (options?.silent ? undefined : res.parsedBody)
    );
  }

  update(
    selector: documents.DocumentSelector,
    newData: documents.Patch<documents.DocumentData<EntryInputType>>,
    options: documents.UpdateDocumentOptions = {}
  ) {
    const { ifMatch = undefined, ...opts } = options;
    const headers = {} as Record<string, string>;
    if (ifMatch) headers["if-match"] = ifMatch;
    return this._db.request(
      {
        method: "PATCH",
        pathname: `/_api/document/${encodeURI(
          documents._documentHandle(selector, this._name)
        )}`,
        headers,
        body: newData,
        search: opts,
      },
      (res) => (options?.silent ? undefined : res.parsedBody)
    );
  }

  updateAll(
    newData: Array<
      documents.Patch<documents.DocumentData<EntryInputType>> &
        ({ _key: string } | { _id: string })
    >,
    options?: documents.UpdateDocumentOptions
  ) {
    return this._db.request(
      {
        method: "PATCH",
        pathname: `/_api/document/${encodeURIComponent(this._name)}`,
        body: newData,
        search: options,
      },
      (res) => (options?.silent ? undefined : res.parsedBody)
    );
  }

  remove(
    selector: documents.DocumentSelector,
    options: documents.RemoveDocumentOptions = {}
  ) {
    const { ifMatch = undefined, ...opts } = options;
    const headers = {} as Record<string, string>;
    if (ifMatch) headers["if-match"] = ifMatch;
    return this._db.request(
      {
        method: "DELETE",
        pathname: `/_api/document/${encodeURI(
          documents._documentHandle(selector, this._name)
        )}`,
        headers,
        search: opts,
      },
      (res) => (options?.silent ? undefined : res.parsedBody)
    );
  }

  removeAll(
    selectors: (string | documents.ObjectWithDocumentKey)[],
    options?: documents.RemoveDocumentOptions
  ) {
    return this._db.request(
      {
        method: "DELETE",
        pathname: `/_api/document/${encodeURIComponent(this._name)}`,
        body: selectors,
        search: options,
      },
      (res) => (options?.silent ? undefined : res.parsedBody)
    );
  }

  import(
    data: Buffer | Blob | string | any[],
    options: documents.ImportDocumentsOptions & {
      type?: "documents" | "list" | "auto";
    } = {}
  ): Promise<documents.ImportDocumentsResult> {
    const search = { ...options, collection: this._name };
    if (Array.isArray(data)) {
      search.type = Array.isArray(data[0]) ? undefined : "documents";
      const lines = data as any[];
      data = lines.map((line) => JSON.stringify(line)).join("\r\n") + "\r\n";
    }
    return this._db.request({
      method: "POST",
      pathname: "/_api/import",
      body: data,
      isBinary: true,
      search,
    });
  }
  //#endregion

  //#region Edge operations
  protected _edges(
    selector: documents.DocumentSelector,
    options: documents.DocumentEdgesOptions = {},
    direction?: "in" | "out"
  ) {
    const { allowDirtyRead = undefined } = options;
    return this._db.request({
      pathname: `/_api/edges/${encodeURIComponent(this._name)}`,
      allowDirtyRead,
      search: {
        direction,
        vertex: documents._documentHandle(selector, this._name, false),
      },
    });
  }

  edges(
    vertex: documents.DocumentSelector,
    options?: documents.DocumentEdgesOptions
  ) {
    return this._edges(vertex, options);
  }

  inEdges(
    vertex: documents.DocumentSelector,
    options?: documents.DocumentEdgesOptions
  ) {
    return this._edges(vertex, options, "in");
  }

  outEdges(
    vertex: documents.DocumentSelector,
    options?: documents.DocumentEdgesOptions
  ) {
    return this._edges(vertex, options, "out");
  }
  //#endregion

  //#region Index operations
  async loadIndexes(): Promise<boolean> {
    return this._db.request(
      {
        method: "PUT",
        pathname: `/_api/collection/${encodeURIComponent(
          this._name
        )}/loadIndexesIntoMemory`,
      },
      (res) => res.parsedBody.result
    );
  }

  indexes(options?: indexes.ListIndexesOptions) {
    return this._db.request(
      {
        pathname: "/_api/index",
        search: { collection: this._name, ...options },
      },
      (res) => res.parsedBody.indexes
    );
  }

  index(selector: indexes.IndexSelector) {
    return this._db.request({
      pathname: `/_api/index/${encodeURI(indexes._indexHandle(selector, this._name))}`,
    });
  }

  ensureIndex(options: indexes.EnsureIndexOptions) {
    return this._db.request({
      method: "POST",
      pathname: "/_api/index",
      body: options,
      search: { collection: this._name },
    });
  }

  dropIndex(selector: indexes.IndexSelector) {
    return this._db.request({
      method: "DELETE",
      pathname: `/_api/index/${encodeURI(indexes._indexHandle(selector, this._name))}`,
    });
  }
  //#endregion
}
//#endregion
