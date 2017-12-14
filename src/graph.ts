import {
  BaseCollection,
  DocumentHandle,
  EdgeCollection,
  Types
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

  async remove(documentHandle: DocumentHandle) {
    const res = await this._gharial.delete(
      `/${this._documentHandle(documentHandle)}`
    );
    return res.body.graph;
  }

  async vertex(documentHandle: DocumentHandle) {
    const res = await this._gharial.get(
      `/${this._documentHandle(documentHandle)}`
    );
    return res.body.graph;
  }

  async save(data: any) {
    const res = await this._gharial.post(this.name, data);
    return res.body.graph;
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

  async remove(documentHandle: DocumentHandle) {
    const res = await this._gharial.delete(
      `/${this._documentHandle(documentHandle)}`
    );
    return res.body.graph;
  }

  async edge(documentHandle: DocumentHandle) {
    const res = await this._gharial.get(
      `/${this._documentHandle(documentHandle)}`
    );
    return res.body.graph;
  }

  async save(data: any): Promise<any>;
  async save(
    data: any,
    fromId: DocumentHandle,
    toId: DocumentHandle
  ): Promise<any>;
  async save(data: any, fromId?: DocumentHandle, toId?: DocumentHandle) {
    if (fromId !== undefined) {
      data._from = this._documentHandle(fromId);
      data._to = this._documentHandle(toId!);
    }
    const res = await this._gharial.post(this.name, data);
    return res.body.graph;
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

  async create(properties: any) {
    const res = await this._api.post("/gharial", {
      ...properties,
      name: this.name
    });
    return res.body.graph;
  }

  async drop(dropCollections: boolean = false) {
    const res = await this._gharial.delete({ dropCollections });
    return res.body.graph;
  }

  vertexCollection(collectionName: string) {
    return new GraphVertexCollection(this._connection, collectionName, this);
  }

  async addVertexCollection(collectionName: string) {
    const res = await this._gharial.post("/vertex", {
      collection: collectionName
    });
    return res.body.graph;
  }

  async removeVertexCollection(
    collectionName: string,
    dropCollection: boolean = false
  ) {
    const res = await this._gharial.delete(`/vertex/${collectionName}`, {
      dropCollection
    });
    return res.body.graph;
  }

  edgeCollection(collectionName: string) {
    return new GraphEdgeCollection(this._connection, collectionName, this);
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
