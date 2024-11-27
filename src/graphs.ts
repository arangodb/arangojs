/**
 * ```ts
 * import type {
 *   Graph,
 *   GraphVertexCollection,
 *   GraphEdgeCollection,
 * } from "arangojs/graphs";
 * ```
 *
 * The "graphs" module provides graph related types and interfaces
 * for TypeScript.
 *
 * @packageDocumentation
 */
import * as collections from "./collections.js";
import * as databases from "./databases.js";
import * as documents from "./documents.js";
import * as errors from "./errors.js";
import { DOCUMENT_NOT_FOUND, GRAPH_NOT_FOUND } from "./lib/codes.js";

/**
 * @internal
 */
function mungeGharialResponse(body: any, prop: "vertex" | "edge" | "removed") {
  const { [prop]: doc, ...meta } = body;
  return { ...meta, ...doc };
}

/**
 * @internal
 */
function coerceEdgeDefinition(options: EdgeDefinitionOptions): EdgeDefinition {
  const edgeDefinition = {} as EdgeDefinition;
  edgeDefinition.collection = collections.collectionToString(options.collection);
  edgeDefinition.from = Array.isArray(options.from)
    ? options.from.map(collections.collectionToString)
    : [collections.collectionToString(options.from)];
  edgeDefinition.to = Array.isArray(options.to)
    ? options.to.map(collections.collectionToString)
    : [collections.collectionToString(options.to)];
  return edgeDefinition;
}

//#region Graph document operation options
/**
 * Options for retrieving a document from a graph collection.
 */
export type ReadGraphDocumentOptions = {
  /**
   * If set to a document revision, the document will only be returned if its
   * `_rev` property matches this value.
   *
   * See also {@link documents.DocumentMetadata}.
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
export type InsertGraphDocumentOptions = {
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
export type ReplaceGraphDocumentOptions = {
  /**
   * If set to a document revision, the document will only be modified if its
   * `_rev` property matches this value.
   *
   * See also {@link documents.DocumentMetadata}.
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
export type RemoveGraphDocumentOptions = {
  /**
   * If set to a document revision, the document will only be removed if its
   * `_rev` property matches this value.
   *
   * See also {@link documents.DocumentMetadata}.
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
//#endregion

//#region Edge definition operation options
/**
 * An edge definition used to define a collection of edges in a {@link Graph}.
 */
export type EdgeDefinitionOptions = {
  /**
   * Collection containing the edges.
   */
  collection: string | collections.ArangoCollection;
  /**
   * Collection or collections containing the start vertices.
   */
  from: (string | collections.ArangoCollection)[] | string | collections.ArangoCollection;
  /**
   * Collection or collections containing the end vertices.
   */
  to: (string | collections.ArangoCollection)[] | string | collections.ArangoCollection;
};
//#endregion

//#region GraphDescription
/**
 * General information about a graph.
 */
export type GraphDescription = {
  /**
   * Key of the document internally representing this graph.
   *
   * See {@link documents.DocumentMetadata}.
   *
   * @internal
   */
  _key: string;
  /**
   * Unique identifier of the document internally representing this graph.
   *
   * See {@link documents.DocumentMetadata}.
   *
   * @internal
   */
  _id: string;
  /**
   * Revision of the document internally representing this graph.
   *
   * See {@link documents.DocumentMetadata}.
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
   * (Cluster only.) Number of shards that is used for every collection
   * within this graph.
   */
  numberOfShards?: number;
  /**
   * (Cluster only.) Replication factor used when initially creating
   * collections for this graph.
   */
  replicationFactor?: number;
  /**
   * (Cluster only.) Write concern for new collections in the graph.
   */
  writeConcern?: number;
  /**
   * (Enterprise Edition cluster only.) If set to `true`, the graph is a
   * SatelliteGraph.
   */
  isSatellite?: boolean;
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
  /**
   * (Enterprise Edition cluster only.) If set to `true`, the graph has been
   * created as a Disjoint SmartGraph.
   */
  isDisjoint?: boolean;
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
//#endregion

//#region Graph operation options
/**
 * Option for creating a graph.
 */
export type CreateGraphOptions = {
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
  orphanCollections?: (string | collections.ArangoCollection)[] | string | collections.ArangoCollection;

  /**
   * (Cluster only.) Number of shards that is used for every collection
   * within this graph.
   *
   * Has no effect when `replicationFactor` is set to `"satellite"`.
   */
  numberOfShards?: number;
  /**
   * (Cluster only.) Replication factor used when initially creating
   * collections for this graph.
   *
   * Default: `1`
   */
  replicationFactor?: number | "satellite";
  /**
   * (Cluster only.) Write concern for new collections in the graph.
   *
   * Has no effect when `replicationFactor` is set to `"satellite"`.
   */
  writeConcern?: number;

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
   */
  smartGraphAttribute?: string;
  /**
   * (Enterprise Edition cluster only.) If set to `true`, the graph will be
   * created as a Disjoint SmartGraph.
   *
   * Default: `false`
   */
  isDisjoint?: boolean;
  /**
   * (Enterprise Edition cluster only.) Collections to be included in a Hybrid
   * SmartGraph.
   */
  satellites?: (string | collections.ArangoCollection)[];
};

/**
 * Options for adding a vertex collection to a graph.
 */
export type AddVertexCollectionOptions = {
  /**
   * (Enterprise Edition cluster only.) Collections to be included in a Hybrid
   * SmartGraph.
   */
  satellites?: (string | collections.ArangoCollection)[];
};

/**
 * Options for adding an edge definition to a graph.
 */
export type AddEdgeDefinitionOptions = {
  /**
   * (Enterprise Edition cluster only.) Collections to be included in a Hybrid
   * SmartGraph.
   */
  satellites?: (string | collections.ArangoCollection)[];
};

/**
 * Options for replacing an edge definition in a graph.
 */
export type ReplaceEdgeDefinitionOptions = {
  /**
   * (Enterprise Edition cluster only.) Collections to be included in a Hybrid
   * SmartGraph.
   */
  satellites?: string[];
};
//#endregion

//#region GraphVertexCollection class
/**
 * Represents a {@link collections.DocumentCollection} of vertices in a {@link Graph}.
 *
 * @param EntryResultType - Type to represent vertex document contents returned
 * by the server (including computed properties).
 * @param EntryInputType - Type to represent vertex document contents passed
 * when inserting or replacing vertex documents (without computed properties).
 */
export class GraphVertexCollection<
  EntryResultType extends Record<string, any> = any,
  EntryInputType extends Record<string, any> = EntryResultType,
>
  implements collections.ArangoCollection {
  protected _db: databases.Database;
  protected _name: string;
  protected _graph: Graph;
  protected _collection: collections.DocumentCollection<EntryResultType, EntryInputType>;

  /**
   * @internal
   */
  constructor(db: databases.Database, name: string, graph: Graph) {
    this._db = db;
    this._collection = db.collection(name);
    this._name = this._collection.name;
    this._graph = graph;
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
   * Database this vertex collection belongs to.
   */
  get database() {
    return this._db;
  }

  /**
   * Name of the collection.
   */
  get name() {
    return this._name;
  }

  /**
   * A {@link collections.DocumentCollection} instance for this vertex collection.
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
  async vertexExists(selector: documents.DocumentSelector): Promise<boolean> {
    try {
      return await this._db.request(
        {
          method: "HEAD",
          path: `/_api/gharial/${encodeURIComponent(
            this.graph.name
          )}/vertex/${encodeURI(documents._documentHandle(selector, this._name))}`,
        },
        () => true
      );
    } catch (err: any) {
      if (err.code === 404) {
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
   * } catch (e: any) {
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
    selector: documents.DocumentSelector,
    options?: ReadGraphDocumentOptions
  ): Promise<documents.Document<EntryResultType>>;
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
   * } catch (e: any) {
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
    selector: documents.DocumentSelector,
    graceful: boolean
  ): Promise<documents.Document<EntryResultType>>;
  async vertex(
    selector: documents.DocumentSelector,
    options: boolean | ReadGraphDocumentOptions = {}
  ): Promise<documents.Document<EntryResultType> | null> {
    if (typeof options === "boolean") {
      options = { graceful: options };
    }
    const {
      allowDirtyRead = undefined,
      graceful = false,
      rev,
      ...search
    } = options;
    const headers: Record<string, string> = {};
    if (rev) headers["if-match"] = rev;
    const result = this._db.request(
      {
        path: `/_api/gharial/${encodeURIComponent(
          this.graph.name
        )}/vertex/${encodeURI(documents._documentHandle(selector, this._name))}`,
        headers,
        search,
        allowDirtyRead,
      },
      (res) => res.parsedBody.vertex
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
    data: documents.DocumentData<EntryInputType>,
    options?: InsertGraphDocumentOptions
  ): Promise<documents.DocumentMetadata & { new?: documents.Document<EntryResultType> }>;
  save(data: documents.DocumentData<EntryInputType>, options?: InsertGraphDocumentOptions) {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/gharial/${encodeURIComponent(
          this.graph.name
        )}/vertex/${encodeURIComponent(this._name)}`,
        body: data,
        search: options,
      },
      (res) => mungeGharialResponse(res.parsedBody, "vertex")
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
    selector: documents.DocumentSelector,
    newValue: documents.DocumentData<EntryInputType>,
    options?: ReplaceGraphDocumentOptions
  ): Promise<documents.DocumentMetadata & { new?: documents.Document<EntryResultType>; old?: documents.Document<EntryResultType> }>;
  replace(
    selector: documents.DocumentSelector,
    newValue: documents.DocumentData<EntryInputType>,
    options: ReplaceGraphDocumentOptions = {}
  ) {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...search } = options;
    const headers: Record<string, string> = {};
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/gharial/${encodeURIComponent(
          this.graph.name
        )}/vertex/${encodeURI(documents._documentHandle(selector, this._name))}`,
        body: newValue,
        search,
        headers,
      },
      (res) => mungeGharialResponse(res.parsedBody, "vertex")
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
    selector: documents.DocumentSelector,
    newValue: documents.Patch<documents.DocumentData<EntryInputType>>,
    options?: ReplaceGraphDocumentOptions
  ): Promise<documents.DocumentMetadata & { new?: documents.Document<EntryResultType>; old?: documents.Document<EntryResultType> }>;
  update(
    selector: documents.DocumentSelector,
    newValue: documents.Patch<documents.DocumentData<EntryInputType>>,
    options: ReplaceGraphDocumentOptions = {}
  ) {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const headers: Record<string, string> = {};
    const { rev, ...search } = options;
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/gharial/${encodeURIComponent(
          this.graph.name
        )}/vertex/${encodeURI(documents._documentHandle(selector, this._name))}`,
        body: newValue,
        search,
        headers,
      },
      (res) => mungeGharialResponse(res.parsedBody, "vertex")
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
    selector: documents.DocumentSelector,
    options?: RemoveGraphDocumentOptions
  ): Promise<documents.DocumentMetadata & { old?: documents.Document<EntryResultType> }>;
  remove(
    selector: documents.DocumentSelector,
    options: RemoveGraphDocumentOptions = {}
  ) {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const headers: Record<string, string> = {};
    const { rev, ...search } = options;
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${encodeURIComponent(
          this.graph.name
        )}/vertex/${encodeURI(documents._documentHandle(selector, this._name))}`,
        search,
        headers,
      },
      (res) => mungeGharialResponse(res.parsedBody, "removed")
    );
  }
}
//#endregion

//#region GraphEdgeCollection class
/**
 * Represents a {@link collections.EdgeCollection} of edges in a {@link Graph}.
 *
 * @param EntryResultType - Type to represent edge document contents returned
 * by the server (including computed properties).
 * @param EntryInputType - Type to represent edge document contents passed
 * when inserting or replacing edge documents (without computed properties).
 */
export class GraphEdgeCollection<
  EntryResultType extends Record<string, any> = any,
  EntryInputType extends Record<string, any> = EntryResultType,
>
  implements collections.ArangoCollection {
  protected _db: databases.Database;
  protected _name: string;
  protected _graph: Graph;
  protected _collection: collections.EdgeCollection<EntryResultType, EntryInputType>;

  /**
   * @internal
   */
  constructor(db: databases.Database, name: string, graph: Graph) {
    this._db = db;
    this._collection = db.collection(name);
    this._name = this._collection.name;
    this._graph = graph;
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
   * Database this edge collection belongs to.
   */
  get database() {
    return this._db;
  }

  /**
   * Name of the collection.
   */
  get name() {
    return this._name;
  }

  /**
   * A {@link collections.EdgeCollection} instance for this edge collection.
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
  async edgeExists(selector: documents.DocumentSelector): Promise<boolean> {
    try {
      return await this._db.request(
        {
          method: "HEAD",
          path: `/_api/gharial/${encodeURIComponent(
            this.graph.name
          )}/edge/${encodeURI(documents._documentHandle(selector, this._name))}`,
        },
        () => true
      );
    } catch (err: any) {
      if (err.code === 404) {
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
   * } catch (e: any) {
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
    selector: documents.DocumentSelector,
    options?: ReadGraphDocumentOptions
  ): Promise<documents.Edge<EntryResultType>>;
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
   * } catch (e: any) {
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
  async edge(selector: documents.DocumentSelector, graceful: boolean): Promise<documents.Edge<EntryResultType>>;
  async edge(
    selector: documents.DocumentSelector,
    options: boolean | ReadGraphDocumentOptions = {}
  ): Promise<documents.Edge<EntryResultType> | null> {
    if (typeof options === "boolean") {
      options = { graceful: options };
    }
    const {
      allowDirtyRead = undefined,
      graceful = false,
      rev,
      ...search
    } = options;
    const headers: Record<string, string> = {};
    if (rev) headers["if-match"] = rev;
    const result = this._db.request(
      {
        path: `/_api/gharial/${encodeURIComponent(
          this.graph.name
        )}/edge/${encodeURI(documents._documentHandle(selector, this._name))}`,
        search,
        allowDirtyRead,
      },
      (res) => res.parsedBody.edge
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
    data: documents.EdgeData<EntryInputType>,
    options?: InsertGraphDocumentOptions
  ): Promise<documents.DocumentMetadata & { new?: documents.Edge<EntryResultType> }>;
  save(data: documents.EdgeData<EntryInputType>, options?: InsertGraphDocumentOptions) {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/gharial/${encodeURIComponent(
          this.graph.name
        )}/edge/${encodeURIComponent(this._name)}`,
        body: data,
        search: options,
      },
      (res) => mungeGharialResponse(res.parsedBody, "edge")
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
    selector: documents.DocumentSelector,
    newValue: documents.EdgeData<EntryInputType>,
    options?: ReplaceGraphDocumentOptions
  ): Promise<documents.DocumentMetadata & { new?: documents.Edge<EntryResultType>; old?: documents.Edge<EntryResultType> }>;
  replace(
    selector: documents.DocumentSelector,
    newValue: documents.EdgeData<EntryInputType>,
    options: ReplaceGraphDocumentOptions = {}
  ) {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...search } = options;
    const headers: Record<string, string> = {};
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/gharial/${encodeURIComponent(
          this.graph.name
        )}/edge/${encodeURI(documents._documentHandle(selector, this._name))}`,
        body: newValue,
        search,
        headers,
      },
      (res) => mungeGharialResponse(res.parsedBody, "edge")
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
    selector: documents.DocumentSelector,
    newValue: documents.Patch<documents.EdgeData<EntryInputType>>,
    options?: ReplaceGraphDocumentOptions
  ): Promise<documents.DocumentMetadata & { new?: documents.Edge<EntryResultType>; old?: documents.Edge<EntryResultType> }>;
  update(
    selector: documents.DocumentSelector,
    newValue: documents.Patch<documents.EdgeData<EntryInputType>>,
    options: ReplaceGraphDocumentOptions = {}
  ) {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...search } = options;
    const headers: Record<string, string> = {};
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/gharial/${encodeURIComponent(
          this.graph.name
        )}/edge/${encodeURI(documents._documentHandle(selector, this._name))}`,
        body: newValue,
        search,
        headers,
      },
      (res) => mungeGharialResponse(res.parsedBody, "edge")
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
    selector: documents.DocumentSelector,
    options?: RemoveGraphDocumentOptions
  ): Promise<documents.DocumentMetadata & { old?: documents.Edge<EntryResultType> }>;
  remove(
    selector: documents.DocumentSelector,
    options: RemoveGraphDocumentOptions = {}
  ) {
    if (typeof options === "string") {
      options = { rev: options };
    }
    const { rev, ...search } = options;
    const headers: Record<string, string> = {};
    if (rev) headers["if-match"] = rev;
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${encodeURIComponent(
          this.graph.name
        )}/edge/${encodeURI(documents._documentHandle(selector, this._name))}`,
        search,
        headers,
      },
      (res) => mungeGharialResponse(res.parsedBody, "removed")
    );
  }
}
//#endregion

//#region Graph class
/**
 * Indicates whether the given value represents a {@link Graph}.
 *
 * @param graph - A value that might be a Graph.
 */
export function isArangoGraph(graph: any): graph is Graph {
  return Boolean(graph && graph.isArangoGraph);
}

/**
 * Represents a graph in a {@link databases.Database}.
 */
export class Graph {
  protected _name: string;

  protected _db: databases.Database;

  /**
   * @internal
   */
  constructor(db: databases.Database, name: string) {
    this._db = db;
    this._name = name;
  }

  /**
   * Indicates that this object represents an ArangoDB Graph.
   */
  get isArangoGraph(): true {
    return true;
  }

  /**
   * Database this graph belongs to.
   */
  get database() {
    return this._db;
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
    } catch (err: any) {
      if (errors.isArangoError(err) && err.errorNum === GRAPH_NOT_FOUND) {
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
  get(): Promise<GraphDescription> {
    return this._db.request(
      { path: `/_api/gharial/${encodeURIComponent(this._name)}` },
      (res) => res.parsedBody.graph
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
    options: CreateGraphOptions = {}
  ): Promise<GraphDescription> {
    const { orphanCollections, satellites, waitForSync, isSmart, ...opts } =
      options;
    return this._db.request(
      {
        method: "POST",
        path: "/_api/gharial",
        body: {
          orphanCollections:
            orphanCollections &&
            (Array.isArray(orphanCollections)
              ? orphanCollections.map(collections.collectionToString)
              : [collections.collectionToString(orphanCollections)]),
          edgeDefinitions: edgeDefinitions.map(coerceEdgeDefinition),
          isSmart,
          name: this._name,
          options: { ...opts, satellites: satellites?.map(collections.collectionToString) },
        },
        search: { waitForSync },
      },
      (res) => res.parsedBody.graph
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
        path: `/_api/gharial/${encodeURIComponent(this._name)}`,
        search: { dropCollections },
      },
      (res) => res.parsedBody.removed
    );
  }

  /**
   * Returns a {@link GraphVertexCollection} instance for the given collection
   * name representing the collection in this graph.
   *
   * @param T - Type to use for document data. Defaults to `any`.
   * @param collection - Name of the vertex collection.
   */
  vertexCollection<T extends Record<string, any> = any>(
    collection: string | collections.ArangoCollection
  ): GraphVertexCollection<T> {
    return new GraphVertexCollection<T>(
      this._db,
      collections.collectionToString(collection),
      this
    );
  }

  /**
   * Fetches all vertex collections of this graph from the database and returns
   * an array of their names.
   *
   * See also {@link Graph#vertexCollections}.
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
   * const vertexCollectionNames = await graph.listVertexCollections();
   * // ["start-vertices", "end-vertices"]
   * ```
   */
  listVertexCollections(): Promise<string[]> {
    return this._db.request(
      { path: `/_api/gharial/${encodeURIComponent(this._name)}/vertex` },
      (res) => res.parsedBody.collections
    );
  }

  /**
   * Fetches all vertex collections of this graph from the database and returns
   * an array of {@link GraphVertexCollection} instances.
   *
   * See also {@link Graph#listVertexCollections}.
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
   * const vertexCollections = await graph.vertexCollections();
   * for (const vertexCollection of vertexCollections) {
   *   console.log(vertexCollection.name);
   *   // "start-vertices"
   *   // "end-vertices"
   * }
   * ```
   */
  async vertexCollections(): Promise<GraphVertexCollection[]> {
    const names = await this.listVertexCollections();
    return names.map((name) => new GraphVertexCollection(this._db, name, this));
  }

  /**
   * Adds the given collection to this graph as a vertex collection.
   *
   * @param collection - Collection to add to the graph.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graph = db.graph("some-graph");
   * await graph.addVertexCollection("more-vertices");
   * // The collection "more-vertices" has been added to the graph
   * const extra = db.collection("extra-vertices");
   * await graph.addVertexCollection(extra);
   * // The collection "extra-vertices" has been added to the graph
   * ```
   */
  addVertexCollection(
    collection: string | collections.ArangoCollection,
    options: AddVertexCollectionOptions = {}
  ): Promise<GraphDescription> {
    const { satellites, ...opts } = options;
    return this._db.request(
      {
        method: "POST",
        path: `/_api/gharial/${encodeURIComponent(this._name)}/vertex`,
        body: {
          collection: collections.collectionToString(collection),
          options: { ...opts, satellites: satellites?.map(collections.collectionToString) },
        },
      },
      (res) => res.parsedBody.graph
    );
  }

  /**
   * Removes the given collection from this graph as a vertex collection.
   *
   * @param collection - Collection to remove from the graph.
   * @param dropCollection - If set to `true`, the collection will also be
   * deleted from the database.
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
   * await graph.removeVertexCollection("start-vertices");
   * // The collection "start-vertices" is no longer part of the graph.
   * ```
   */
  removeVertexCollection(
    collection: string | collections.ArangoCollection,
    dropCollection: boolean = false
  ): Promise<GraphDescription> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${encodeURIComponent(
          this._name
        )}/vertex/${encodeURIComponent(collections.collectionToString(collection))}`,
        search: {
          dropCollection,
        },
      },
      (res) => res.parsedBody.graph
    );
  }

  /**
   * Returns a {@link GraphEdgeCollection} instance for the given collection
   * name representing the collection in this graph.
   *
   * @param T - Type to use for document data. Defaults to `any`.
   * @param collection - Name of the edge collection.
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
   * const graphEdgeCollection = graph.edgeCollection("edges");
   * // Access the underlying EdgeCollection API:
   * const edgeCollection = graphEdgeCollection.collection;
   * ```
   */
  edgeCollection<T extends Record<string, any> = any>(
    collection: string | collections.ArangoCollection
  ): GraphEdgeCollection<T> {
    return new GraphEdgeCollection<T>(
      this._db,
      collections.collectionToString(collection),
      this
    );
  }

  /**
   * Fetches all edge collections of this graph from the database and returns
   * an array of their names.
   *
   * See also {@link Graph#edgeCollections}.
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
   * const edgeCollectionNames = await graph.listEdgeCollections();
   * // ["edges"]
   * ```
   */
  listEdgeCollections(): Promise<string[]> {
    return this._db.request(
      { path: `/_api/gharial/${encodeURIComponent(this._name)}/edge` },
      (res) => res.parsedBody.collections
    );
  }

  /**
   * Fetches all edge collections of this graph from the database and returns
   * an array of {@link GraphEdgeCollection} instances.
   *
   * See also {@link Graph#listEdgeCollections}.
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
   * const graphEdgeCollections = await graph.edgeCollections();
   * for (const collection of graphEdgeCollection) {
   *   console.log(collection.name);
   *   // "edges"
   * }
   * ```
   */
  async edgeCollections(): Promise<GraphEdgeCollection[]> {
    const names = await this.listEdgeCollections();
    return names.map((name) => new GraphEdgeCollection(this._db, name, this));
  }

  /**
   * Adds an edge definition to this graph.
   *
   * @param edgeDefinition - Definition of a relation in this graph.
   *
   * @example
   * ```js
   * const db = new Database();
   * const graph = db.graph("some-graph");
   * await graph.addEdgeDefinition({
   *   collection: "edges",
   *   from: ["start-vertices"],
   *   to: ["end-vertices"],
   * });
   * // The edge definition has been added to the graph
   * ```
   */
  addEdgeDefinition(
    edgeDefinition: EdgeDefinitionOptions,
    options: AddEdgeDefinitionOptions = {}
  ): Promise<GraphDescription> {
    const { satellites, ...opts } = options;
    return this._db.request(
      {
        method: "POST",
        path: `/_api/gharial/${encodeURIComponent(this._name)}/edge`,
        body: {
          ...coerceEdgeDefinition(edgeDefinition),
          options: { ...opts, satellites: satellites?.map(collections.collectionToString) },
        },
      },
      (res) => res.parsedBody.graph
    );
  }

  /**
   * Replaces an edge definition in this graph. The existing edge definition
   * for the given edge collection will be overwritten.
   *
   * @param edgeDefinition - Definition of a relation in this graph.
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
   * await graph.replaceEdgeDefinition({
   *   collection: "edges",
   *   from: ["start-vertices"],
   *   to: ["other-vertices"],
   * });
   * // The edge definition for "edges" has been replaced
   * ```
   */
  replaceEdgeDefinition(
    edgeDefinition: EdgeDefinitionOptions,
    options?: ReplaceEdgeDefinitionOptions
  ): Promise<GraphDescription>;
  /**
   * Replaces an edge definition in this graph. The existing edge definition
   * for the given edge collection will be overwritten.
   *
   * @param collection - Edge collection for which to replace the definition.
   * @param edgeDefinition - Definition of a relation in this graph.
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
   * await graph.replaceEdgeDefinition("edges", {
   *   collection: "edges",
   *   from: ["start-vertices"],
   *   to: ["other-vertices"],
   * });
   * // The edge definition for "edges" has been replaced
   * ```
   */
  replaceEdgeDefinition(
    collection: string | collections.ArangoCollection,
    edgeDefinition: EdgeDefinitionOptions,
    options?: ReplaceEdgeDefinitionOptions
  ): Promise<GraphDescription>;
  replaceEdgeDefinition(
    collectionOrEdgeDefinitionOptions:
      | string
      | collections.ArangoCollection
      | EdgeDefinitionOptions,
    edgeDefinitionOrOptions?:
      | EdgeDefinitionOptions
      | ReplaceEdgeDefinitionOptions,
    options: ReplaceEdgeDefinitionOptions = {}
  ) {
    let collection = collectionOrEdgeDefinitionOptions as
      | string
      | collections.ArangoCollection;
    let edgeDefinition = edgeDefinitionOrOptions as EdgeDefinitionOptions;
    if (
      edgeDefinitionOrOptions &&
      !edgeDefinitionOrOptions.hasOwnProperty("collection")
    ) {
      options = edgeDefinitionOrOptions as ReplaceEdgeDefinitionOptions;
      edgeDefinitionOrOptions = undefined;
    }
    if (!edgeDefinitionOrOptions) {
      edgeDefinition =
        collectionOrEdgeDefinitionOptions as EdgeDefinitionOptions;
      collection = edgeDefinition.collection;
    }
    const { satellites, ...opts } = options;
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/gharial/${encodeURIComponent(
          this._name
        )}/edge/${encodeURIComponent(collections.collectionToString(collection))}`,
        body: {
          ...coerceEdgeDefinition(edgeDefinition),
          options: { ...opts, satellites: satellites?.map(collections.collectionToString) },
        },
      },
      (res) => res.parsedBody.graph
    );
  }

  /**
   * Removes the edge definition for the given edge collection from this graph.
   *
   * @param collection - Edge collection for which to remove the definition.
   * @param dropCollection - If set to `true`, the collection will also be
   * deleted from the database.
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
   * await graph.removeEdgeDefinition("edges");
   * // The edge definition for "edges" has been replaced
   * ```
   */
  removeEdgeDefinition(
    collection: string | collections.ArangoCollection,
    dropCollection: boolean = false
  ): Promise<GraphDescription> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${encodeURIComponent(
          this._name
        )}/edge/${encodeURIComponent(collections.collectionToString(collection))}`,
        search: {
          dropCollection,
        },
      },
      (res) => res.parsedBody.graph
    );
  }
}
//#endregion