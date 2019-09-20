import { Connection, RequestOptions } from "./connection";
import { ArrayCursor } from "./cursor";
import { isArangoError } from "./error";
import { COLLECTION_NOT_FOUND, DOCUMENT_NOT_FOUND } from "./util/codes";
import { ArangoResponseMetadata, Patch, StrictObject } from "./util/types";

export function documentHandle(
  selector: DocumentSelector,
  collectionName: string
): string {
  if (typeof selector !== "string") {
    if (selector._id) {
      return documentHandle(selector._id, collectionName);
    }
    if (selector._key) {
      return documentHandle(selector._key, collectionName);
    }
    throw new Error(
      "Document handle must be a string or an object with a _key or _id attribute"
    );
  }
  if (selector.includes("/")) {
    if (selector.startsWith(`${collectionName}/`)) {
      throw new Error(
        `Document ID "${selector}" does not match collection name "${collectionName}"`
      );
    }
    return selector;
  }
  return `${collectionName}/${selector}`;
}

export function indexHandle(
  selector: IndexSelector,
  collectionName: string
): string {
  if (typeof selector !== "string") {
    if (selector.id) {
      return indexHandle(selector.id, collectionName);
    }
    throw new Error(
      "Index handle must be a string or an object with an id attribute"
    );
  }
  if (selector.includes("/")) {
    if (!selector.startsWith(`${collectionName}/`)) {
      throw new Error(
        `Index ID "${selector}" does not match collection name "${collectionName}"`
      );
    }
    return selector;
  }
  return `${collectionName}/${selector}`;
}

export function isArangoCollection(
  collection: any
): collection is ArangoCollection {
  return Boolean(collection && collection.isArangoCollection);
}

export interface ArangoCollection {
  isArangoCollection: true;
  name: string;
}

export enum CollectionType {
  DOCUMENT_COLLECTION = 2,
  EDGE_COLLECTION = 3,
}

export enum CollectionStatus {
  NEWBORN = 1,
  UNLOADED = 2,
  LOADED = 3,
  UNLOADING = 4,
  DELETED = 5,
  LOADING = 6,
}

export type KeyGenerator = "traditional" | "autoincrement" | "uuid" | "padded";

export type ShardingStrategy =
  | "hash"
  | "enterprise-hash-smart-edge"
  | "community-compat"
  | "enterprise-compat"
  | "enterprise-smart-edge-compat";

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryAllKeys = "id" | "key" | "path";

export type CollectionMetadata = {
  name: string;
  status: CollectionStatus;
  type: CollectionType;
  isSystem: boolean;
};

export type ListCollectionResult = CollectionMetadata & {
  id: string;
  globallyUniqueId: string;
};

export type CollectionProperties = CollectionMetadata & {
  statusString: string;
  waitForSync: boolean;
  keyOptions: {
    allowUserKeys: boolean;
    type: KeyGenerator;
    lastValue: number;
  };

  cacheEnabled?: boolean;
  doCompact?: boolean;
  journalSize?: number;
  indexBuckets?: number;

  numberOfShards?: number;
  shardKeys?: string[];
  replicationFactor?: number;
  shardingStrategy?: ShardingStrategy;
};

// Options

export type CollectionPropertiesOptions = {
  waitForSync?: boolean;
  journalSize?: number;
  indexBuckets?: number;
  replicationFactor?: number;
};

export type CollectionChecksumOptions = {
  withRevisions?: boolean;
  withData?: boolean;
};

export type CollectionDropOptions = {
  isSystem?: boolean;
};

export type CreateCollectionOptions = {
  waitForSync?: boolean;
  journalSize?: number;
  isVolatile?: boolean;
  isSystem?: boolean;
  keyOptions?: {
    type?: KeyGenerator;
    allowUserKeys?: boolean;
    increment?: number;
    offset?: number;
  };
  numberOfShards?: number;
  shardKeys?: string[];
  replicationFactor?: number;
};

export type CollectionCreateOptions = CreateCollectionOptions & {
  type?: CollectionType;
  waitForSyncReplication?: boolean;
  enforceReplicationFactor?: boolean;
};

export type CollectionReadOptions = {
  graceful?: boolean;
  allowDirtyRead?: boolean;
};

interface CollectionSaveOptions {
  waitForSync?: boolean;
  silent?: boolean;
  returnNew?: boolean;
  returnOld?: boolean;
}

export type CollectionInsertOptions = CollectionSaveOptions & {
  overwrite?: boolean;
};

export type CollectionReplaceOptions = CollectionSaveOptions & {
  ignoreRevs?: boolean;
};

export type CollectionUpdateOptions = CollectionReplaceOptions & {
  keepNull?: boolean;
  mergeObjects?: boolean;
};

export type CollectionRemoveOptions = {
  rSync?: boolean;
  returnOld?: boolean;
  silent?: boolean;
};

export type CollectionImportOptions = {
  type?: null | "auto" | "documents" | "array";
  fromPrefix?: string;
  toPrefix?: string;
  overwrite?: boolean;
  waitForSync?: boolean;
  onDuplicate?: "error" | "update" | "replace" | "ignore";
  complete?: boolean;
  details?: boolean;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryByExampleOptions = {
  skip?: number;
  limit?: number;
  batchSize?: number;
  ttl?: number;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryAllOptions = SimpleQueryByExampleOptions & {
  stream?: boolean;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryUpdateByExampleOptions = {
  keepNull?: boolean;
  waitForSync?: boolean;
  limit?: number;
  mergeObjects?: boolean;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryRemoveByExampleOptions = {
  waitForSync?: boolean;
  limit?: number;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryReplaceByExampleOptions = SimpleQueryRemoveByExampleOptions;

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryRemoveByKeysOptions = {
  returnOld?: boolean;
  silent?: boolean;
  waitForSync?: boolean;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryFulltextOptions = {
  index?: string;
  limit?: number;
  skip?: number;
};

/** @deprecated ArangoDB 3.4 */
export type TraversalOptions = {
  init?: string;
  filter?: string;
  sort?: string;
  visitor?: string;
  expander?: string;
  direction?: "inbound" | "outbound" | "any";
  itemOrder?: "forward" | "backward";
  strategy?: "depthfirst" | "breadthfirst";
  order?: "preorder" | "postorder" | "preorder-expander";
  uniqueness?: {
    vertices?: "none" | "global" | "path";
    edges?: "none" | "global" | "path";
  };
  minDepth?: number;
  maxDepth?: number;
  maxIterations?: number;
};

export type EnsureHashIndexOptions = {
  unique?: boolean;
  sparse?: boolean;
  deduplicate?: boolean;
};

export type EnsureSkiplistIndexOptions = EnsureHashIndexOptions;

export type EnsurePersistentIndexOptions = {
  unique?: boolean;
  sparse?: boolean;
};

export type EnsureGeoIndexOptions = {
  geoJson?: boolean;
};

export type EnsureFulltextIndexOptions = {
  minLength?: number;
};

export type EnsureIndexHashOptions = EnsureHashIndexOptions & {
  type: "hash";
  fields: string[];
};

export type EnsureIndexSkiplistOptions = EnsureSkiplistIndexOptions & {
  type: "skiplist";
  fields: string[];
};

export type EnsureIndexPersistentOptions = EnsurePersistentIndexOptions & {
  type: "persistent";
  fields: string[];
};

export type EnsureIndexGeoOptions = EnsureGeoIndexOptions & {
  type: "geo";
  fields: [string] | [string, string];
};

export type EnsureIndexFulltextOptions = EnsureFulltextIndexOptions & {
  type: "fulltext";
  fields: string[];
};

export type EnsureIndexOptions =
  | EnsureIndexHashOptions
  | EnsureIndexSkiplistOptions
  | EnsureIndexPersistentOptions
  | EnsureIndexGeoOptions
  | EnsureIndexFulltextOptions;

// Results

export type CollectionPropertiesAndCount = CollectionProperties & {
  count: number;
};

export type CollectionPropertiesAndFigures = CollectionProperties & {
  count: number;
  figures: {
    alive: {
      count: number;
      size: number;
    };
    dead: {
      count: number;
      size: number;
      deletion: number;
    };
    datafiles: {
      count: number;
      fileSize: number;
    };
    journals: {
      count: number;
      fileSize: number;
    };
    compactors: {
      count: number;
      fileSize: number;
    };
    shapefiles: {
      count: number;
      fileSize: number;
    };
    shapes: {
      count: number;
      size: number;
    };
    attributes: {
      count: number;
      size: number;
    };
    indexes: {
      count: number;
      size: number;
    };
    lastTick: number;
    uncollectedLogfileEntries: number;
    documentReferences: number;
    waitingFor: string;
    compactionStatus: {
      time: string;
      message: string;
      count: number;
      filesCombined: number;
      bytesRead: number;
      bytesWritten: number;
    };
  };
};

export type CollectionPropertiesAndRevision = CollectionProperties & {
  revision: string;
};

export type CollectionChecksum = {
  revision: string;
  checksum: string;
};

export type CollectionLoadResult = CollectionMetadata & {
  count?: number;
};

export type CollectionImportResult = {
  error: false;
  created: number;
  errors: number;
  empty: number;
  updated: number;
  ignored: number;
  details?: string[];
};

export type CollectionEdgesResult<T extends object = any> = {
  edges: Edge<T>[];
  stats: {
    scannedIndex: number;
    filtered: number;
  };
};

export type CollectionInsertResult<T> = DocumentMetadata & {
  new?: T;
};

export type CollectionRemoveResult<T> = DocumentMetadata & {
  old?: T;
};

export type CollectionSaveResult<T> = CollectionInsertResult<T> &
  CollectionRemoveResult<T>;

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryRemoveByExampleResult = {
  deleted: number;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryReplaceByExampleResult = {
  replaced: number;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryUpdateByExampleResult = {
  updated: number;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryRemoveByKeysResult<T extends object = any> = {
  removed: number;
  ignored: number;
  old?: DocumentMetadata[] | Document<T>[];
};

export type CollectionIndexResult = {
  id: string;
};

// Document

export type ObjectWithId = {
  [key: string]: any;
  _id: string;
};

export type ObjectWithKey = {
  [key: string]: any;
  _id: string;
};

export type DocumentLike = ObjectWithId | ObjectWithKey;

export type DocumentSelector = DocumentLike | string;

export type DocumentMetadata = {
  _key: string;
  _id: string;
  _rev: string;
};

export type UpdateMetadata = DocumentMetadata & {
  _oldRev: string;
};

export type EdgeMetadata = {
  _from: string;
  _to: string;
};

export type DocumentData<T extends object = any> = StrictObject<T> &
  Partial<DocumentMetadata> &
  Partial<EdgeMetadata>;

export type EdgeData<T extends object = any> = StrictObject<T> &
  Partial<DocumentMetadata> &
  EdgeMetadata;

export type Document<T extends object = any> = StrictObject<T> &
  DocumentMetadata &
  Partial<EdgeMetadata>;

export type Edge<T extends object = any> = StrictObject<T> &
  DocumentMetadata &
  EdgeMetadata;

// Indexes

export type GenericIndex = {
  fields: string[];
  name: string;
  id: string;
  sparse: boolean;
  unique: boolean;
};

export type SkiplistIndex = GenericIndex & {
  type: "skiplist";
};

export type HashIndex = GenericIndex & {
  type: "hash";
  selectivityEstimate: number;
};

export type PrimaryIndex = GenericIndex & {
  type: "primary";
  selectivityEstimate: number;
};

export type PersistentIndex = GenericIndex & {
  type: "persistent";
};

export type FulltextIndex = GenericIndex & {
  type: "fulltext";
  minLength: number;
};

export type GeoIndex = GenericIndex & {
  type: "geo";
  fields: [string] | [string, string];
  geoJson: boolean;
  bestIndexedLevel: number;
  worstIndexedLevel: number;
  maxNumCoverCells: number;
};

export type Index =
  | GeoIndex
  | FulltextIndex
  | PersistentIndex
  | PrimaryIndex
  | HashIndex
  | SkiplistIndex;

export type IndexSelector = string | Index;

// Collections

export interface DocumentCollection<T extends object = any>
  extends ArangoCollection {
  exists(): Promise<boolean>;
  get(): Promise<ArangoResponseMetadata & CollectionMetadata>;
  create(
    properties?: CollectionCreateOptions
  ): Promise<ArangoResponseMetadata & CollectionProperties>;
  properties(): Promise<ArangoResponseMetadata & CollectionProperties>;
  properties(
    properties: CollectionPropertiesOptions
  ): Promise<ArangoResponseMetadata & CollectionProperties>;
  count(): Promise<ArangoResponseMetadata & CollectionPropertiesAndCount>;
  figures(): Promise<ArangoResponseMetadata & CollectionPropertiesAndFigures>;
  revision(): Promise<ArangoResponseMetadata & CollectionPropertiesAndRevision>;
  checksum(
    opts?: CollectionChecksumOptions
  ): Promise<ArangoResponseMetadata & CollectionChecksum>;
  load(count?: boolean): Promise<ArangoResponseMetadata & CollectionLoadResult>;
  unload(): Promise<ArangoResponseMetadata & CollectionMetadata>;
  rename(name: string): Promise<ArangoResponseMetadata & CollectionMetadata>;
  rotate(): Promise<boolean>;
  truncate(): Promise<ArangoResponseMetadata & CollectionMetadata>;
  drop(opts?: CollectionDropOptions): Promise<ArangoResponseMetadata>;

  //#region crud
  getResponsibleShard(document: Partial<Document<T>>): Promise<string>;
  documentId(selector: DocumentSelector): string;
  documentExists(selector: DocumentSelector): Promise<boolean>;
  document(
    selector: DocumentSelector,
    opts?: CollectionReadOptions
  ): Promise<Document<T>>;
  document(selector: DocumentSelector, graceful: boolean): Promise<Document<T>>;
  save(
    data: DocumentData<T>,
    opts?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  saveAll(
    data: Array<DocumentData<T>>,
    opts?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    opts?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  replaceAll(
    newValues: Array<DocumentData<T> & DocumentLike>,
    opts?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    opts?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  updateAll(
    newValues: Array<Patch<DocumentData<T>> & DocumentLike>,
    opts?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  remove(
    selector: DocumentSelector,
    opts?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Document<T>>>;
  removeAll(
    selector: Array<DocumentSelector>,
    opts?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Document<T>>[]>;
  import(
    data: Buffer | Blob | string,
    opts?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  import(
    data: string[][],
    opts?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  import(
    data: Array<DocumentData<T>>,
    opts?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  //#endregion

  //#region simple queries
  /** @deprecated ArangoDB 3.4 */
  list(type?: SimpleQueryAllKeys): Promise<ArrayCursor<string>>;
  /** @deprecated ArangoDB 3.4 */
  all(opts?: SimpleQueryAllOptions): Promise<ArrayCursor<Document<T>>>;
  /** @deprecated ArangoDB 3.4 */
  any(): Promise<Document<T>>;
  /** @deprecated ArangoDB 3.4 */
  byExample(
    example: Partial<DocumentData<T>>,
    opts?: SimpleQueryByExampleOptions
  ): Promise<ArrayCursor<Document<T>>>;
  /** @deprecated ArangoDB 3.4 */
  firstExample(example: Partial<DocumentData<T>>): Promise<Document<T>>;
  /** @deprecated ArangoDB 3.4 */
  removeByExample(
    example: Partial<DocumentData<T>>,
    opts?: SimpleQueryRemoveByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryRemoveByExampleResult>;
  /** @deprecated ArangoDB 3.4 */
  replaceByExample(
    example: Partial<DocumentData<T>>,
    newValue: DocumentData<T>,
    opts?: SimpleQueryReplaceByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryReplaceByExampleResult>;
  /** @deprecated ArangoDB 3.4 */
  updateByExample(
    example: Partial<DocumentData<T>>,
    newValue: Patch<DocumentData<T>>,
    opts?: SimpleQueryUpdateByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryUpdateByExampleResult>;
  remove(
    selector: DocumentSelector,
    opts?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Edge<T>>>;
  removeAll(
    selector: Array<DocumentSelector>,
    opts?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Edge<T>>[]>;
  /** @deprecated ArangoDB 3.4 */
  lookupByKeys(keys: string[]): Promise<Document<T>[]>;
  /** @deprecated ArangoDB 3.4 */
  removeByKeys(
    keys: string[],
    opts?: SimpleQueryRemoveByKeysOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryRemoveByKeysResult<T>>;
  /** @deprecated ArangoDB 3.4 */
  fulltext(
    attribute: string,
    query: string,
    opts?: SimpleQueryFulltextOptions
  ): Promise<ArrayCursor<Document<T>>>;
  //#endregion

  //#region indexes
  indexes(): Promise<Index[]>;
  index(selector: IndexSelector): Promise<Index[]>;
  ensureIndex(
    details: EnsureIndexOptions
  ): Promise<ArangoResponseMetadata & Index & { isNewlyCreated: boolean }>;
  dropIndex(
    selector: IndexSelector
  ): Promise<ArangoResponseMetadata & CollectionIndexResult>;
  ensureHashIndex(
    fields: string | string[],
    opts?: EnsureHashIndexOptions
  ): Promise<ArangoResponseMetadata & HashIndex & { isNewlyCreated: boolean }>;
  ensureSkiplist(
    fields: string | string[],
    opts?: EnsureSkiplistIndexOptions
  ): Promise<
    ArangoResponseMetadata & SkiplistIndex & { isNewlyCreated: boolean }
  >;
  ensurePersistentIndex(
    fields: string | string[],
    opts?: EnsurePersistentIndexOptions
  ): Promise<
    ArangoResponseMetadata & PersistentIndex & { isNewlyCreated: boolean }
  >;
  ensureGeoIndex(
    fields: string | [string] | [string, string],
    opts?: EnsureGeoIndexOptions
  ): Promise<ArangoResponseMetadata & GeoIndex & { isNewlyCreated: boolean }>;
  ensureFulltextIndex(
    fields: string | string[],
    opts?: EnsureFulltextIndexOptions
  ): Promise<
    ArangoResponseMetadata & FulltextIndex & { isNewlyCreated: boolean }
  >;
  //#endregion
}

export interface EdgeCollection<T extends object = any>
  extends DocumentCollection<T> {
  //#region crud
  edge(
    selector: DocumentSelector,
    opts?: CollectionReadOptions
  ): Promise<Edge<T>>;
  edge(selector: DocumentSelector, graceful: boolean): Promise<Edge<T>>;
  document(
    selector: DocumentSelector,
    opts?: CollectionReadOptions
  ): Promise<Edge<T>>;
  document(selector: DocumentSelector, graceful: boolean): Promise<Edge<T>>;
  save(
    data: EdgeData<T>,
    opts?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  saveAll(
    data: Array<EdgeData<T>>,
    opts?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    opts?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  replaceAll(
    newValues: Array<DocumentData<T> & DocumentLike>,
    opts?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    opts?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  updateAll(
    newValues: Array<Patch<DocumentData<T>> & DocumentLike>,
    opts?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
  import(
    data: Buffer | Blob | string,
    opts?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  import(
    data: string[][],
    opts?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  import(
    data: Array<EdgeData<T>>,
    opts?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  //#endregion

  //#region simple queries
  /** @deprecated ArangoDB 3.4 */
  all(opts?: SimpleQueryAllOptions): Promise<ArrayCursor<Edge<T>>>;
  /** @deprecated ArangoDB 3.4 */
  any(): Promise<Edge<T>>;
  /** @deprecated ArangoDB 3.4 */
  byExample(
    example: Partial<DocumentData<T>>,
    opts?: SimpleQueryByExampleOptions
  ): Promise<ArrayCursor<Edge<T>>>;
  /** @deprecated ArangoDB 3.4 */
  firstExample(example: Partial<DocumentData<T>>): Promise<Edge<T>>;
  /** @deprecated ArangoDB 3.4 */
  lookupByKeys(keys: string[]): Promise<Edge<T>[]>;
  /** @deprecated ArangoDB 3.4 */
  fulltext(
    attribute: string,
    query: string,
    opts?: SimpleQueryFulltextOptions
  ): Promise<ArrayCursor<Edge<T>>>;
  //#endregion

  //#region edges
  edges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  inEdges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  outEdges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  /** @deprecated ArangoDB 3.4 */
  traversal(
    startVertex: DocumentSelector,
    opts?: TraversalOptions
  ): Promise<any>;
  //#endregion
}

export class Collection<T extends object = any>
  implements EdgeCollection<T>, DocumentCollection<T> {
  //#region attributes
  isArangoCollection: true = true;
  protected _name: string;
  protected _idPrefix: string;
  protected _connection: Connection;
  //#endregion

  constructor(connection: Connection, name: string) {
    this._name = name;
    this._idPrefix = `${this._name}/`;
    this._connection = connection;
  }

  //#region internals

  protected _get(path: string, qs?: any) {
    return this._connection.request(
      { path: `/_api/collection/${this._name}/${path}`, qs },
      (res) => res.body
    );
  }

  protected _put(path: string, body?: any) {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/collection/${this._name}/${path}`,
        body,
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region metadata
  get name() {
    return this._name;
  }

  get() {
    return this._connection.request(
      { path: `/_api/collection/${this._name}` },
      (res) => res.body
    );
  }

  exists() {
    return this.get().then(
      () => true,
      (err) => {
        if (isArangoError(err) && err.errorNum === COLLECTION_NOT_FOUND) {
          return false;
        }
        throw err;
      }
    );
  }

  create(properties?: CollectionCreateOptions) {
    const {
      waitForSyncReplication = undefined,
      enforceReplicationFactor = undefined,
      ...options
    } = properties || {};
    const qs: RequestOptions["qs"] = {};
    if (typeof waitForSyncReplication === "boolean") {
      qs.waitForSyncReplication = waitForSyncReplication ? 1 : 0;
    }
    if (typeof enforceReplicationFactor === "boolean") {
      qs.enforceReplicationFactor = enforceReplicationFactor ? 1 : 0;
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/collection",
        qs,
        body: {
          ...options,
          name: this.name,
        },
      },
      (res) => res.body
    );
  }

  properties(properties?: CollectionPropertiesOptions) {
    if (!properties) return this._get("properties");
    return this._put("properties", properties);
  }

  count() {
    return this._get("count");
  }

  figures() {
    return this._get("figures");
  }

  revision() {
    return this._get("revision");
  }

  checksum(opts?: CollectionChecksumOptions) {
    return this._get("checksum", opts);
  }

  load(count?: boolean) {
    return this._put(
      "load",
      typeof count === "boolean" ? { count: count } : undefined
    );
  }

  unload() {
    return this._put("unload");
  }

  async rename(name: string) {
    const result = await this._connection.request(
      {
        method: "PUT",
        path: `/_api/collection/${this._name}/rename`,
        body: { name },
      },
      (res) => res.body
    );
    this._name = name;
    this._idPrefix = `${name}/`;
    return result;
  }

  rotate() {
    return this._put("rotate").then(body => body.result);
  }

  truncate() {
    return this._put("truncate");
  }

  drop(opts?: CollectionDropOptions) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/collection/${this._name}`,
        qs: opts,
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region crud
  getResponsibleShard(document: Partial<Document<T>>): Promise<string> {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/collection/${this.name}/responsibleShard`,
        body: document,
      },
      (res) => res.body.shardId
    );
  }

  documentId(selector: DocumentSelector): string {
    return documentHandle(selector, this._name);
  }

  documentExists(selector: DocumentSelector): Promise<boolean> {
    return this._connection
      .request(
        {
          method: "HEAD",
          path: `/_api/document/${documentHandle(selector, this._name)}`,
        },
        () => true
      )
      .catch((err) => {
        if (err.statusCode === 404) {
          return false;
        }
        throw err;
      });
  }

  document(
    selector: DocumentSelector,
    opts: boolean | CollectionReadOptions = {}
  ) {
    if (typeof opts === "boolean") {
      opts = { graceful: opts };
    }
    const { allowDirtyRead = undefined, graceful = false } = opts;
    const result = this._connection.request(
      {
        path: `/_api/document/${documentHandle(selector, this._name)}`,
        allowDirtyRead,
      },
      (res) => res.body
    );
    if (!graceful) return result;
    return result.catch((err) => {
      if (isArangoError(err) && err.errorNum === DOCUMENT_NOT_FOUND) {
        return null;
      }
      throw err;
    });
  }

  edge(selector: DocumentSelector, opts: boolean | CollectionReadOptions = {}) {
    return this.document(selector, opts) as Promise<Edge<T>>;
  }

  save(data: DocumentData<T>, opts?: CollectionInsertOptions) {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/document/${this._name}`,
        body: data,
        qs: opts,
      },
      (res) => res.body
    );
  }

  saveAll(data: Array<DocumentData<T>>, opts?: CollectionInsertOptions) {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/document/${this._name}`,
        body: data,
        qs: opts,
      },
      (res) => res.body
    );
  }

  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    opts?: CollectionReplaceOptions
  ) {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/${documentHandle(selector, this._name)}`,
        body: newValue,
        qs: opts,
      },
      (res) => res.body
    );
  }

  replaceAll(
    newValues: Array<DocumentData<T> & DocumentLike>,
    opts?: CollectionReplaceOptions
  ) {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/${this._name}`,
        body: newValues,
        qs: opts,
      },
      (res) => res.body
    );
  }

  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    opts?: CollectionUpdateOptions
  ) {
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/document/${documentHandle(selector, this._name)}`,
        body: newValue,
        qs: opts,
      },
      (res) => res.body
    );
  }

  updateAll(
    newValues: Array<Patch<DocumentData<T>> & DocumentLike>,
    opts?: CollectionUpdateOptions
  ) {
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/document/${this._name}`,
        body: newValues,
        qs: opts,
      },
      (res) => res.body
    );
  }

  remove(selector: DocumentSelector, opts?: CollectionRemoveOptions) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/${documentHandle(selector, this._name)}`,
        qs: opts,
      },
      (res) => res.body
    );
  }

  removeAll(
    selectors: Array<DocumentSelector>,
    opts?: CollectionRemoveOptions
  ) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/${this._name}`,
        body: selectors,
        qs: opts,
      },
      (res) => res.body
    );
  }

  import(
    data: Buffer | Blob | string | any[],
    { type = "auto", ...opts }: CollectionImportOptions = {}
  ): Promise<CollectionImportResult> {
    if (Array.isArray(data)) {
      data =
        (data as any[]).map((line: any) => JSON.stringify(line)).join("\r\n") +
        "\r\n";
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/import",
        body: data,
        isBinary: true,
        qs: {
          type: type === null ? undefined : type,
          ...opts,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region edges
  protected _edges(selector: DocumentSelector, direction?: "in" | "out") {
    return this._connection.request(
      {
        path: `/_api/edges/${this._name}`,
        qs: {
          direction,
          vertex: documentHandle(selector, this._name),
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

  traversal(startVertex: DocumentSelector, opts?: TraversalOptions) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/traversal",
        body: {
          ...opts,
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
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/all-keys",
        body: { type, collection: this._name },
      },
      (res) => new ArrayCursor(this._connection, res.body, res.arangojsHostId)
    );
  }

  all(opts?: SimpleQueryAllOptions) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/all",
        body: {
          ...opts,
          collection: this._name,
        },
      },
      (res) => new ArrayCursor(this._connection, res.body, res.arangojsHostId)
    );
  }

  any() {
    return this._connection.request(
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
    opts?: SimpleQueryByExampleOptions
  ) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/by-example",
        body: {
          ...opts,
          example,
          collection: this._name,
        },
      },
      (res) => new ArrayCursor(this._connection, res.body, res.arangojsHostId)
    );
  }

  firstExample(example: Partial<DocumentData<T>>) {
    return this._connection.request(
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
    opts?: SimpleQueryRemoveByExampleOptions
  ) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/remove-by-example",
        body: {
          ...opts,
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
    opts?: SimpleQueryReplaceByExampleOptions
  ) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/replace-by-example",
        body: {
          ...opts,
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
    opts?: SimpleQueryUpdateByExampleOptions
  ) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/update-by-example",
        body: {
          ...opts,
          example,
          newValue,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }

  lookupByKeys(keys: string[]) {
    return this._connection.request(
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

  removeByKeys(keys: string[], opts?: SimpleQueryRemoveByKeysOptions) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/remove-by-keys",
        body: {
          options: opts,
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
    return this._connection.request(
      {
        path: "/_api/index",
        qs: { collection: this._name },
      },
      (res) => res.body.indexes
    );
  }

  index(selector: IndexSelector) {
    return this._connection.request(
      { path: `/_api/index/${indexHandle(selector, this._name)}` },
      (res) => res.body
    );
  }

  ensureIndex(options: EnsureIndexOptions) {
    return this._connection.request(
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
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/index/${indexHandle(selector, this._name)}`,
      },
      (res) => res.body
    );
  }

  ensureHashIndex(fields: string[] | string, opts?: EnsureHashIndexOptions) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    if (typeof opts === "boolean") {
      opts = { unique: opts };
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { unique: false, ...opts, type: "hash", fields: fields },
        qs: { collection: this._name },
      },
      (res) => res.body
    );
  }

  ensureSkiplist(fields: string[] | string, opts?: EnsureSkiplistIndexOptions) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    if (typeof opts === "boolean") {
      opts = { unique: opts };
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { unique: false, ...opts, type: "skiplist", fields: fields },
        qs: { collection: this._name },
      },
      (res) => res.body
    );
  }

  ensurePersistentIndex(
    fields: string[] | string,
    opts?: EnsurePersistentIndexOptions
  ) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    if (typeof opts === "boolean") {
      opts = { unique: opts };
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { unique: false, ...opts, type: "persistent", fields: fields },
        qs: { collection: this._name },
      },
      (res) => res.body
    );
  }

  ensureGeoIndex(fields: string[] | string, opts?: EnsureGeoIndexOptions) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { ...opts, fields, type: "geo" },
        qs: { collection: this._name },
      },
      (res) => res.body
    );
  }

  ensureFulltextIndex(
    fields: string | [string] | [string, string],
    opts?: EnsureFulltextIndexOptions
  ) {
    if (typeof fields === "string") {
      fields = [fields];
    }
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: { ...opts, fields, type: "fulltext" },
        qs: { collection: this._name },
      },
      (res) => res.body
    );
  }

  fulltext(
    attribute: string,
    query: string,
    { index, ...opts }: SimpleQueryFulltextOptions = {}
  ) {
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/fulltext",
        body: {
          ...opts,
          index: index ? indexHandle(index, this._name) : undefined,
          attribute,
          query,
          collection: this._name,
        },
      },
      (res) => new ArrayCursor(this._connection, res.body, res.arangojsHostId)
    );
  }
  //#endregion
}
