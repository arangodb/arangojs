export type EnsureIndexHashOptions = {
  type: "hash";
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  deduplicate?: boolean;
};

export type EnsureIndexSkiplistOptions = {
  type: "skiplist";
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  deduplicate?: boolean;
};

/** @deprecated ArangoDB 3.4 */
export type EnsureIndexPersistentOptions = {
  type: "persistent";
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
};

export type EnsureIndexGeoOptions = {
  type: "geo";
  fields: [string] | [string, string];
  name?: string;
  geoJson?: boolean;
};

export type EnsureIndexFulltextOptions = {
  type: "fulltext";
  fields: [string];
  name?: string;
  minLength?: number;
};

export type EnsureIndexTtlOptions = {
  type: "ttl";
  fields: [string];
  name?: string;
  expireAfter: number;
};

export type GenericIndex = {
  name?: string;
  id: string;
  sparse: boolean;
  unique: boolean;
};

export type SkiplistIndex = GenericIndex & {
  type: "skiplist";
  fields: string[];
};

export type HashIndex = GenericIndex & {
  type: "hash";
  fields: string[];
  selectivityEstimate: number;
};

export type PrimaryIndex = GenericIndex & {
  type: "primary";
  fields: string[];
  selectivityEstimate: number;
};

export type PersistentIndex = GenericIndex & {
  type: "persistent";
  fields: string[];
};

export type FulltextIndex = GenericIndex & {
  type: "fulltext";
  fields: [string];
  minLength: number;
};

export type GeoIndex = GenericIndex & {
  type: "geo";
  fields: [string] | [string, string];
  geoJson: boolean;
  bestIndexedLevel: number;
  worstIndexedLevel: number;
  maxNumCoverCells: number;
};

export type TtlIndex = GenericIndex & {
  type: "ttl";
  fields: [string];
  expireAfter: number;
  selectivityEstimate: number;
};

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
