import {
  ArangoCollection,
  BaseCollection,
  DocumentHandle,
  EdgeCollection,
  Types,
  isArangoCollection
} from "./collection";

import { Connection } from "./connection";

export class GraphVertexCollection extends BaseCollection {
  type = Types.DOCUMENT_COLLECTION;

  graph: Graph;

  constructor(connection: Connection, name: string, graph: Graph) {
    super(connection, name);
    this.graph = graph;
  }

  protected _documentPath(documentHandle: DocumentHandle) {
    return `/document/${this._documentHandle(documentHandle)}`;
  }

  vertex(documentHandle: DocumentHandle) {
    return this._connection.request(
      {
        path: `/_api/gharial/${this.graph.name}/vertex/${this._documentHandle(
          documentHandle
        )}`
      },
      res => res.body.vertex
    );
  }

  save(data: any, opts?: { waitForSync?: boolean }) {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this.graph.name}/vertex/${this.name}`,
        body: data,
        qs: opts
      },
      res => res.body.vertex
    );
  }

  replace(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
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
        path: `/_api/gharial/${this.graph.name}/vertex/${this._documentHandle(
          documentHandle
        )}`,
        body: newValue,
        qs: opts,
        headers
      },
      res => res.body.vertex
    );
  }

  update(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
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
        path: `/_api/gharial/${this.graph.name}/vertex/${this._documentHandle(
          documentHandle
        )}`,
        body: newValue,
        qs: opts,
        headers
      },
      res => res.body.vertex
    );
  }

  remove(documentHandle: DocumentHandle, opts: any = {}) {
    const headers: { [key: string]: string } = {};
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
        path: `/_api/gharial/${this.graph.name}/vertex/${this._documentHandle(
          documentHandle
        )}`,
        qs: opts,
        headers
      },
      res => res.body.removed
    );
  }
}

export class GraphEdgeCollection extends EdgeCollection {
  type = Types.EDGE_COLLECTION;

  graph: Graph;

  constructor(connection: Connection, name: string, graph: Graph) {
    super(connection, name);
    this.type = Types.EDGE_COLLECTION;
    this.graph = graph;
  }

  edge(documentHandle: DocumentHandle) {
    return this._connection.request(
      {
        path: `/_api/gharial/${this.graph.name}/edge/${this._documentHandle(
          documentHandle
        )}`
      },
      res => res.body.edge
    );
  }

  save(data: any, opts?: { waitForSync?: boolean }): Promise<any>;
  save(
    data: any,
    fromId: DocumentHandle,
    toId: DocumentHandle,
    opts?: { waitForSync?: boolean }
  ): Promise<any>;
  save(
    data: any,
    fromId?: DocumentHandle | any,
    toId?: DocumentHandle,
    opts?: { waitForSync?: boolean }
  ) {
    if (fromId !== undefined) {
      if (toId !== undefined) {
        data._from = this._documentHandle(fromId);
        data._to = this._documentHandle(toId!);
      } else {
        opts = fromId;
      }
    }
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this.graph.name}/edge/${this.name}`,
        body: data,
        qs: opts
      },
      res => res.body.edge
    );
  }

  replace(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
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
        path: `/_api/gharial/${this.graph.name}/edge/${this._documentHandle(
          documentHandle
        )}`,
        body: newValue,
        qs: opts,
        headers
      },
      res => res.body.edge
    );
  }

  update(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
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
        path: `/_api/gharial/${this.graph.name}/edge/${this._documentHandle(
          documentHandle
        )}`,
        body: newValue,
        qs: opts,
        headers
      },
      res => res.body.edge
    );
  }

  remove(documentHandle: DocumentHandle, opts: any = {}) {
    const headers: { [key: string]: string } = {};
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
        path: `/_api/gharial/${this.graph.name}/edge/${this._documentHandle(
          documentHandle
        )}`,
        qs: opts,
        headers
      },
      res => res.body.removed
    );
  }
}

export class Graph {
  name: string;

  private _connection: Connection;

  constructor(connection: Connection, name: string) {
    this.name = name;
    this._connection = connection;
  }

  get() {
    return this._connection.request(
      { path: `/_api/gharial/${this.name}` },
      res => res.body.graph
    );
  }

  create(properties: any = {}, opts?: { waitForSync?: boolean }) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/gharial",
        body: {
          ...properties,
          name: this.name
        },
        qs: opts
      },
      res => res.body.graph
    );
  }

  drop(dropCollections: boolean = false) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this.name}`,
        qs: { dropCollections }
      },
      res => res.body.removed
    );
  }

  vertexCollection(collectionName: string) {
    return new GraphVertexCollection(this._connection, collectionName, this);
  }

  listVertexCollections(opts?: { excludeOrphans?: boolean }) {
    return this._connection.request(
      { path: `/_api/gharial/${this.name}/vertex`, qs: opts },
      res => res.body.collections
    );
  }

  async vertexCollections(opts?: { excludeOrphans?: boolean }) {
    const names = await this.listVertexCollections(opts);
    return names.map(
      (name: any) => new GraphVertexCollection(this._connection, name, this)
    );
  }

  addVertexCollection(collection: string | ArangoCollection) {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this.name}/vertex`,
        body: { collection }
      },
      res => res.body.graph
    );
  }

  removeVertexCollection(
    collection: string | ArangoCollection,
    dropCollection: boolean = false
  ) {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this.name}/vertex/${collection}`,
        qs: {
          dropCollection
        }
      },
      res => res.body.graph
    );
  }

  edgeCollection(collectionName: string) {
    return new GraphEdgeCollection(this._connection, collectionName, this);
  }

  listEdgeCollections() {
    return this._connection.request(
      { path: `/_api/gharial/${this.name}/edge` },
      res => res.body.collections
    );
  }

  async edgeCollections() {
    const names = await this.listEdgeCollections();
    return names.map(
      (name: any) => new GraphEdgeCollection(this._connection, name, this)
    );
  }

  addEdgeDefinition(definition: any) {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/gharial/${this.name}/edge`,
        body: definition
      },
      res => res.body.graph
    );
  }

  replaceEdgeDefinition(definitionName: string, definition: any) {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/gharial/${this.name}/edge/${definitionName}`,
        body: definition
      },
      res => res.body.graph
    );
  }

  removeEdgeDefinition(
    definitionName: string,
    dropCollection: boolean = false
  ) {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/gharial/${this.name}/edge/${definitionName}`,
        qs: {
          dropCollection
        }
      },
      res => res.body.graph
    );
  }

  traversal(startVertex: DocumentHandle, opts: any) {
    return this._connection.request(
      {
        method: "POST",
        path: `/_api/traversal`,
        body: {
          ...opts,
          startVertex,
          graphName: this.name
        }
      },
      res => res.body.result
    );
  }
}
