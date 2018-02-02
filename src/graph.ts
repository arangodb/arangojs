import {
  ArangoCollection,
  BaseCollection,
  DocumentHandle,
  EdgeCollection,
  Types,
  isArangoCollection
} from "./collection";

import { Connection } from "./connection";
import { Route } from "./route";

export class GraphVertexCollection extends BaseCollection {
  type = Types.DOCUMENT_COLLECTION;

  graph: Graph;

  private _gharial: Route;

  constructor(connection: Connection, name: string, graph: Graph) {
    super(connection, name);
    this.graph = graph;
    this._gharial = this._api.route(`/gharial/${this.graph.name}/vertex`);
  }

  protected _documentPath(documentHandle: DocumentHandle) {
    return `/document/${this._documentHandle(documentHandle)}`;
  }

  async vertex(documentHandle: DocumentHandle) {
    const res = await this._gharial.get(
      `/${this._documentHandle(documentHandle)}`
    );
    return res.body.vertex;
  }

  async save(data: any, opts?: { waitForSync?: boolean }) {
    const res = await this._gharial.post(this.name, data, opts);
    return res.body.vertex;
  }

  async replace(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    const res = await this._gharial.put(
      `/${this._documentHandle(documentHandle)}`,
      newValue,
      opts,
      headers
    );
    return res.body.vertex;
  }

  async update(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    const res = await this._gharial.patch(
      `/${this._documentHandle(documentHandle)}`,
      newValue,
      opts,
      headers
    );
    return res.body.vertex;
  }

  async remove(documentHandle: DocumentHandle, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    const res = await this._gharial.delete(
      `/${this._documentHandle(documentHandle)}`,
      opts,
      headers
    );
    return res.body.removed;
  }
}

export class GraphEdgeCollection extends EdgeCollection {
  type = Types.EDGE_COLLECTION;

  graph: Graph;

  private _gharial: Route;

  constructor(connection: Connection, name: string, graph: Graph) {
    super(connection, name);
    this.type = Types.EDGE_COLLECTION;
    this.graph = graph;
    this._gharial = this._api.route(`/gharial/${this.graph.name}/edge`);
  }

  async edge(documentHandle: DocumentHandle) {
    const res = await this._gharial.get(
      `/${this._documentHandle(documentHandle)}`
    );
    return res.body.edge;
  }

  async save(data: any, opts?: { waitForSync?: boolean }): Promise<any>;
  async save(
    data: any,
    fromId: DocumentHandle,
    toId: DocumentHandle,
    opts?: { waitForSync?: boolean }
  ): Promise<any>;
  async save(
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
    const res = await this._gharial.post(this.name, data, opts);
    return res.body.edge;
  }

  async replace(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    const res = await this._gharial.put(
      `/${this._documentHandle(documentHandle)}`,
      newValue,
      opts,
      headers
    );
    return res.body.edge;
  }

  async update(documentHandle: DocumentHandle, newValue: any, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    const res = await this._gharial.patch(
      `/${this._documentHandle(documentHandle)}`,
      newValue,
      opts,
      headers
    );
    return res.body.edge;
  }

  async remove(documentHandle: DocumentHandle, opts: any = {}) {
    const headers: { [key: string]: string } = {};
    if (typeof opts === "string") {
      opts = { rev: opts };
    }
    if (opts.rev) {
      let rev: string;
      ({ rev, ...opts } = opts);
      headers["if-match"] = rev;
    }
    const res = await this._gharial.delete(
      `/${this._documentHandle(documentHandle)}`,
      opts,
      headers
    );
    return res.body.removed;
  }
}

export class Graph {
  name: string;

  private _connection: Connection;
  private _api: Route;
  private _gharial: Route;

  constructor(connection: Connection, name: string) {
    this.name = name;
    this._connection = connection;
    this._api = this._connection.route("/_api");
    this._gharial = this._api.route(`/gharial/${this.name}`);
  }

  async get() {
    const res = await this._gharial.get();
    return res.body.graph;
  }

  async create(properties: any = {}, opts?: { waitForSync?: boolean }) {
    const res = await this._api.post(
      "/gharial",
      {
        ...properties,
        name: this.name
      },
      opts
    );
    return res.body.graph;
  }

  async drop(dropCollections: boolean = false) {
    const res = await this._gharial.delete({ dropCollections });
    return res.body.removed;
  }

  vertexCollection(collectionName: string) {
    return new GraphVertexCollection(this._connection, collectionName, this);
  }

  async listVertexCollections(opts?: { excludeOrphans?: boolean }) {
    const res = await this._gharial.get("/vertex", opts);
    return res.body.collections;
  }

  async vertexCollections(opts?: { excludeOrphans?: boolean }) {
    const names = await this.listVertexCollections(opts);
    return names.map(
      (name: any) => new GraphVertexCollection(this._connection, name, this)
    );
  }

  async addVertexCollection(collection: string | ArangoCollection) {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    const res = await this._gharial.post("/vertex", {
      collection
    });
    return res.body.graph;
  }

  async removeVertexCollection(
    collection: string | ArangoCollection,
    dropCollection: boolean = false
  ) {
    if (isArangoCollection(collection)) {
      collection = collection.name;
    }
    const res = await this._gharial.delete(`/vertex/${collection}`, {
      dropCollection
    });
    return res.body.graph;
  }

  edgeCollection(collectionName: string) {
    return new GraphEdgeCollection(this._connection, collectionName, this);
  }

  async listEdgeCollections() {
    const res = await this._gharial.get("/edge");
    return res.body.collections;
  }

  async edgeCollections() {
    const names = await this.listEdgeCollections();
    return names.map(
      (name: any) => new GraphEdgeCollection(this._connection, name, this)
    );
  }

  async addEdgeDefinition(definition: any) {
    const res = await this._gharial.post("/edge", definition);
    return res.body.graph;
  }

  async replaceEdgeDefinition(definitionName: string, definition: any) {
    const res = await this._gharial.put(`/edge/${definitionName}`, definition);
    return res.body.graph;
  }

  async removeEdgeDefinition(
    definitionName: string,
    dropCollection: boolean = false
  ) {
    const res = await this._gharial.delete(`edge/${definitionName}`, {
      dropCollection
    });
    return res.body.graph;
  }

  async traversal(startVertex: DocumentHandle, opts: any) {
    const res = await this._api.post("/traversal", {
      ...opts,
      startVertex,
      graphName: this.name
    });
    return res.body.result;
  }
}
