/**
 * ```ts
 * import type {
 *   Graph,
 *   GraphVertexCollection,
 *   GraphEdgeCollection,
 * } from "arangojs/graph";
 * ```
 *
 * The "graph" module provides graph related types and interfaces
 * for TypeScript.
 *
 * @packageDocumentation
 */
import {
  ArangoCollection,
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
  DocumentMetadata,
  DocumentSelector,
  Edge,
  EdgeData,
  _documentHandle,
} from "./documents";
import { isArangoError } from "./error";
import { DOCUMENT_NOT_FOUND, GRAPH_NOT_FOUND } from "./util/codes";
import { collectionToString } from "./util/collectionToString";
import { Patch } from "./util/types";

/**
 * @internal
 * @hidden
 */
function mungeGharialResponse(body: any, prop: "vertex" | "edge" | "removed") {
  const { new: newDoc, old: oldDoc, [prop]: doc, ...meta } = body;
  const result = { ...meta, ...doc };
  if (typeof newDoc !== "undefined") result.new = newDoc;
  if (typeof oldDoc !== "undefined") result.old = oldDoc;
  return result;
}

/**
 * @internal
 * @hidden
 */
function coerceEdgeDefinition(options: EdgeDefinitionOptions): EdgeDefinition {
  const edgeDefinition = {} as EdgeDefinition;
  edgeDefinition.collection = collectionToString(options.collection);
  edgeDefinition.from = Array.isArray(options.from)
    ? options.from.map(collectionToString)
    : [collectionToString(options.from)];
  edgeDefinition.to = Array.isArray(options.to)
    ? options.to.map(collectionToString)
    : [collectionToString(options.to)];
  return edgeDefinition;
}

/**
 * Options for retrieving a document from a graph collection.
 */
export type GraphCollectionReadOptions = {
  /**
   * If set to a document revision, the document will only be returned if its
   * `_rev` property matches this value.
   *
   * See also {@link DocumentMetadata}.
   */
  rev?: string;
  /**
   * If set to `true`, `null` is returned instead of an exception being thrown
   * if the document does not exist.
   *
   * Default: `false`
   */
  graceful?: boolean;
  /**
   * If set to `true`, the request will explicitly permit ArangoDB to return a
   * potentially dirty or stale result and arangojs will load balance the
   * request without distinguishing between leaders and followers.
   *
   * Default: `false`
   */
  allowDirtyRead?: boolean;
};

/**
 * Options for inserting a document into a graph collection.
 */
export type GraphCollectionInsertOptions = {
  /**
   * If set to `true`, data will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `true`, the complete new document will be returned as the `new`
   * property on the result object.
   *
   * Default: `false`
   */
  returnNew?: boolean;
};

/**
 * Options for replacing a document in a graph collection.
 */
export type GraphCollectionReplaceOptions = {
  /**
   * If set to a document revision, the document will only be modified if its
   * `_rev` property matches this value.
   *
   * See also {@link DocumentMetadata}.
   */
  rev?: string;
  /**
   * If set to `true`, data will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `false`, properties with a value of `null` will be removed from
   * the new document.
   *
   * Default: `true`
   */
  keepNull?: boolean;
  /**
   * If set to `true`, the complete old document will be returned as the `old`
   * property on the result object.
   *
   * Default: `false`
   */
  returnOld?: boolean;
  /**
   * If set to `true`, the complete new document will be returned as the `new`
   * property on the result object.
   *
   * Default: `false`
   */
  returnNew?: boolean;
};

/**
 * Options for removing a document from a graph collection.
 */
export type GraphCollectionRemoveOptions = {
  /**
   * If set to a document revision, the document will only be removed if its
   * `_rev` property matches this value.
   *
   * See also {@link DocumentMetadata}.
   */
  rev?: string;
  /**
   * If set to `true`, data will be synchronized to disk before returning.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * If set to `true`, the complete old document will be returned as the `old`
   * property on the result object.
   *
   * Default: `false`
   */
  returnOld?: boolean;
};

/**
 * Definition of a relation in a {@link Graph}.
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
 * An edge definition used to define a collection of edges in a {@link Graph}.
 */
export type EdgeDefinitionOptions = {
  /**
   * Collection containing the edges.
   */
  collection: string | ArangoCollection;
  /**
   * Collection or collections containing the start vertices.
   */
  from: (string | ArangoCollection)[] | string | ArangoCollection;
  /**
   * Collection or collections containing the end vertices.
   */
  to: (string | ArangoCollection)[] | string | ArangoCollection;
};

/**
 * General information about a graph.
 */
export type GraphInfo = {
  /**
   * The key of the document internally representing this graph.
   *
   * See {@link DocumentMetadata}.
   *
   * @internal
   */
  _key: string;
  /**
   * The unique ID of the document internally representing this graph.
   *
   * See {@link DocumentMetadata}.
   *
   * @internal
   */
  _id: string;
  /**
   * The revision of the document internally representing this graph.
   *
   * See {@link DocumentMetadata}.
   *
   * @internal
   */
  _rev: string;
  /**
   * Name of the graph.
   */
  name: string;
  /**
   * Definitions for the relations of the graph.
   */
  edgeDefinitions: EdgeDefinition[];
  /**
   * Additional vertex collections. Documents within these collections do not
   * have edges within this graph.
   */
  orphanCollections: string[];

  /**
   * (Cluster only.) The number of shards that is used for every collection
   * within this graph.
   */
  numberOfShards?: number;
  /**
   * (Cluster only.) The replication factor used when initially creating
   * collections for this graph.
   */
  replicationFactor?: number;
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
  /**
   * (Enterprise Edition cluster only.) If set to `true`, the graph has been
   * created as a SmartGraph.
   */
  isSmart?: boolean;
  /**
   * (Enterprise Edition cluster only.) Attribute containing the shard key
   * value to use for smart sharding.
   */
  smartGraphAttribute?: string;
};

/**
 * Option for creating a graph.
 */
export type GraphCreateOptions = {
  /**
   * If set to `true`, the request will wait until all modifications have been
   * synchronized to disk before returning successfully.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * Additional vertex collections. Documents within these collections do not
   * have edges within this graph.
   */
  orphanCollections?: (string | ArangoCollection)[] | string | ArangoCollection;

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
 * Represents a {@link Collection} of vertices in a {@link Graph}.
 *
 * @param T - Type to use for document data. Defaults to `any`.
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
   * Name of the collection.
   */
  get name() {
    return this._name;
  }

  /**
   * A {@link DocumentCollection} instance for this vertex collection.
   */
  get collection() {
    return this._collection;
  }

  /**
   * The {@link Graph} instance this vertex collection is bound to.
   */
  get graph() {
    return this._graph;
  }

  /**
   * Checks whether a vertex matching the given key or id exists in this
   * collection.
   *
   * Throws an exception when passed a vertex or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a vertex from this collection).
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.vertexCollection("vertices");
   * const exists = await collection.vertexExists("abc123");
   * if (!exists) {
   *   console.log("Vertex does not exist");
   * }
   * ```
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
   * Retrieves the vertex matching the given key or id.
   *
   * Throws an exception when passed a vertex or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a vertex from this collection).
   * @param options - Options for retrieving the vertex.
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.vertexCollection("vertices");
   * try {
   *   const vertex = await collection.vertex("abc123");
   *   console.log(vertex);
   * } catch (e) {
   *   console.error("Could not find vertex");
   * }
   * ```
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.vertexCollection("vertices");
   * const vertex = await collection.vertex("abc123", { graceful: true });
   * if (vertex) {
   *   console.log(vertex);
   * } else {
   *   console.error("Could not find vertex");
   * }
   * ```
   */
  async vertex(
    selector: DocumentSelector,
    options?: GraphCollectionReadOptions
  ): Promise<Document<T>>;
  /**
   * Retrieves the vertex matching the given key or id.
   *
   * Throws an exception when passed a vertex or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a vertex from this collection).
   * @param graceful - If set to `true`, `null` is returned instead of an
   * exception being thrown if the vertex does not exist.
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.vertexCollection("vertices");
   * try {
   *   const vertex = await collection.vertex("abc123", false);
   *   console.log(vertex);
   * } catch (e) {
   *   console.error("Could not find vertex");
   * }
   * ```
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.vertexCollection("vertices");
   * const vertex = await collection.vertex("abc123", true);
   * if (vertex) {
   *   console.log(vertex);
   * } else {
   *   console.error("Could not find vertex");
   * }
   * ```
   */
  async vertex(
    selector: DocumentSelector,
    graceful: boolean
  ): Promise<Document<T>>;
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
   * Inserts a new vertex with the given `data` into the collection.
   *
   * @param data - The contents of the new vertex.
   * @param options - Options for inserting the vertex.
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.vertexCollection("friends");
   * const result = await collection.save(
   *   { _key: "a", color: "blue", count: 1 },
   *   { returnNew: true }
   * );
   * console.log(result.new.color, result.new.count); // "blue" 1
   * ```
   */
  save(
    data: DocumentData<T>,
    options?: GraphCollectionInsertOptions
  ): Promise<DocumentMetadata & { new?: Document<T> }>;
  save(data: DocumentData<T>, options?: GraphCollectionInsertOptions) {
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
   * Replaces an existing vertex in the collection.
   *
   * Throws an exception when passed a vertex or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a vertex from this collection).
   * @param newData - The contents of the new vertex.
   * @param options - Options for replacing the vertex.
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.collection("vertices");
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
    newValue: DocumentData<T>,
    options?: GraphCollectionReplaceOptions
  ): Promise<DocumentMetadata & { new?: Document<T>; old?: Document<T> }>;
  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    options: GraphCollectionReplaceOptions = {}
  ) {
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
   * Updates an existing vertex in the collection.
   *
   * Throws an exception when passed a vertex or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a vertex from this collection).
   * @param newData - The data for updating the vertex.
   * @param options - Options for updating the vertex.
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.collection("vertices");
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
    newValue: Patch<DocumentData<T>>,
    options?: GraphCollectionReplaceOptions
  ): Promise<DocumentMetadata & { new?: Document<T>; old?: Document<T> }>;
  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    options: GraphCollectionReplaceOptions = {}
  ) {
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
   * Removes an existing vertex from the collection.
   *
   * Throws an exception when passed a vertex or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a vertex from this collection).
   * @param options - Options for removing the vertex.
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.vertexCollection("vertices");
   * await collection.remove("abc123");
   * // document with key "abc123" deleted
   * ```
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.vertexCollection("vertices");
   * const doc = await collection.vertex("abc123");
   * await collection.remove(doc);
   * // document with key "abc123" deleted
   * ```
   */
  remove(
    selector: DocumentSelector,
    options?: GraphCollectionRemoveOptions
  ): Promise<DocumentMetadata & { old?: Document<T> }>;
  remove(
    selector: DocumentSelector,
    options: GraphCollectionRemoveOptions = {}
  ) {
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
 * Represents a {@link Collection} of edges in a {@link Graph}.
 *
 * @param T - Type to use for document data. Defaults to `any`.
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
   * Name of the collection.
   */
  get name() {
    return this._name;
  }

  /**
   * A {@link EdgeCollection} instance for this edge collection.
   */
  get collection() {
    return this._collection;
  }

  /**
   * The {@link Graph} instance this edge collection is bound to.
   */
  get graph() {
    return this._graph;
  }

  /**
   * Checks whether a edge matching the given key or id exists in this
   * collection.
   *
   * Throws an exception when passed a edge or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a edge from this collection).
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.edgeCollection("friends")
   * const exists = await collection.edgeExists("abc123");
   * if (!exists) {
   *   console.log("Edge does not exist");
   * }
   * ```
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
   * Retrieves the edge matching the given key or id.
   *
   * Throws an exception when passed a edge or `_id` from a different
   * collection, or if the edge does not exist.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a edge from this collection).
   * @param options - Options for retrieving the edge.
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.edgeCollection("friends")
   * try {
   *   const edge = await collection.edge("abc123");
   *   console.log(edge);
   * } catch (e) {
   *   console.error("Could not find edge");
   * }
   * ```
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.edgeCollection("friends")
   * const edge = await collection.edge("abc123", { graceful: true });
   * if (edge) {
   *   console.log(edge);
   * } else {
   *   console.error("Edge does not exist");
   * }
   * ```
   */
  async edge(
    selector: DocumentSelector,
    options?: GraphCollectionReadOptions
  ): Promise<Edge<T>>;
  /**
   * Retrieves the edge matching the given key or id.
   *
   * Throws an exception when passed a edge or `_id` from a different
   * collection, or if the edge does not exist.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a edge from this collection).
   * @param graceful - If set to `true`, `null` is returned instead of an
   * exception being thrown if the edge does not exist.
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.edgeCollection("friends")
   * try {
   *   const edge = await collection.edge("abc123", false);
   *   console.log(edge);
   * } catch (e) {
   *   console.error("Could not find edge");
   * }
   * ```
   *
   * @example
   * ```js
   * const graph = db.graph("some-graph");
   * const collection = graph.edgeCollection("friends")
   * const edge = await collection.edge("abc123", true);
   * if (edge) {
   *   console.log(edge);
   * } else {
   *   console.error("Edge does not exist");
   * }
   * ```
   */
  async edge(selector: DocumentSelector, graceful: boolean): Promise<Edge<T>>;
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
   * Inserts a new edge with the given `data` into the collection.
   *
   * @param data - The contents of the new edge.
   * @param options - Options for inserting the edge.
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
    options?: GraphCollectionInsertOptions
  ): Promise<DocumentMetadata & { new?: Edge<T> }>;
  save(data: EdgeData<T>, options?: GraphCollectionInsertOptions) {
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
   * Replaces an existing edge in the collection.
   *
   * Throws an exception when passed a edge or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a edge from this collection).
   * @param newData - The contents of the new edge.
   * @param options - Options for replacing the edge.
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
    newValue: EdgeData<T>,
    options?: GraphCollectionReplaceOptions
  ): Promise<DocumentMetadata & { new?: Edge<T>; old?: Edge<T> }>;
  replace(
    selector: DocumentSelector,
    newValue: EdgeData<T>,
    options: GraphCollectionReplaceOptions = {}
  ) {
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
   * Updates an existing edge in the collection.
   *
   * Throws an exception when passed a edge or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a edge from this collection).
   * @param newData - The data for updating the edge.
   * @param options - Options for updating the edge.
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
    selector: DocumentSelector,
    newValue: Patch<EdgeData<T>>,
    options?: GraphCollectionReplaceOptions
  ): Promise<DocumentMetadata & { new?: Edge<T>; old?: Edge<T> }>;
  update(
    selector: DocumentSelector,
    newValue: Patch<EdgeData<T>>,
    options: GraphCollectionReplaceOptions = {}
  ) {
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
   * Removes an existing edge from the collection.
   *
   * Throws an exception when passed a edge or `_id` from a different
   * collection.
   *
   * @param selector - Document `_key`, `_id` or object with either of those
   * properties (e.g. a edge from this collection).
   * @param options - Options for removing the edge.
   *
   * @example
   * ```js
   * const db = new Database();
   * const collection = db.collection("friends");
   * const doc = await collection.edge("musadir");
   * await collection.remove(doc);
   * // edge with key "musadir" deleted
   * ```
   */
  remove(
    selector: DocumentSelector,
    options?: GraphCollectionRemoveOptions
  ): Promise<DocumentMetadata & { old?: Edge<T> }>;
  remove(
    selector: DocumentSelector,
    options: GraphCollectionRemoveOptions = {}
  ) {
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
 * Represents a graph in a {@link Database}.
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
   * Name of the graph.
   */
  get name() {
    return this._name;
  }

  /**
   * Checks whether the graph exists.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graph = db.graph("some-graph");
   * const result = await graph.exists();
   * // result indicates whether the graph exists
   * ```
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
   * Retrieves general information about the graph.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graph = db.graph("some-graph");
   * const data = await graph.get();
   * // data contains general information about the graph
   * ```
   */
  get(): Promise<GraphInfo> {
    return this._db.request(
      { path: `/_api/gharial/${this._name}` },
      (res) => res.body.graph
    );
  }

  /**
   * Creates a graph with the given `edgeDefinitions` and `options` for this
   * graph's name.
   *
   * @param edgeDefinitions - Definitions for the relations of the graph.
   * @param options - Options for creating the graph.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graph = db.graph("some-graph");
   * const info = await graph.create([
   *   {
   *     collection: "edges",
   *     from: ["start-vertices"],
   *     to: ["end-vertices"],
   *   },
   * ]);
   * // graph now exists
   * ```
   */
  create(
    edgeDefinitions: EdgeDefinitionOptions[],
    options?: GraphCreateOptions
  ): Promise<GraphInfo> {
    const { orphanCollections, waitForSync, isSmart, ...opts } = options || {};
    return this._db.request(
      {
        method: "POST",
        path: "/_api/gharial",
        body: {
          orphanCollections:
            orphanCollections &&
            (Array.isArray(orphanCollections)
              ? orphanCollections.map(collectionToString)
              : [collectionToString(orphanCollections)]),
          edgeDefinitions: edgeDefinitions.map(coerceEdgeDefinition),
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
   * Deletes the graph from the database.
   *
   * @param dropCollections - If set to `true`, the collections associated with
   * the graph will also be deleted.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graph = db.graph("some-graph");
   * await graph.drop();
   * // the graph "some-graph" no longer exists
   * ```
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
   * Returns a {@link GraphVertexCollection} instance for the given collection
   * name representing the collection in this graph.
   *
   * @param T - Type to use for document data. Defaults to `any`.
   * @param collection - Name of the vertex collection.
   */
  vertexCollection<T extends object = any>(
    collection: string | ArangoCollection
  ): GraphVertexCollection<T> {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return new GraphVertexCollection<T>(this._db, collection, this);
  }

  /**
   * Fetches all vertex collections of this graph from the database and returns
   * an array of their names.
   *
   * See also {@link Graph.vertexCollections}.
   */
  listVertexCollections(): Promise<string[]> {
    return this._db.request(
      { path: `/_api/gharial/${this._name}/vertex` },
      (res) => res.body.collections
    );
  }

  /**
   * Fetches all vertex collections of this graph from the database and returns
   * an array of {@link GraphVertexCollection} instances.
   *
   * See also {@link Graph.listVertexCollections}.
   */
  async vertexCollections(): Promise<GraphVertexCollection[]> {
    const names = await this.listVertexCollections();
    return names.map((name) => new GraphVertexCollection(this._db, name, this));
  }

  /**
   * Adds the given collection to this graph as a vertex collection.
   *
   * @param collection - Collection to add to the graph.
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
   * Removes the given collection from this graph as a vertex collection.
   *
   * @param collection - Collection to remove from the graph.
   * @param dropCollection - If set to `true`, the collection will also be
   * deleted from the database.
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
   * Returns a {@link GraphEdgeCollection} instance for the given collection
   * name representing the collection in this graph.
   *
   * @param T - Type to use for document data. Defaults to `any`.
   * @param collection - Name of the edge collection.
   */
  edgeCollection<T extends object = any>(
    collection: string | ArangoCollection
  ): GraphEdgeCollection<T> {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return new GraphEdgeCollection<T>(this._db, collection, this);
  }

  /**
   * Fetches all edge collections of this graph from the database and returns
   * an array of their names.
   *
   * See also {@link Graph.edgeCollections}.
   */
  listEdgeCollections(): Promise<string[]> {
    return this._db.request(
      { path: `/_api/gharial/${this._name}/edge` },
      (res) => res.body.collections
    );
  }

  /**
   * Fetches all edge collections of this graph from the database and returns
   * an array of {@link GraphEdgeCollection} instances.
   *
   * See also {@link Graph.listEdgeCollections}.
   */
  async edgeCollections(): Promise<GraphEdgeCollection[]> {
    const names = await this.listEdgeCollections();
    return names.map((name) => new GraphEdgeCollection(this._db, name, this));
  }

  /**
   * Adds an edge definition to this graph.
   *
   * @param edgeDefinition - Definition of a relation in this graph.
   */
  addEdgeDefinition(edgeDefinition: EdgeDefinitionOptions): Promise<GraphInfo> {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/gharial/${this._name}/edge`,
        body: coerceEdgeDefinition(edgeDefinition),
      },
      (res) => res.body.graph
    );
  }

  /**
   * Replaces an edge definition in this graph. The existing edge definition
   * for the given edge collection will be overwritten.
   *
   * @param edgeDefinition - Definition of a relation in this graph.
   */
  replaceEdgeDefinition(
    edgeDefinition: EdgeDefinitionOptions
  ): Promise<GraphInfo>;
  /**
   * Replaces an edge definition in this graph. The existing edge definition
   * for the given edge collection will be overwritten.
   *
   * @param collection - Edge collection for which to replace the definition.
   * @param edgeDefinition - Definition of a relation in this graph.
   */
  replaceEdgeDefinition(
    collection: string | ArangoCollection,
    edgeDefinition: EdgeDefinitionOptions
  ): Promise<GraphInfo>;
  replaceEdgeDefinition(
    collection: string | ArangoCollection | EdgeDefinitionOptions,
    edgeDefinition?: EdgeDefinitionOptions
  ) {
    if (!edgeDefinition) {
      edgeDefinition = collection as EdgeDefinitionOptions;
      collection = edgeDefinition.collection;
    }
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this._name}/edge/${collection}`,
        body: coerceEdgeDefinition(edgeDefinition),
      },
      (res) => res.body.graph
    );
  }

  /**
   * Removes the edge definition for the given edge collection from this graph.
   *
   * @param collection - Edge collection for which to remove the definition.
   * @param dropCollection - If set to `true`, the collection will also be
   * deleted from the database.
   */
  removeEdgeDefinition(
    collection: string | ArangoCollection,
    dropCollection: boolean = false
  ): Promise<GraphInfo> {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this._name}/edge/${collection}`,
        qs: {
          dropCollection,
        },
      },
      (res) => res.body.graph
    );
  }

  /**
   * Performs a traversal starting from the given `startVertex` and following
   * edges contained in this graph.
   *
   * See also {@link EdgeCollection.traversal}.
   *
   * @param startVertex - Document `_id` of a vertex in this graph.
   * @param options - Options for performing the traversal.
   *
   * @deprecated Simple Queries have been deprecated in ArangoDB 3.4 and can be
   * replaced with AQL queries.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graph = db.graph("my-graph");
   * const collection = graph.edgeCollection("edges").collection;
   * await collection.import([
   *   ["_key", "_from", "_to"],
   *   ["x", "vertices/a", "vertices/b"],
   *   ["y", "vertices/b", "vertices/c"],
   *   ["z", "vertices/c", "vertices/d"],
   * ]);
   * const result = await graph.traversal("vertices/a", {
   *   direction: "outbound",
   *   init: "result.vertices = [];",
   *   visitor: "result.vertices.push(vertex._key);",
   * });
   * console.log(result.vertices); // ["a", "b", "c", "d"]
   * ```
   */
  traversal(startVertex: string, options?: TraversalOptions): Promise<any> {
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
