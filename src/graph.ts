import {
  ArangoCollection,
  CollectionReadOptions,
  CollectionRemoveResult,
  CollectionSaveResult,
  Document,
  DocumentCollection,
  DocumentData,
  documentHandle,
  Edge,
  EdgeCollection,
  EdgeData,
  isArangoCollection,
  Selector,
  _constructCollection
} from "./collection";
import { Connection } from "./connection";
import { isArangoError } from "./error";
import { Headers } from "./route";
import { DOCUMENT_NOT_FOUND, GRAPH_NOT_FOUND } from "./util/codes";
import { Patch } from "./util/types";

export interface InsertOptions {
  waitForSync?: boolean;
  returnNew?: boolean;
}

export interface ReplaceOptions extends InsertOptions {
  waitForSync?: boolean;
  keepNull?: boolean;
  returnOld?: boolean;
  returnNew?: boolean;
  rev?: string;
}

export interface RemoveOptions {
  waitForSync?: boolean;
  returnOld?: boolean;
  rev?: string;
}

export interface UpdateOptions extends ReplaceOptions {}

type TODO_any = any;

export class GraphVertexCollection<T extends object = any>
  implements ArangoCollection {
  isArangoCollection: true = true;
  private _connection: Connection;
  private _name: string;

  graph: Graph;
  collection: DocumentCollection<T>;

  constructor(connection: Connection, name: string, graph: Graph) {
    this._connection = connection;
    this._name = name;
    this.graph = graph;
    this.collection = _constructCollection(connection, name);
  }

  get name() {
    return this._name;
  }

  vertex(
    selector: Selector,
    opts?: CollectionReadOptions
  ): Promise<Document<T>>;
  vertex(selector: Selector, graceful: boolean): Promise<Document<T>>;
  vertex(
    selector: Selector,
    opts?: boolean | CollectionReadOptions
  ): Promise<Document<T>> {
    if (typeof opts === "boolean") {
      opts = { graceful: opts };
    }
    const { allowDirtyRead = undefined, graceful = false } = opts || {};
    const result = this._connection.request(
      {
        path: `/_api/gharial/${this.graph.name}/vertex/${documentHandle(
          selector,
          this._name
        )}`,
        allowDirtyRead
      },
      res => res.body.vertex
    );
    if (!graceful) return result;
    return result.catch(err => {
      if (isArangoError(err) && err.errorNum === DOCUMENT_NOT_FOUND) {
        return null;
      }
      throw err;
    });
  }

  save(
    data: DocumentData<T>,
    opts?: { waitForSync?: boolean; returnNew?: boolean }
  ): Promise<CollectionSaveResult<Document<T>>> {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this.graph.name}/vertex/${this._name}`,
        body: data,
        qs: opts
      },
      res => res.body.vertex
    );
  }

  replace(
    selector: Selector,
    newValue: DocumentData<T>,
    opts: TODO_any = {}
  ): Promise<CollectionSaveResult<Document<T>>> {
    const headers: Headers = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this.graph.name}/vertex/${documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs: opts,
        headers
      },
      res => res.body.vertex
    );
  }

  update(
    selector: Selector,
    newValue: Patch<DocumentData<T>>,
    opts: TODO_any = {}
  ): Promise<CollectionSaveResult<Document<T>>> {
    const headers: Headers = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/gharial/${this.graph.name}/vertex/${documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs: opts,
        headers
      },
      res => res.body.vertex
    );
  }

  remove(
    selector: Selector,
    opts: TODO_any = {}
  ): Promise<CollectionRemoveResult<Document<T>>> {
    const headers: Headers = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this.graph.name}/vertex/${documentHandle(
          selector,
          this._name
        )}`,
        qs: opts,
        headers
      },
      res => res.body.removed
    );
  }
}

export class GraphEdgeCollection<T extends object = any>
  implements ArangoCollection {
  isArangoCollection: true = true;
  private _connection: Connection;
  private _name: string;

  graph: Graph;
  collection: EdgeCollection<T>;

  constructor(connection: Connection, name: string, graph: Graph) {
    this._connection = connection;
    this._name = name;
    this.graph = graph;
    this.collection = _constructCollection(connection, name);
  }

  get name() {
    return this._name;
  }

  edge(selector: Selector, graceful: boolean): Promise<Edge<T>>;
  edge(selector: Selector, opts?: CollectionReadOptions): Promise<Edge<T>>;
  edge(
    selector: Selector,
    opts: boolean | CollectionReadOptions = {}
  ): Promise<Edge<T>> {
    if (typeof opts === "boolean") {
      opts = { graceful: opts };
    }
    const { allowDirtyRead = undefined, graceful = false } = opts;
    const result = this._connection.request(
      {
        path: `/_api/gharial/${this.graph.name}/edge/${documentHandle(
          selector,
          this._name
        )}`,
        allowDirtyRead
      },
      res => res.body.edge
    );
    if (!graceful) return result;
    return result.catch(err => {
      if (isArangoError(err) && err.errorNum === DOCUMENT_NOT_FOUND) {
        return null;
      }
      throw err;
    });
  }

  save(
    data: EdgeData<T>,
    opts?: { waitForSync?: boolean; returnNew?: boolean }
  ): Promise<CollectionSaveResult<Edge<T>>> {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this.graph.name}/edge/${this._name}`,
        body: data,
        qs: opts
      },
      res => res.body.edge
    );
  }

  replace(
    selector: Selector,
    newValue: EdgeData<T>,
    opts: TODO_any = {}
  ): Promise<CollectionSaveResult<Edge<T>>> {
    const headers: Headers = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this.graph.name}/edge/${documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs: opts,
        headers
      },
      res => res.body.edge
    );
  }

  update(
    selector: Selector,
    newValue: Patch<EdgeData<T>>,
    opts: TODO_any = {}
  ): Promise<CollectionSaveResult<Edge<T>>> {
    const headers: Headers = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/gharial/${this.graph.name}/edge/${documentHandle(
          selector,
          this._name
        )}`,
        body: newValue,
        qs: opts,
        headers
      },
      res => res.body.edge
    );
  }

  remove(
    selector: Selector,
    opts: TODO_any = {}
  ): Promise<CollectionRemoveResult<Edge<T>>> {
    const headers: Headers = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this.graph.name}/edge/${documentHandle(
          selector,
          this._name
        )}`,
        qs: opts,
        headers
      },
      res => res.body.removed
    );
  }
}

export class Graph {
  private _name: string;

  private _connection: Connection;

  constructor(connection: Connection, name: string) {
    this._name = name;
    this._connection = connection;
  }

  get name() {
    return this._name;
  }

  get(): Promise<TODO_any> {
    return this._connection.request(
      { path: `/_api/gharial/${this._name}` },
      res => res.body.graph
    );
  }

  exists(): Promise<boolean> {
    return this.get().then(
      () => true,
      err => {
        if (isArangoError(err) && err.errorNum === GRAPH_NOT_FOUND) {
          return false;
        }
        throw err;
      }
    );
  }

  create(
    properties: TODO_any,
    opts?: { waitForSync?: boolean }
  ): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/gharial",
        body: {
          ...properties,
          name: this._name
        },
        qs: opts
      },
      res => res.body.graph
    );
  }

  drop(dropCollections: boolean = false): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this._name}`,
        qs: { dropCollections }
      },
      res => res.body.removed
    );
  }

  vertexCollection<T extends object = any>(
    collectionName: string
  ): GraphVertexCollection<T> {
    return new GraphVertexCollection<T>(this._connection, collectionName, this);
  }

  listVertexCollections(opts?: {
    excludeOrphans?: boolean;
  }): Promise<string[]> {
    return this._connection.request(
      { path: `/_api/gharial/${this._name}/vertex`, qs: opts },
      res => res.body.collections
    );
  }

  async vertexCollections(opts?: {
    excludeOrphans?: boolean;
  }): Promise<GraphVertexCollection[]> {
    const names = await this.listVertexCollections(opts);
    return names.map(
      name => new GraphVertexCollection(this._connection, name, this)
    );
  }

  addVertexCollection(
    collection: string | ArangoCollection
  ): Promise<TODO_any> {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this._name}/vertex`,
        body: { collection }
      },
      res => res.body.graph
    );
  }

  removeVertexCollection(
    collection: string | ArangoCollection,
    dropCollection: boolean = false
  ): Promise<TODO_any> {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this._name}/vertex/${collection}`,
        qs: {
          dropCollection
        }
      },
      res => res.body.graph
    );
  }

  edgeCollection<T extends object = any>(
    collectionName: string
  ): GraphEdgeCollection<T> {
    return new GraphEdgeCollection<T>(this._connection, collectionName, this);
  }

  listEdgeCollections(): Promise<string[]> {
    return this._connection.request(
      { path: `/_api/gharial/${this._name}/edge` },
      res => res.body.collections
    );
  }

  async edgeCollections(): Promise<GraphEdgeCollection[]> {
    const names = await this.listEdgeCollections();
    return names.map(
      name => new GraphEdgeCollection(this._connection, name, this)
    );
  }

  addEdgeDefinition(definition: TODO_any): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this._name}/edge`,
        body: definition
      },
      res => res.body.graph
    );
  }

  replaceEdgeDefinition(
    definitionName: string,
    definition: TODO_any
  ): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this._name}/edge/${definitionName}`,
        body: definition
      },
      res => res.body.graph
    );
  }

  removeEdgeDefinition(
    definitionName: string,
    dropCollection: boolean = false
  ): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this._name}/edge/${definitionName}`,
        qs: {
          dropCollection
        }
      },
      res => res.body.graph
    );
  }

  traversal(startVertex: Selector, opts?: TODO_any): Promise<TODO_any> {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/traversal`,
        body: {
          ...opts,
          startVertex,
          graphName: this._name
        }
      },
      res => res.body.result
    );
  }
}
