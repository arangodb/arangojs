/**
 * TODO
 *
 * @packageDocumentation
 */
import {
  ArangoCollection,
  CollectionInsertResult,
  CollectionRemoveResult,
  CollectionSaveResult,
  DocumentCollection,
  EdgeCollection,
  isArangoCollection,
  TraversalOptions,
} from "./collection";
import { Headers } from "./connection";
import { Database } from "./database";
import {
  Document,
  DocumentData,
  DocumentSelector,
  Edge,
  EdgeData,
  _documentHandle,
} from "./documents";
import { isArangoError } from "./error";
import { DOCUMENT_NOT_FOUND, GRAPH_NOT_FOUND } from "./util/codes";
import { Patch } from "./util/types";

function mungeGharialResponse(body: any, prop: "vertex" | "edge" | "removed") {
  const { new: newDoc, old: oldDoc, [prop]: doc, ...meta } = body;
  const result = { ...meta, ...doc };
  if (typeof newDoc !== "undefined") result.new = newDoc;
  if (typeof oldDoc !== "undefined") result.old = oldDoc;
  return result;
}

/**
 * TODO
 */
export type GraphCollectionInsertOptions = {
  waitForSync?: boolean;
  returnNew?: boolean;
};

/**
 * TODO
 */
export type GraphCollectionReadOptions = {
  rev?: string;
  graceful?: boolean;
  allowDirtyRead?: boolean;
};

/**
 * TODO
 */
export type GraphCollectionReplaceOptions = {
  rev?: string;
  waitForSync?: boolean;
  keepNull?: boolean;
  returnOld?: boolean;
  returnNew?: boolean;
};

/**
 * TODO
 */
export type GraphCollectionRemoveOptions = {
  rev?: string;
  waitForSync?: boolean;
  returnOld?: boolean;
};

/**
 * TODO
 */
export class GraphVertexCollection<T extends object = any>
  implements ArangoCollection {
  protected _db: Database;
  protected _name: string;
  protected _graph: Graph;
  protected _collection: DocumentCollection<T>;

  /**
   * @internal
   * @hidden
   */
  constructor(db: Database, name: string, graph: Graph) {
    this._db = db;
    this._name = name;
    this._graph = graph;
    this._collection = db.collection(name);
  }

  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB collection.
   */
  get isArangoCollection(): true {
    return true;
  }

  /**
   * TODO
   */
  get name() {
    return this._name;
  }

  /**
   * TODO
   */
  get collection() {
    return this._collection;
  }

  /**
   * TODO
   */
  get graph() {
    return this._graph;
  }

  /**
   * TODO
   */
  async vertexExists(selector: DocumentSelector): Promise<boolean> {
    try {
      return await this._db.request(
        {
          method: "HEAD",
          path: `/_api/gharial/${this.graph.name}/vertex/${_documentHandle(
            selector,
            this._name
          )}`,
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

  /**
   * TODO
   */
  async vertex(
    selector: DocumentSelector,
    options?: GraphCollectionReadOptions & { graceful?: false }
  ): Promise<Document<T>>;
  /**
   * TODO
   */
  async vertex(
    selector: DocumentSelector,
    options: GraphCollectionReadOptions & { graceful: true }
  ): Promise<Document<T> | null>;
  /**
   * TODO
   */
  async vertex(
    selector: DocumentSelector,
    graceful: false
  ): Promise<Document<T>>;
  /**
   * TODO
   */
  async vertex(
    selector: DocumentSelector,
    graceful: true
  ): Promise<Document<T> | null>;
  async vertex(
    selector: DocumentSelector,
    options: boolean | GraphCollectionReadOptions = {}
  ): Promise<Document<T> | null> {
    if (typeof options === "boolean") {
      options = { graceful: options };
    }
    const {
      allowDirtyRead = undefined,
      graceful = false,
      rev,
      ...qs
    } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    const result = this._db.request(
      {
        path: `/_api/gharial/${this.graph.name}/vertex/${_documentHandle(
          selector,
          this._name
        )}`,
        headers,
        qs,
        allowDirtyRead,
      },
      (res) => res.body.vertex
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

  /**
   * TODO
   */
  save(
    data: DocumentData<T>,
    options?: GraphCollectionInsertOptions
  ): Promise<CollectionInsertResult<Document<T>>> {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/gharial/${this.graph.name}/vertex/${this._name}`,
        body: data,
        qs: options,
      },
      (res) => mungeGharialResponse(res.body, "vertex")
    );
  }

  /**
   * TODO
   */
  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    options: GraphCollectionReplaceOptions = {}
  ): Promise<CollectionSaveResult<Document<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...qs } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this.graph.name}/vertex/${_documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs,
        headers,
      },
      (res) => mungeGharialResponse(res.body, "vertex")
    );
  }

  /**
   * TODO
   */
  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    options: GraphCollectionReplaceOptions = {}
  ): Promise<CollectionSaveResult<Document<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const headers: Headers = {};
    const { rev, ...qs } = options;
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/gharial/${this.graph.name}/vertex/${_documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs,
        headers,
      },
      (res) => mungeGharialResponse(res.body, "vertex")
    );
  }

  /**
   * TODO
   */
  remove(
    selector: DocumentSelector,
    options: GraphCollectionRemoveOptions = {}
  ): Promise<CollectionRemoveResult<Document<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const headers: Headers = {};
    const { rev, ...qs } = options;
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this.graph.name}/vertex/${_documentHandle(
          selector,
          this._name
        )}`,
        qs,
        headers,
      },
      (res) => mungeGharialResponse(res.body, "removed")
    );
  }
}

/**
 * TODO
 */
export class GraphEdgeCollection<T extends object = any>
  implements ArangoCollection {
  protected _db: Database;
  protected _name: string;
  protected _graph: Graph;
  protected _collection: EdgeCollection<T>;

  /**
   * @internal
   * @hidden
   */
  constructor(db: Database, name: string, graph: Graph) {
    this._db = db;
    this._name = name;
    this._graph = graph;
    this._collection = db.collection(name);
  }

  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB collection.
   */
  get isArangoCollection(): true {
    return true;
  }

  /**
   * TODO
   */
  get name() {
    return this._name;
  }

  /**
   * TODO
   */
  get collection() {
    return this._collection;
  }

  /**
   * TODO
   */
  get graph() {
    return this._graph;
  }

  /**
   * TODO
   */
  async edgeExists(selector: DocumentSelector): Promise<boolean> {
    try {
      return await this._db.request(
        {
          method: "HEAD",
          path: `/_api/gharial/${this.graph.name}/edge/${_documentHandle(
            selector,
            this._name
          )}`,
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

  /**
   * TODO
   */
  async edge(
    selector: DocumentSelector,
    options?: GraphCollectionReadOptions & { graceful?: false }
  ): Promise<Edge<T>>;
  /**
   * TODO
   */
  async edge(
    selector: DocumentSelector,
    options: GraphCollectionReadOptions & { graceful: true }
  ): Promise<Edge<T> | null>;
  /**
   * TODO
   */
  async edge(selector: DocumentSelector, graceful: false): Promise<Edge<T>>;
  /**
   * TODO
   */
  async edge(
    selector: DocumentSelector,
    graceful: true
  ): Promise<Edge<T> | null>;
  async edge(
    selector: DocumentSelector,
    options: boolean | GraphCollectionReadOptions = {}
  ): Promise<Edge<T> | null> {
    if (typeof options === "boolean") {
      options = { graceful: options };
    }
    const {
      allowDirtyRead = undefined,
      graceful = false,
      rev,
      ...qs
    } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    const result = this._db.request(
      {
        path: `/_api/gharial/${this.graph.name}/edge/${_documentHandle(
          selector,
          this._name
        )}`,
        qs,
        allowDirtyRead,
      },
      (res) => res.body.edge
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

  /**
   * TODO
   */
  save(
    data: EdgeData<T>,
    options?: GraphCollectionInsertOptions
  ): Promise<CollectionInsertResult<Edge<T>>> {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/gharial/${this.graph.name}/edge/${this._name}`,
        body: data,
        qs: options,
      },
      (res) => mungeGharialResponse(res.body, "edge")
    );
  }

  /**
   * TODO
   */
  replace(
    selector: DocumentSelector,
    newValue: EdgeData<T>,
    options: GraphCollectionReplaceOptions = {}
  ): Promise<CollectionSaveResult<Edge<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...qs } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this.graph.name}/edge/${_documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs,
        headers,
      },
      (res) => mungeGharialResponse(res.body, "edge")
    );
  }

  /**
   * TODO
   */
  update(
    selector: DocumentSelector,
    newValue: Patch<EdgeData<T>>,
    options: GraphCollectionReplaceOptions = {}
  ): Promise<CollectionSaveResult<Edge<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...qs } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/gharial/${this.graph.name}/edge/${_documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs,
        headers,
      },
      (res) => mungeGharialResponse(res.body, "edge")
    );
  }

  /**
   * TODO
   */
  remove(
    selector: DocumentSelector,
    options: GraphCollectionRemoveOptions = {}
  ): Promise<CollectionRemoveResult<Edge<T>>> {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...qs } = options;
    const headers: Headers = {};
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this.graph.name}/edge/${_documentHandle(
          selector,
          this._name
        )}`,
        qs,
        headers,
      },
      (res) => mungeGharialResponse(res.body, "removed")
    );
  }
}

/**
 * An edge definition used to define a collection of edges in a {@link Graph}.
 */
export type EdgeDefinition = {
  /**
   * Name of the collection containing the edges.
   */
  collection: string;
  /**
   * Array of names of collections containing the start vertices.
   */
  from: string[];
  /**
   * Array of names of collections containing the end vertices.
   */
  to: string[];
};

/**
 * TODO
 */
export type GraphInfo = {
  _id: string;
  _key: string;
  _rev: string;
  name: string;
  edgeDefinitions: EdgeDefinition[];
  orphanCollections: string[];

  // Cluster options
  numberOfShards?: number;
  replicationFactor?: number;
  writeConcern?: number;
  /**
   * @deprecated Renamed to `writeConcern` in ArangoDB 3.6.
   */
  minReplicationFactor?: number;

  // Extra options
  /** Enterprise Edition only */
  isSatellite?: boolean;
  /** Enterprise Edition only */
  isSmart?: boolean;
  /** Enterprise Edition only */
  smartGraphAttribute?: string;
};

/**
 * TODO
 */
export type GraphCreateOptions = {
  /**
   * If set to `true`, the request will wait until everything is synced to
   * disk before returning successfully.
   */
  waitForSync?: boolean;
  /**
   * An array of additional vertex collections. Documents within these
   * collections do not have edges within this graph.
   */
  orphanCollections?: string[];

  /**
   * (Cluster only.) The number of shards that is used for every collection
   * within this graph.
   */
  numberOfShards?: number;
  /**
   * (Cluster only.) The replication factor used when initially creating
   * collections for this graph.
   *
   * Default: `1`
   */
  replicationFactor?: number | "satellite";
  /**
   * (Cluster only.) Write concern for new collections in the graph.
   */
  writeConcern?: number;
  /**
   * (Cluster only.) Write concern for new collections in the graph.
   *
   * @deprecated Renamed to `writeConcern` in ArangoDB 3.6.
   */
  minReplicationFactor?: number;

  // Extra options
  /**
   * (Enterprise Edition cluster only.) If set to `true`, the graph will be
   * created as a SmartGraph.
   *
   * Default: `false`
   */
  isSmart?: boolean;
  /**
   * (Enterprise Edition cluster only.) Attribute containing the shard key
   * value to use for smart sharding.
   *
   * **Note**: `isSmart` must be set to `true`.
   */
  smartGraphAttribute?: string;
};

/**
 * TODO
 */
export class Graph {
  protected _name: string;

  protected _db: Database;

  /**
   * @internal
   * @hidden
   */
  constructor(db: Database, name: string) {
    this._name = name;
    this._db = db;
  }

  /**
   * TODO
   */
  get name() {
    return this._name;
  }

  /**
   * TODO
   */
  get(): Promise<GraphInfo> {
    return this._db.request(
      { path: `/_api/gharial/${this._name}` },
      (res) => res.body.graph
    );
  }

  /**
   * TODO
   */
  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === GRAPH_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  /**
   * TODO
   */
  create(
    edgeDefinitions: EdgeDefinition[],
    options?: GraphCreateOptions
  ): Promise<GraphInfo> {
    const { orphanCollections, waitForSync, isSmart, ...opts } = options || {};
    return this._db.request(
      {
        method: "POST",
        path: "/_api/gharial",
        body: {
          orphanCollections,
          edgeDefinitions,
          isSmart,
          name: this._name,
          options: opts,
        },
        qs: { waitForSync },
      },
      (res) => res.body.graph
    );
  }

  /**
   * TODO
   */
  drop(dropCollections: boolean = false): Promise<boolean> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this._name}`,
        qs: { dropCollections },
      },
      (res) => res.body.removed
    );
  }

  /**
   * TODO
   */
  vertexCollection<T extends object = any>(
    collectionName: string
  ): GraphVertexCollection<T> {
    return new GraphVertexCollection<T>(this._db, collectionName, this);
  }

  /**
   * TODO
   */
  listVertexCollections(): Promise<string[]> {
    return this._db.request(
      { path: `/_api/gharial/${this._name}/vertex` },
      (res) => res.body.collections
    );
  }

  /**
   * TODO
   */
  async vertexCollections(): Promise<GraphVertexCollection[]> {
    const names = await this.listVertexCollections();
    return names.map((name) => new GraphVertexCollection(this._db, name, this));
  }

  /**
   * TODO
   */
  addVertexCollection(
    collection: string | ArangoCollection
  ): Promise<GraphInfo> {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return this._db.request(
      {
        method: "POST",
        path: `/_api/gharial/${this._name}/vertex`,
        body: { collection },
      },
      (res) => res.body.graph
    );
  }

  /**
   * TODO
   */
  removeVertexCollection(
    collection: string | ArangoCollection,
    dropCollection: boolean = false
  ): Promise<GraphInfo> {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this._name}/vertex/${collection}`,
        qs: {
          dropCollection,
        },
      },
      (res) => res.body.graph
    );
  }

  /**
   * TODO
   */
  edgeCollection<T extends object = any>(
    collectionName: string
  ): GraphEdgeCollection<T> {
    return new GraphEdgeCollection<T>(this._db, collectionName, this);
  }

  /**
   * TODO
   */
  listEdgeCollections(): Promise<string[]> {
    return this._db.request(
      { path: `/_api/gharial/${this._name}/edge` },
      (res) => res.body.collections
    );
  }

  /**
   * TODO
   */
  async edgeCollections(): Promise<GraphEdgeCollection[]> {
    const names = await this.listEdgeCollections();
    return names.map((name) => new GraphEdgeCollection(this._db, name, this));
  }

  /**
   * TODO
   */
  addEdgeDefinition(definition: EdgeDefinition): Promise<GraphInfo> {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/gharial/${this._name}/edge`,
        body: definition,
      },
      (res) => res.body.graph
    );
  }

  /**
   * TODO
   */
  replaceEdgeDefinition(definition: EdgeDefinition): Promise<GraphInfo>;
  /**
   * TODO
   */
  replaceEdgeDefinition(
    edgeCollection: string,
    definition: EdgeDefinition
  ): Promise<GraphInfo>;
  replaceEdgeDefinition(
    edgeCollection: string | EdgeDefinition,
    definition?: EdgeDefinition
  ) {
    if (!definition) {
      definition = edgeCollection as EdgeDefinition;
      edgeCollection = definition.collection;
    }
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this._name}/edge/${edgeCollection}`,
        body: definition,
      },
      (res) => res.body.graph
    );
  }

  /**
   * TODO
   */
  removeEdgeDefinition(
    edgeCollection: string,
    dropCollection: boolean = false
  ): Promise<GraphInfo> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this._name}/edge/${edgeCollection}`,
        qs: {
          dropCollection,
        },
      },
      (res) => res.body.graph
    );
  }

  /**
   * TODO
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   */
  traversal(
    startVertex: DocumentSelector,
    options?: TraversalOptions
  ): Promise<any> {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/traversal`,
        body: {
          ...options,
          startVertex,
          graphName: this._name,
        },
      },
      (res) => res.body.result
    );
  }
}
