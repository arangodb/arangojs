import { Connection } from "./connection";
import { isArangoError } from "./error";
import { ArangoResponseMetadata } from "./util/types";

export enum ViewType {
  ARANGOSEARCH_VIEW = "arangosearch"
}

export interface ArangoView {
  isArangoView: true;
  name: string;
}

export type ViewDescription = {
  globallyUniqueId: string;
  id: string;
  name: string;
  type: ViewType;
};

export type ViewResponse = {
  name: string;
  id: string;
  globallyUniqueId: string;
  type: ViewType;
};

export type ArangoSearchViewCollectionLink = {
  analyzers?: string[];
  fields?: { [key: string]: ArangoSearchViewCollectionLink | undefined };
  includeAllFields?: boolean;
  trackListPositions?: boolean;
  storeValues?: "none" | "id";
};

export type ArangoSearchViewProperties = {
  cleanupIntervalStep: number;
  consolidationIntervalMsec: number;
  writebufferIdle: number;
  writebufferActive: number;
  writebufferSizeMax: number;
  consolidationPolicy: {
    type: "bytes_accum" | "tier";
    threshold?: number;
    segments_min?: number;
    segments_max?: number;
    segments_bytes_max?: number;
    segments_bytes_floor?: number;
    lookahead?: number;
  };
  links: {
    [key: string]: ArangoSearchViewCollectionLink | undefined;
  };
};

export type ArangoSearchViewPropertiesResponse = ViewResponse &
  ArangoSearchViewProperties & {
    type: ViewType.ARANGOSEARCH_VIEW;
  };

export type ArangoSearchViewPropertiesOptions = {
  cleanupIntervalStep?: number;
  consolidationIntervalMsec?: number;
  commitIntervalMsec?: number;
  writebufferIdle?: number;
  writebufferActive?: number;
  writebufferSizeMax?: number;
  consolidationPolicy?:
    | {
        type: "bytes_accum";
        threshold?: number;
      }
    | {
        type: "tier";
        lookahead?: number;
        segments_min?: number;
        segments_max?: number;
        segments_bytes_max?: number;
        segments_bytes_floor?: number;
      };
  primarySort?: (
    | {
        field: string;
        direction: "desc" | "asc";
      }
    | {
        field: string;
        asc: boolean;
      })[];
  links?: {
    [key: string]: ArangoSearchViewCollectionLink | undefined;
  };
};

const VIEW_NOT_FOUND = 1203;
export class View<
  PropertiesOptions extends object = any,
  PropertiesResponse extends object = any
> implements ArangoView {
  isArangoView: true = true;
  name: string;
  protected _connection: Connection;

  constructor(connection: Connection, name: string) {
    this.name = name;
    this._connection = connection;
  }

  get(): Promise<ViewResponse & ArangoResponseMetadata> {
    return this._connection.request(
      { path: `/_api/view/${this.name}` },
      res => res.body
    );
  }

  exists(): Promise<boolean> {
    return this.get().then(
      () => true,
      err => {
        if (isArangoError(err) && err.errorNum === VIEW_NOT_FOUND) {
          return false;
        }
        throw err;
      }
    );
  }

  async rename(name: string): Promise<ViewResponse & ArangoResponseMetadata> {
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

  create(options?: PropertiesOptions): Promise<PropertiesResponse> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/view",
        body: {
          type: ViewType.ARANGOSEARCH_VIEW,
          ...(options || {}),
          name: this.name
        }
      },
      res => res.body
    );
  }

  properties(): Promise<PropertiesResponse & ArangoResponseMetadata> {
    return this._connection.request(
      { path: `/_api/view/${this.name}/properties` },
      res => res.body
    );
  }

  setProperties(properties?: PropertiesOptions): Promise<PropertiesResponse> {
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/view/${this.name}/properties`,
        body: properties || {}
      },
      res => res.body
    );
  }

  replaceProperties(
    properties?: PropertiesOptions
  ): Promise<PropertiesResponse> {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/view/${this.name}/properties`,
        body: properties || {}
      },
      res => res.body
    );
  }

  drop(): Promise<boolean> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/view/${this.name}`
      },
      res => res.body.result
    );
  }
}

export type ArangoSearchView = View<
  ArangoSearchViewPropertiesOptions,
  ArangoSearchViewPropertiesResponse
>;
