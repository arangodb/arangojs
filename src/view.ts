import { ArangoResponseMetadata } from "./connection";
import { Database } from "./database";
import { isArangoError } from "./error";

export enum ViewType {
  ARANGOSEARCH_VIEW = "arangosearch"
}

export function isArangoView(view: any): view is View {
  return Boolean(view && view.isArangoView);
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
      }
  )[];
  links?: {
    [key: string]: ArangoSearchViewCollectionLink | undefined;
  };
};

const VIEW_NOT_FOUND = 1203;
export class View<
  PropertiesOptions extends object = any,
  PropertiesResponse extends object = any
> {
  isArangoView: true = true;
  name: string;
  protected _db: Database;

  /** @hidden */
  constructor(db: Database, name: string) {
    this.name = name;
    this._db = db;
  }

  get(): Promise<ViewResponse & ArangoResponseMetadata> {
    return this._db.request(
      { path: `/_api/view/${this.name}` },
      res => res.body
    );
  }

  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === VIEW_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  create(options?: PropertiesOptions): Promise<PropertiesResponse> {
    return this._db.request(
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

  async rename(name: string): Promise<ViewResponse & ArangoResponseMetadata> {
    const result = await this._db.request(
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

  properties(): Promise<PropertiesResponse & ArangoResponseMetadata> {
    return this._db.request(
      { path: `/_api/view/${this.name}/properties` },
      res => res.body
    );
  }

  setProperties(properties?: PropertiesOptions): Promise<PropertiesResponse> {
    return this._db.request(
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
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/view/${this.name}/properties`,
        body: properties || {}
      },
      res => res.body
    );
  }

  drop(): Promise<boolean> {
    return this._db.request(
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
