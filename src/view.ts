import { Connection } from "./connection";

export enum ViewType {
  ARANGOSEARCH_VIEW = "arangosearch"
}

export interface ArangoView {
  isArangoView: true;
  name: string;
}

const VIEW_NOT_FOUND = 1203;
export abstract class BaseView implements ArangoView {
  isArangoView: true = true;
  name: string;
  abstract type: ViewType;
  protected _connection: Connection;

  constructor(connection: Connection, name: string) {
    this.name = name;
    this._connection = connection;
  }

  get() {
    return this._connection.request(
      { path: `/_api/view/${this.name}` },
      res => res.body
    );
  }

  exists() {
    return this.get().then(
      () => true,
      err => {
        if (err.errorNum !== VIEW_NOT_FOUND) {
          throw err;
        }
        return false;
      }
    );
  }

  create(properties: any = {}) {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/view",
        body: {
          properties,
          name: this.name,
          type: this.type
        }
      },
      res => res.body
    );
  }

  properties() {
    return this._connection.request(
      { path: `/_api/view/${this.name}/properties` },
      res => res.body
    );
  }

  setProperties(properties: any = {}) {
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/view/${this.name}/properties`,
        body: properties
      },
      res => res.body
    );
  }

  replaceProperties(properties: any = {}) {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/view/${this.name}/properties`,
        body: properties
      },
      res => res.body
    );
  }

  async rename(name: string) {
    const result = await this._connection.request(
      {
        method: "PUT",
        path: `/_api/view/${this.name}/rename`,
        body: { name }
      },
      res => res.body
    );
    this.name = name;
    return result;
  }

  drop() {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/view/${this.name}`
      },
      res => res.body
    );
  }
}

export class ArangoSearchView extends BaseView {
  type = ViewType.ARANGOSEARCH_VIEW;
}

export function constructView(connection: Connection, data: any): ArangoView {
  if (data.type && data.type !== ViewType.ARANGOSEARCH_VIEW) {
    throw new Error(`Unknown view type "${data.type}"`);
  }
  return new ArangoSearchView(connection, data.name);
}
