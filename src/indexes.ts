/**
 * TODO
 *
 * @packageDocumentation
 */

/**
 * TODO
 */
export type EnsureIndexHashOptions = {
  type: "hash";
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  deduplicate?: boolean;
};

/**
 * TODO
 */
export type EnsureIndexSkiplistOptions = {
  type: "skiplist";
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  deduplicate?: boolean;
};

/**
 * TODO
 */
export type EnsureIndexPersistentOptions = {
  type: "persistent";
  fields: string[];
  name?: string;
  unique?: boolean;
  sparse?: boolean;
};

/**
 * TODO
 */
export type EnsureIndexGeoOptions = {
  type: "geo";
  fields: [string] | [string, string];
  name?: string;
  geoJson?: boolean;
};

/**
 * TODO
 */
export type EnsureIndexFulltextOptions = {
  type: "fulltext";
  fields: [string];
  name?: string;
  minLength?: number;
};

/**
 * TODO
 */
export type EnsureIndexTtlOptions = {
  type: "ttl";
  fields: [string];
  name?: string;
  expireAfter: number;
};

/**
 * TODO
 */
export type GenericIndex = {
  name?: string;
  id: string;
  sparse: boolean;
  unique: boolean;
};

/**
 * (MMFiles only.) TODO
 *
 * When using the RocksDB storage engine, this index type behaves identically
 * to {@link PersistentIndex}.
 */
export type SkiplistIndex = GenericIndex & {
  type: "skiplist";
  fields: string[];
};

/**
 * (MMFiles only.) TODO
 *
 * When using the RocksDB storage engine, this index type behaves identically
 * to {@link PersistentIndex}.
 */
export type HashIndex = GenericIndex & {
  type: "hash";
  fields: string[];
  selectivityEstimate: number;
};

/**
 * TODO
 */
export type PrimaryIndex = GenericIndex & {
  type: "primary";
  fields: string[];
  selectivityEstimate: number;
};

/**
 * TODO
 */
export type PersistentIndex = GenericIndex & {
  type: "persistent";
  fields: string[];
};

/**
 * TODO
 */
export type FulltextIndex = GenericIndex & {
  type: "fulltext";
  fields: [string];
  minLength: number;
};

/**
 * TODO
 */
export type GeoIndex = GenericIndex & {
  type: "geo";
  fields: [string] | [string, string];
  geoJson: boolean;
  bestIndexedLevel: number;
  worstIndexedLevel: number;
  maxNumCoverCells: number;
};

/**
 * TODO
 */
export type TtlIndex = GenericIndex & {
  type: "ttl";
  fields: [string];
  expireAfter: number;
  selectivityEstimate: number;
};

/**
 * TODO
 */
export type Index =
  | GeoIndex
  | FulltextIndex
  | PersistentIndex
  | PrimaryIndex
  | HashIndex
  | SkiplistIndex
  | TtlIndex;

/**
 * TODO
 */
export type IndexSelector = string | Index;

/**
 * TODO
 *
 * @internal
 * @hidden
 */
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
