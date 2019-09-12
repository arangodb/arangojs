import { Connection, RequestOptions } from "./connection";
import { ArrayCursor } from "./cursor";
import { isArangoError } from "./error";
import { COLLECTION_NOT_FOUND, DOCUMENT_NOT_FOUND } from "./util/codes";
import { ArangoResponseMetadata, Patch, StrictObject } from "./util/types";

export function documentHandle(
  selector: Selector,
  collectionName: string
): string {
  if (typeof selector !== "string") {
    if (selector._id) {
      if (!selector._id.startsWith(`${collectionName}/`)) {
        throw new Error(
          `Document ID "${selector._id}" does not match collection name "${collectionName}"`
        );
      }
      return selector._id;
    }
    if (selector._key) {
      return documentHandle(selector._key, collectionName);
    }
    throw new Error(
      "Document handle must be a string or an object with a _key or _id"
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

export interface CollectionMetadata {
  name: string;
  status: CollectionStatus;
  type: CollectionType;
  isSystem: boolean;
}

export interface CollectionProperties extends CollectionMetadata {
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
}

// Options

export interface CollectionPropertiesOptions {
  waitForSync?: boolean;
  journalSize?: number;
  indexBuckets?: number;
  replicationFactor?: number;
}

export interface CollectionChecksumOptions {
  withRevisions?: boolean;
  withData?: boolean;
}

export interface CollectionDropOptions {
  isSystem?: boolean;
}

export interface CreateCollectionOptions {
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
}

export interface CollectionCreateOptions extends CreateCollectionOptions {
  type?: CollectionType;
  waitForSyncReplication?: boolean;
  enforceReplicationFactor?: boolean;
}

export interface CollectionReadOptions {
  graceful?: boolean;
  allowDirtyRead?: boolean;
}

interface CollectionSaveOptions {
  waitForSync?: boolean;
  silent?: boolean;
  returnNew?: boolean;
  returnOld?: boolean;
}

export interface CollectionInsertOptions extends CollectionSaveOptions {
  overwrite?: boolean;
}

export interface CollectionReplaceOptions extends CollectionSaveOptions {
  ignoreRevs?: boolean;
}

export interface CollectionUpdateOptions extends CollectionReplaceOptions {
  keepNull?: boolean;
  mergeObjects?: boolean;
}

export interface CollectionRemoveOptions {
  rSync?: boolean;
  returnOld?: boolean;
  silent?: boolean;
}

export interface CollectionImportOptions {
  type?: null | "auto" | "documents" | "array";
  fromPrefix?: string;
  toPrefix?: string;
  overwrite?: boolean;
  waitForSync?: boolean;
  onDuplicate?: "error" | "update" | "replace" | "ignore";
  complete?: boolean;
  details?: boolean;
}

/** @deprecated ArangoDB 3.4 */
export interface SimpleQueryByExampleOptions {
  skip?: number;
  limit?: number;
  batchSize?: number;
  ttl?: number;
}

/** @deprecated ArangoDB 3.4 */
export interface SimpleQueryAllOptions extends SimpleQueryByExampleOptions {
  stream?: boolean;
}

/** @deprecated ArangoDB 3.4 */
export interface SimpleQueryUpdateByExampleOptions {
  keepNull?: boolean;
  waitForSync?: boolean;
  limit?: number;
  mergeObjects?: boolean;
}

/** @deprecated ArangoDB 3.4 */
export interface SimpleQueryRemoveByExampleOptions {
  waitForSync?: boolean;
  limit?: number;
}

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryReplaceByExampleOptions = SimpleQueryRemoveByExampleOptions;

/** @deprecated ArangoDB 3.4 */
export interface SimpleQueryRemoveByKeysOptions {
  returnOld?: boolean;
  silent?: boolean;
  waitForSync?: boolean;
}

/** @deprecated ArangoDB 3.4 */
export interface SimpleQueryFulltextOptions {
  index?: string;
  limit?: number;
  skip?: number;
}

/** @deprecated ArangoDB 3.4 */
export interface TraversalOptions {
  graphName?: string;
  edgeCollection?: string;
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
}

export interface CreateHashIndexOptions {
  unique?: boolean;
  sparse?: boolean;
  deduplicate?: boolean;
}

export type CreateSkiplistIndexOptions = CreateHashIndexOptions;

export interface CreatePersistentIndexOptions {
  unique?: boolean;
  sparse?: boolean;
}

export interface CreateGeoIndexOptions {
  geoJson?: boolean;
}

export interface CreateFulltextIndexOptions {
  minLength?: number;
}

export interface CreateIndexHashOptions extends CreateHashIndexOptions {
  type: "hash";
  fields: string[];
}

export interface CreateIndexSkiplistOptions extends CreateSkiplistIndexOptions {
  type: "skiplist";
  fields: string[];
}

export interface CreateIndexPersistentOptions
  extends CreatePersistentIndexOptions {
  type: "persistent";
  fields: string[];
}

export interface CreateIndexGeoOptions extends CreateGeoIndexOptions {
  type: "geo";
  fields: [string] | [string, string];
}

export interface CreateIndexFulltextOptions extends CreateFulltextIndexOptions {
  type: "fulltext";
  fields: string[];
}

export type CreateIndexOptions =
  | CreateIndexHashOptions
  | CreateIndexSkiplistOptions
  | CreateIndexPersistentOptions
  | CreateIndexGeoOptions
  | CreateIndexFulltextOptions;

// Results

export interface CollectionPropertiesAndCount extends CollectionProperties {
  count: number;
}

export interface CollectionPropertiesAndFigures extends CollectionProperties {
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
}

export interface CollectionPropertiesAndRevision extends CollectionProperties {
  revision: string;
}

export interface CollectionChecksum {
  revision: string;
  checksum: string;
}

export interface CollectionLoadResult extends CollectionMetadata {
  count?: number;
}

export interface CollectionRotateResult {
  result: boolean;
}

export interface CollectionImportResult {
  error: false;
  created: number;
  errors: number;
  empty: number;
  updated: number;
  ignored: number;
  details?: string[];
}

export interface CollectionEdgesResult<T extends object = any> {
  edges: Edge<T>[];
  stats: {
    scannedIndex: number;
    filtered: number;
  };
}

export interface CollectionSaveResult<T> extends DocumentMetadata {
  new?: T;
  old?: T;
}

export interface CollectionRemoveResult<T> extends DocumentMetadata {
  old?: T;
}

/** @deprecated ArangoDB 3.4 */
export interface SimpleQueryRemoveByExampleResult {
  deleted: number;
}

/** @deprecated ArangoDB 3.4 */
export interface SimpleQueryReplaceByExampleResult {
  replaced: number;
}

/** @deprecated ArangoDB 3.4 */
export interface SimpleQueryUpdateByExampleResult {
  updated: number;
}

/** @deprecated ArangoDB 3.4 */
export interface SimpleQueryRemoveByKeysResult<T extends object = any> {
  removed: number;
  ignored: number;
  old?: DocumentMetadata[] | Document<T>[];
}

export interface CollectionIndexResult {
  id: string;
}

// Document

export interface ObjectWithId {
  [key: string]: any;
  _id: string;
}

export interface ObjectWithKey {
  [key: string]: any;
  _id: string;
}

export type DocumentLike = ObjectWithId | ObjectWithKey;

export type Selector = DocumentLike | string;

export interface DocumentMetadata {
  _key: string;
  _id: string;
  _rev: string;
}

export interface UpdateMetadata extends DocumentMetadata {
  _oldRev: string;
}

export interface EdgeMetadata {
  _from: string;
  _to: string;
}

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

export interface GenericIndex {
  fields: string[];
  id: string;
  sparse: boolean;
  unique: boolean;
}

export interface SkiplistIndex extends GenericIndex {
  type: "skiplist";
}

export interface HashIndex extends GenericIndex {
  type: "hash";
  selectivityEstimate: number;
}

export interface PrimaryIndex extends GenericIndex {
  type: "primary";
  selectivityEstimate: number;
}

export interface PersistentIndex extends GenericIndex {
  type: "persistent";
}

export interface FulltextIndex extends GenericIndex {
  type: "fulltext";
  minLength: number;
}

export interface GeoIndex extends GenericIndex {
  fields: [string] | [string, string];
  type: "geo";
  geoJson: boolean;
  bestIndexedLevel: number;
  worstIndexedLevel: number;
  maxNumCoverCells: number;
}

export type Index =
  | GeoIndex
  | FulltextIndex
  | PersistentIndex
  | PrimaryIndex
  | HashIndex
  | SkiplistIndex;

export type IndexHandle = string | Index;

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
  rotate(): Promise<ArangoResponseMetadata & CollectionRotateResult>;
  truncate(): Promise<ArangoResponseMetadata & CollectionMetadata>;
  drop(opts?: CollectionDropOptions): Promise<ArangoResponseMetadata>;

  //#region crud
  getResponsibleShard(document: Partial<Document<T>>): Promise<string>;
  documentExists(selector: Selector): Promise<boolean>;
  document(
    selector: Selector,
    opts?: CollectionReadOptions
  ): Promise<Document<T>>;
  document(selector: Selector, graceful: boolean): Promise<Document<T>>;
  save(
    data: DocumentData<T>,
    opts?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  saveAll(
    data: Array<DocumentData<T>>,
    opts?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  replace(
    selector: Selector,
    newValue: DocumentData<T>,
    opts?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  replaceAll(
    newValues: Array<DocumentData<T> & DocumentLike>,
    opts?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  update(
    selector: Selector,
    newValue: Patch<DocumentData<T>>,
    opts?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  updateAll(
    newValues: Array<Patch<DocumentData<T>> & DocumentLike>,
    opts?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  remove(
    selector: Selector,
    opts?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Document<T>>>;
  removeAll(
    selector: Array<Selector>,
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
    selector: Selector,
    opts?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Edge<T>>>;
  removeAll(
    selector: Array<Selector>,
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
  index(indexHandle: IndexHandle): Promise<Index[]>;
  createIndex(
    details: CreateIndexOptions
  ): Promise<ArangoResponseMetadata & CollectionIndexResult>;
  dropIndex(
    indexHandle: IndexHandle
  ): Promise<ArangoResponseMetadata & CollectionIndexResult>;
  createHashIndex(
    fields: string | string[],
    opts?: CreateHashIndexOptions
  ): Promise<ArangoResponseMetadata & CollectionIndexResult>;
  createSkiplist(
    fields: string | string[],
    opts?: CreateSkiplistIndexOptions
  ): Promise<ArangoResponseMetadata & CollectionIndexResult>;
  createPersistentIndex(
    fields: string | string[],
    opts?: CreatePersistentIndexOptions
  ): Promise<ArangoResponseMetadata & CollectionIndexResult>;
  createGeoIndex(
    fields: string | [string] | [string, string],
    opts?: CreateGeoIndexOptions
  ): Promise<ArangoResponseMetadata & CollectionIndexResult>;
  createFulltextIndex(
    fields: string | string[],
    opts?: CreateFulltextIndexOptions
  ): Promise<ArangoResponseMetadata & CollectionIndexResult>;
  //#endregion
}

export interface EdgeCollection<T extends object = any>
  extends DocumentCollection<T> {
  //#region crud
  edge(selector: Selector, opts?: CollectionReadOptions): Promise<Edge<T>>;
  edge(selector: Selector, graceful: boolean): Promise<Edge<T>>;
  document(selector: Selector, opts?: CollectionReadOptions): Promise<Edge<T>>;
  document(selector: Selector, graceful: boolean): Promise<Edge<T>>;
  save(
    data: EdgeData<T>,
    opts?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  saveAll(
    data: Array<EdgeData<T>>,
    opts?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
  replace(
    selector: Selector,
    newValue: DocumentData<T>,
    opts?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  replaceAll(
    newValues: Array<DocumentData<T> & DocumentLike>,
    opts?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
  update(
    selector: Selector,
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
    selector: Selector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  inEdges(
    selector: Selector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  outEdges(
    selector: Selector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  /** @deprecated ArangoDB 3.4 */
  traversal(startVertex: Selector, opts?: TraversalOptions): Promise<any>;
  //#endregion
}

class GenericCollection<T extends object = any>
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
  protected _documentHandle(documentHandle: Selector) {
    if (typeof documentHandle !== "string") {
      if (documentHandle._id) {
        return documentHandle._id;
      }
      if (documentHandle._key) {
        return this._idPrefix + documentHandle._key;
      }
      throw new Error(
        "Document handle must be a string or an object with a _key or _id"
      );
    }
    if (documentHandle.indexOf("/") === -1) {
      return this._idPrefix + documentHandle;
    }
    return documentHandle;
  }

  protected _indexHandle(indexHandle: IndexHandle) {
    if (typeof indexHandle !== "string") {
      if (indexHandle.id) {
        return indexHandle.id;
      }
      throw new Error("Index handle must be a index or string");
    }
    if (indexHandle.indexOf("/") === -1) {
      return this._idPrefix + indexHandle;
    }
    return indexHandle;
  }

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
    return this._put("rotate");
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

  documentExists(selector: Selector): Promise<boolean> {
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

  document(selector: Selector, opts: boolean | CollectionReadOptions = {}) {
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

  edge(selector: Selector, opts: boolean | CollectionReadOptions = {}) {
    return this.document(selector, opts) as Promise<Edge<T>>;
  }

  save(data: DocumentData<T>, opts?: CollectionSaveOptions) {
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

  saveAll(data: Array<DocumentData<T>>, opts?: CollectionSaveOptions) {
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
    selector: Selector,
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
    selector: Selector,
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

  remove(selector: Selector, opts?: CollectionRemoveOptions) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/${documentHandle(selector, this._name)}`,
        qs: opts,
      },
      (res) => res.body
    );
  }

  removeAll(selectors: Array<Selector>, opts?: CollectionRemoveOptions) {
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
  protected _edges(selector: Selector, direction?: "in" | "out") {
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

  edges(vertex: Selector) {
    return this._edges(vertex);
  }

  inEdges(vertex: Selector) {
    return this._edges(vertex, "in");
  }

  outEdges(vertex: Selector) {
    return this._edges(vertex, "out");
  }

  traversal(startVertex: Selector, opts?: TraversalOptions) {
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

  index(indexHandle: IndexHandle) {
    return this._connection.request(
      { path: `/_api/index/${this._indexHandle(indexHandle)}` },
      (res) => res.body
    );
  }

  ensureIndex(details: CreateIndexOptions) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/index",
        body: details,
        qs: { collection: this._name },
      },
      (res) => res.body
    );
  }

  /** @deprecated use ensureIndex instead */
  createIndex(details: any) {
    return this.ensureIndex(details);
  }

  dropIndex(indexHandle: IndexHandle) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/index/${this._indexHandle(indexHandle)}`,
      },
      (res) => res.body
    );
  }

  createHashIndex(fields: string[] | string, opts?: CreateHashIndexOptions) {
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

  createSkiplist(fields: string[] | string, opts?: CreateSkiplistIndexOptions) {
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

  createPersistentIndex(
    fields: string[] | string,
    opts?: CreatePersistentIndexOptions
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

  createGeoIndex(fields: string[] | string, opts?: CreateGeoIndexOptions) {
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

  createFulltextIndex(
    fields: string | [string] | [string, string],
    opts?: CreateFulltextIndexOptions
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
    opts: SimpleQueryFulltextOptions = {}
  ) {
    if (opts.index) opts.index = this._indexHandle(opts.index);
    return this._connection.request(
      {
        method: "PUT",
        path: "/_api/simple/fulltext",
        body: {
          ...opts,
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

/**
 * @private
 */
export function _constructCollection(
  connection: Connection,
  name: string
): DocumentCollection & EdgeCollection {
  return new GenericCollection(connection, name);
}
