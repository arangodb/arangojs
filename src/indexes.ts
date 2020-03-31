export interface EnsureIndexHashOptions {
  type: "hash";
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  deduplicate?: boolean;
}

export interface EnsureIndexSkiplistOptions {
  type: "skiplist";
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  deduplicate?: boolean;
}

/** @deprecated ArangoDB 3.4 */
export interface EnsureIndexPersistentOptions {
  type: "persistent";
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
}

export interface EnsureIndexGeoOptions {
  type: "geo";
  fields: [string] | [string, string];
  name?: string;
  geoJson?: boolean;
}

export interface EnsureIndexFulltextOptions {
  type: "fulltext";
  fields: [string];
  name?: string;
  minLength?: number;
}

export interface EnsureIndexTtlOptions {
  type: "ttl";
  fields: [string];
  name?: string;
  expireAfter: number;
}

export interface GenericIndex {
  name?: string;
  id: string;
  sparse: boolean;
  unique: boolean;
}

export interface SkiplistIndex extends GenericIndex {
  type: "skiplist";
  fields: string[];
}

export interface HashIndex extends GenericIndex {
  type: "hash";
  fields: string[];
  selectivityEstimate: number;
}

export interface PrimaryIndex extends GenericIndex {
  type: "primary";
  fields: string[];
  selectivityEstimate: number;
}

export interface PersistentIndex extends GenericIndex {
  type: "persistent";
  fields: string[];
}

export interface FulltextIndex extends GenericIndex {
  type: "fulltext";
  fields: [string];
  minLength: number;
}

export interface GeoIndex extends GenericIndex {
  type: "geo";
  fields: [string] | [string, string];
  geoJson: boolean;
  bestIndexedLevel: number;
  worstIndexedLevel: number;
  maxNumCoverCells: number;
}

export interface TtlIndex extends GenericIndex {
  type: "ttl";
  fields: [string];
  expireAfter: number;
  selectivityEstimate: number;
}

export type Index =
  | GeoIndex
  | FulltextIndex
  | PersistentIndex
  | PrimaryIndex
  | HashIndex
  | SkiplistIndex
  | TtlIndex;

export type IndexSelector = string | Index;

/** @hidden @internal */
export function _indexHandle(
  selector: IndexSelector,
  collectionName: string
): string {
  if (typeof selector !== "string") {
    if (selector.id) {
      return _indexHandle(selector.id, collectionName);
    }
    throw new Error(
      "Index handle must be a string or an object with an id attribute"
    );
  }
  if (selector.includes("/")) {
    if (!selector.startsWith(`${collectionName}/`)) {
      throw new Error(
        `Index ID "${selector}" does not match collection name "${collectionName}"`
      );
    }
    return selector;
  }
  return `${collectionName}/${selector}`;
}
