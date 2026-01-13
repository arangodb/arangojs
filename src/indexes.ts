/**
 * ```ts
 * import type {
 *   FulltextIndex,
 *   GeoIndex,
 *   MdiIndex,
 *   PersistentIndex,
 *   PrimaryIndex,
 *   TtlIndex,
 * } from "arangojs/indexes";
 * ```
 *
 * The "indexes" module provides index-related types for TypeScript.
 *
 * @packageDocumentation
 */

import * as analyzers from "./analyzers.js";
import * as views from "./views.js";

//#region Shared types
/**
 * Type of an index.
 */
export type IndexType = IndexDescription["type"];

/**
 * Type of an internal index.
 */
export type InternalIndexType = InternalIndexDescription["type"];
//#endregion

//#region Index operation options
/**
 * Options for listing indexes.
 */
export type ListIndexesOptions = {
  /**
   * If set to `true`, includes additional information about each index.
   *
   * Default: `false`
   */
  withStats?: boolean;
  /**
   * If set to `true`, includes internal indexes as well as indexes that are
   * not yet fully built but are in the building phase.
   *
   * You should cast the resulting indexes to `HiddenIndex` to ensure internal
   * and incomplete indexes are accurately represented.
   *
   * Default: `false`.
   */
  withHidden?: boolean;
};

/**
 * Options for creating an index.
 */
export type EnsureIndexOptions =
  | EnsurePersistentIndexOptions
  | EnsureGeoIndexOptions
  | EnsureTtlIndexOptions
  | EnsureMdiIndexOptions
  | EnsureMdiPrefixedIndexOptions
  | EnsureInvertedIndexOptions
  | EnsureVectorIndexOptions;

/**
 * Shared attributes of all index creation options.
 */
export type EnsureIndexOptionsType<
  Type extends IndexType,
  Fields extends any[],
  Extra extends {} = {},
> = {
  /**
   * A unique name for this index.
   */
  name?: string;
  /**
   * Type of this index.
   */
  type: Type;
  /**
   * An array of attribute paths.
   */
  fields: Fields;
  /**
   * If set to `true`, the index will be created in the background to reduce
   * the write-lock duration for the collection during index creation.
   *
   * Default: `false`
   */
  inBackground?: boolean;
} & Extra;

/**
 * Options for creating a persistent index.
 */
export type EnsurePersistentIndexOptions = EnsureIndexOptionsType<
  "persistent",
  string[],
  {
    /**
     * If set to `true`, a unique index will be created.
     *
     * Default: `false`
     */
    unique?: boolean;
    /**
     * If set to `true`, the index will omit documents that do not contain at
     * least one of the attribute paths in `fields` and these documents will be
     * ignored for uniqueness checks.
     *
     * Default: `false`
     */
    sparse?: boolean;
    /**
     * If set to `false`, inserting duplicate index values from the same
     * document will lead to a unique constraint error if this is a unique index.
     *
     * Default: `true`
     */
    deduplicate?: boolean;
    /**
     * If set to `false`, index selectivity estimates will be disabled for this
     * index.
     *
     * Default: `true`
     */
    estimates?: boolean;
    /**
     * If set to `true`, an in-memory hash cache will be put in front of the
     * persistent index.
     *
     * Default: `false`
     */
    cacheEnabled?: boolean;
    /**
     * An array of attribute paths that will be stored in the index but can not
     * be used for index lookups or sorting but can avoid full document lookups.
     */
    storedValues?: string[];
  }
>;

/**
 * Options for creating a geo index.
 */
export type EnsureGeoIndexOptions = EnsureIndexOptionsType<
  "geo",
  [string, string] | [string],
  {
    /**
     * If set to `true`, `fields` must be an array containing a single attribute
     * path and the attribute value must be an array with two values, the first
     * of which will be interpreted as the longitude and the second of which
     * will be interpreted as the latitude of the document.
     *
     * If set to `false`, `fields` can be either an array containing two
     * attribute paths, the first of which will be interpreted as the latitude
     * and the second as the longitude, or a single attribute path for an array
     * containing two values, the first of which will be interpreted as the
     * latitude, the second as the longitude.
     *
     * Default: `false`
     */
    geoJson?: boolean;
    /**
     * If set to `true`, the index will use pre-3.10 rules for parsing
     * GeoJSON polygons. This option is always implicitly `true` when using
     * ArangoDB 3.9 or lower.
     */
    legacyPolygons?: boolean;
  }
>;

/**
 * Options for creating a TTL index.
 */
export type EnsureTtlIndexOptions = EnsureIndexOptionsType<
  "ttl",
  [string],
  {
    /**
     * Duration in seconds after the attribute value at which the document will
     * be considered as expired.
     */
    expireAfter: number;
  }
>;

/**
 * Options for creating a MDI index.
 */
export type EnsureMdiIndexOptions = EnsureIndexOptionsType<
  "mdi",
  string[],
  {
    /**
     * Data type of the dimension attributes.
     */
    fieldValueTypes: "double";
    /**
     * If set to `true`, a unique index will be created.
     *
     * Default: `false`
     */
    unique?: boolean;
    /**
     * If set to `true`, the index will omit documents that do not contain at
     * least one of the attribute paths in `fields` and these documents will be
     * ignored for uniqueness checks.
     *
     * Default: `false`
     */
    sparse?: boolean;
    /**
     * If set to `false`, index selectivity estimates will be disabled for this
     * index.
     *
     * Default: `true`
     */
    estimates?: boolean;
    /**
     * An array of attribute paths that will be stored in the index but can not
     * be used for index lookups or sorting but can avoid full document lookups.
     */
    storedValues?: string[];
  }
>;

/**
 * Options for creating a prefixed MDI index.
 */
export type EnsureMdiPrefixedIndexOptions = EnsureIndexOptionsType<
  "mdi-prefixed",
  string[],
  {
    /**
     * An array of attribute names used as a search prefix.
     */
    prefixFields: string[];
    /**
     * Data type of the dimension attributes.
     */
    fieldValueTypes: "double";
    /**
     * If set to `true`, a unique index will be created.
     *
     * Default: `false`
     */
    unique?: boolean;
    /**
     * If set to `true`, the index will omit documents that do not contain at
     * least one of the attribute paths in `fields` and these documents will be
     * ignored for uniqueness checks.
     *
     * Default: `false`
     */
    sparse?: boolean;
    /**
     * If set to `false`, index selectivity estimates will be disabled for this
     * index.
     *
     * Default: `true`
     */
    estimates?: boolean;
    /**
     * An array of attribute paths that will be stored in the index but can not
     * be used for index lookups or sorting but can avoid full document lookups.
     */
    storedValues?: string[];
  }
>;

/**
 * Options for creating an inverted index.
 */
export type EnsureInvertedIndexOptions = EnsureIndexOptionsType<
  "inverted",
  (string | InvertedIndexFieldOptions)[],
  {
    /**
     * If set to `true` array values will by default be indexed using the same
     * behavior as ArangoSearch Views. This option only applies when using the
     * index in a SearchAlias View.
     *
     * Default: `false`
     */
    searchField?: boolean;
    /**
     * An array of attribute paths that will be stored in the index but can not
     * be used for index lookups or sorting but can avoid full document lookups.
     */
    storedValues?: InvertedIndexStoredValueOptions[];
    /**
     * Primary sort order to optimize AQL queries using a matching sort order.
     */
    primarySort?: InvertedIndexPrimarySortOptions;
    /**
     * (Enterprise Edition only.) If set to `true`, then the primary key column
     * will always be cached in memory.
     *
     * Default: `false`
     */
    primaryKeyCache?: boolean;
    /**
     * Name of the default Analyzer to apply to the values of indexed fields.
     *
     * Default: `"identity"`
     */
    analyzer?: string;
    /**
     * List of Analyzer features to enable for the default Analyzer.
     *
     * Defaults to the Analyzer's features.
     */
    features?: analyzers.AnalyzerFeature[];
    /**
     * If set to `true`, all document attributes are indexed, excluding any
     * sub-attributes configured in the `fields` array. The `analyzer` and
     * `features` properties apply to the sub-attributes. This option only
     * applies when using the index in a SearchAlias View.
     *
     * Default: `false`
     */
    includeAllFields?: boolean;
    /**
     * If set to `true`, the position of values in array values are tracked and
     * need to be specified in queries. Otherwise all values in an array are
     * treated as equivalent. This option only applies when using the index in a
     * SearchAlias View.
     *
     * Default: `false`
     */
    trackListPositions?: boolean;
    /**
     * The number of threads to use for indexing the fields.
     *
     * Default: `2`
     */
    parallelism?: number;
    /**
     * Wait at least this many commits between removing unused files in the
     * ArangoSearch data directory.
     *
     * Default: `2`
     */
    cleanupIntervalStep?: number;
    /**
     * Wait at least this many milliseconds between committing View data store
     * changes and making documents visible to queries.
     *
     * Default: `1000`
     */
    commitIntervalMsec?: number;
    /**
     * Wait at least this many milliseconds between applying
     * `consolidationPolicy` to consolidate View data store and possibly release
     * space on the filesystem.
     *
     * Default: `1000`
     */
    consolidationIntervalMsec?: number;
    /**
     * The consolidation policy to apply for selecting which segments should be
     * merged.
     *
     * Default: `{ type: "tier" }`
     */
    consolidationPolicy?: views.TierConsolidationPolicy;
    /**
     * Maximum number of writers (segments) cached in the pool.
     *
     * Default: `64`
     */
    writeBufferIdle?: number;
    /**
     * Maximum number of concurrent active writers (segments) that perform a
     * transaction.
     *
     * Default: `0` (disabled)
     */
    writeBufferActive?: number;
    /**
     * Maximum memory byte size per writer (segment) before a writer (segment)
     * flush is triggered.
     *
     * Default: `33554432` (32 MiB)
     */
    writeBufferSizeMax?: number;
    /**
     * (Enterprise Edition only.) If set to `true`, then field normalization
     * values will always be cached in memory.
     *
     * Default: `false`
     */
    cache?: boolean;
    /**
     * An array of strings defining sort expressions to optimize.
     */
    optimizeTopK?: string[];
  }
>;

/**
 * Options for an attribute path in an inverted index.
 */
export type InvertedIndexFieldOptions = {
  /**
   * An attribute path.
   */
  name: string;
  /**
   * Name of the Analyzer to apply to the values of this field.
   *
   * Defaults to the `analyzer` specified on the index itself.
   */
  analyzer?: string;
  /**
   * List of Analyzer features to enable for this field's Analyzer.
   *
   * Defaults to the features of the Analyzer.
   */
  features?: analyzers.AnalyzerFeature[];
  /**
   * If set to `true`, all document attributes are indexed, excluding any
   * sub-attributes configured in the `fields` array. The `analyzer` and
   * `features` properties apply to the sub-attributes. This option only
   * applies when using the index in a SearchAlias View.
   *
   * Defaults to the value of `includeAllFields` specified on the index itself.
   */
  includeAllFields?: boolean;
  /**
   * If set to `true` array values will be indexed using the same behavior as
   * ArangoSearch Views. This option only applies when using the index in a
   * SearchAlias View.
   *
   * Defaults to the value of `searchField` specified on the index itself.
   */
  searchField?: boolean;
  /**
   * If set to `true`, the position of values in array values are tracked and
   * need to be specified in queries. Otherwise all values in an array are
   * treated as equivalent. This option only applies when using the index in a
   * SearchAlias View.
   *
   * Defaults to the value of `trackListPositions` specified on the index
   * itself.
   */
  trackListPositions?: boolean;
  /**
   * (Enterprise Edition only.) Sub-objects to index to allow querying for
   * co-occurring values.
   */
  nested?: (string | InvertedIndexNestedFieldOptions)[];
  /**
   * (Enterprise Edition only.) If set to `true`, then field normalization
   * values will always be cached in memory.
   *
   * Defaults to the value of `cache` specified on the index itself.
   */
  cache?: boolean;
};

/**
 * Options for defining a primary sort field on an inverted index.
 */
export type InvertedIndexPrimarySortOptions = {
  /**
   * An array of fields to sort the index by.
   */
  fields: InvertedIndexPrimarySortFieldOptions[];
  /**
   * How the primary sort data should be compressed.
   *
   * Default: `"lz4"`
   */
  compression?: views.Compression;
  /**
   * (Enterprise Edition only.) If set to `true`, then primary sort columns
   * will always be cached in memory.
   *
   * Default: `false`
   */
  cache?: boolean;
};

/**
 * Options for defining a primary sort field on an inverted index.
 */
export type InvertedIndexPrimarySortFieldOptions = {
  /**
   * The attribute path to sort by.
   */
  field: string;
  /**
   * The sorting direction.
   */
  direction: views.Direction;
};

/**
 * (Enterprise Edition only.) Options for a nested field in an inverted index.
 */
export type InvertedIndexNestedFieldOptions = {
  /**
   * An attribute path.
   */
  name: string;
  /**
   * Name of the Analyzer to apply to the values of this field.
   *
   * Defaults to the `analyzer` specified on the parent options or on the index
   * itself.
   */
  analyzer?: string;
  /**
   * List of Analyzer features to enable for this field's Analyzer.
   *
   * Defaults to the features of the Analyzer.
   */
  features?: analyzers.AnalyzerFeature[];
  /**
   * If set to `true` array values will be indexed using the same behavior as
   * ArangoSearch Views. This option only applies when using the index in a
   * SearchAlias View.
   *
   * Defaults to the value of `searchField` specified on the index itself.
   */
  searchField?: boolean;
  /**
   * Sub-objects to index to allow querying for co-occurring values.
   */
  nested?: (string | InvertedIndexNestedFieldOptions)[];
};

/**
 * Options for defining a stored value on an inverted index.
 */
export type InvertedIndexStoredValueOptions = {
  /**
   * The attribute paths to store.
   */
  fields: string[];
  /**
   * How the attribute values should be compressed.
   *
   * Default: `"lz4"`
   */
  compression?: views.Compression;
  /**
   * (Enterprise Edition only.) If set to `true`, then stored values will
   * always be cached in memory.
   *
   * Default: `false`
   */
  cache?: boolean;
};

/**
 * Options for creating a vector index.
 */
export type EnsureVectorIndexOptions = EnsureIndexOptionsType<
  "vector",
  [string],
  {
    /**
     * The number of threads to use for indexing. Default is 2.
     */
    parallelism?: number;

    /**
     * An array of attribute paths that will be stored in the index for
     * efficient filtering. Unlike with other index types, this is not for
     * covering projections with the index but for adding attributes that
     * you filter on. This lets you make the lookup in the vector index
     * more efficient because it avoids materializing documents twice,
     * once for the filtering and once for the matches.
     *
     * The maximum number of attributes that you can use in storedValues is 32.
     *
     * Introduced in: ArangoDB 3.12.7
     */
    storedValues?: string[];

    /**
     * Vector index parameters, following Faiss configuration.
     */
    params: {
      /**
       * Whether to use cosine, l2 (Euclidean), or innerProduct distance.
       * innerProduct was introduced in ArangoDB 3.12.6.
       */
      metric: "cosine" | "l2" | "innerProduct";

      /**
       * Vector dimension. Must match the length of vectors in documents.
       */
      dimension: number;

      /**
       * Number of Voronoi cells (centroids) for IVF. Affects accuracy and index build time.
       */
      nLists: number;

      /**
       * How many neighboring centroids to probe by default. Higher = slower, better recall.
       */
      defaultNProbe?: number;

      /**
       * Training iterations for index build. Default is 25.
       */
      trainingIterations?: number;

      /**
       * Advanced Faiss index factory string.
       * If not specified, defaults to IVF<nLists>,Flat.
       */
      factory?: string;
    };
  }
>;
//#endregion

//#region IndexDescription
/**
 * An object representing an index.
 */
export type IndexDescription =
  | FulltextIndexDescription
  | GeoIndexDescription
  | PersistentIndexDescription
  | TtlIndexDescription
  | MdiIndexDescription
  | MdiPrefixedIndexDescription
  | InvertedIndexDescription
  | SystemIndexDescription
  | VectorIndexDescription;

/**
 * An object representing a system index.
 */
export type SystemIndexDescription =
  | PrimaryIndexDescription
  | EdgeIndexDescription;

/**
 * Shared attributes of all index types.
 */
export type IndexDescriptionType<
  Type extends string,
  Fields extends any[],
  Extra extends {} = {},
> = {
  /**
   * A unique name for this index.
   */
  name: string;
  /**
   * A unique identifier for this index.
   */
  id: string;
  /**
   * Type of this index.
   */
  type: Type;
  /**
   * An array of attribute paths.
   */
  fields: Fields;
  /**
   * Whether documents not containing at least one of the attribute paths
   * are omitted by this index.
   */
  sparse: boolean;
  /**
   * Whether this index enforces uniqueness for values of its attribute paths.
   */
  unique: boolean;
  /**
   * Additional stats about this index.
   */
  figures?: Record<string, any>;
} & Extra;

/**
 * An object representing a persistent index.
 */
export type PersistentIndexDescription = IndexDescriptionType<
  "persistent",
  string[],
  {
    cacheEnabled: boolean;
    deduplicate: boolean;
    estimates: boolean;
    selectivityEstimate: number;
    storedValues?: string[];
  }
>;

/**
 * An object representing a primary index.
 */
export type PrimaryIndexDescription = IndexDescriptionType<
  "primary",
  ["_key"],
  {
    selectivityEstimate: number;
  }
>;

/**
 * An object representing an edge index.
 */
export type EdgeIndexDescription = IndexDescriptionType<
  "edge",
  ["_from", "_to"],
  {
    selectivityEstimate: number;
  }
>;

/**
 * An object representing a fulltext index.
 *
 * @deprecated The `fulltext` index type was deprecated in ArangoDB 3.10. Use
 * {@link views.View}s instead.
 */
export type FulltextIndexDescription = IndexDescriptionType<
  "fulltext",
  [string],
  {
    minLength: number;
  }
>;

/**
 * An object representing an edge index.
 */
export type EdgeIndex = IndexDescriptionType<
  "edge",
  ["_from", "_to"],
  {
    selectivityEstimate: number;
  }
>;

/**
 * An object representing a fulltext index.
 *
 * @deprecated The `fulltext` index type was deprecated in ArangoDB 3.10. Use
 * {@link views.View} instead.
 */
export type FulltextIndex = IndexDescriptionType<
  "fulltext",
  [string],
  {
    minLength: number;
  }
>;

/**
 * An object representing a geo index.
 */
export type GeoIndexDescription = IndexDescriptionType<
  "geo",
  [string] | [string, string],
  {
    geoJson: boolean;
    legacyPolygons: boolean;
    bestIndexedLevel: number;
    worstIndexedLevel: number;
    maxNumCoverCells: number;
  }
>;

/**
 * An object representing a TTL index.
 */
export type TtlIndexDescription = IndexDescriptionType<
  "ttl",
  [string],
  {
    expireAfter: number;
    estimates: boolean;
    selectivityEstimate: number;
  }
>;

/**
 * An object representing a MDI index.
 */
export type MdiIndexDescription = IndexDescriptionType<
  "mdi",
  string[],
  {
    fieldValueTypes: "double";
    estimates: boolean;
    selectivityEstimate: number;
    storedValues?: string[];
  }
>;

/**
 * An object representing a prefixed MDI index.
 */
export type MdiPrefixedIndexDescription = IndexDescriptionType<
  "mdi-prefixed",
  string[],
  {
    fieldValueTypes: "double";
    estimates: boolean;
    selectivityEstimate: number;
    storedValues?: string[];
    prefixFields: string[];
  }
>;

/**
 * An object representing an inverted index.
 */
export type InvertedIndexDescription = IndexDescriptionType<
  "inverted",
  InvertedIndexField[],
  {
    searchField: boolean;
    cache?: boolean;
    storedValues: {
      fields: string[];
      compression: views.Compression;
      cache?: boolean;
    }[];
    primarySort: {
      fields: {
        field: string;
        direction: views.Direction;
      }[];
      compression: views.Compression;
      cache?: boolean;
    };
    primaryKeyCache?: boolean;
    analyzer: string;
    features: analyzers.AnalyzerFeature[];
    includeAllFields: boolean;
    trackListPositions: boolean;
    parallelism: number;
    cleanupIntervalStep: number;
    commitIntervalMsec: number;
    consolidationIntervalMsec: number;
    consolidationPolicy: Required<views.TierConsolidationPolicy>;
    writeBufferIdle: number;
    writeBufferActive: number;
    writeBufferSizeMax: number;
    optimizeTopK: string[];
  }
>;

/**
 * An object representing a field in an inverted index.
 */
export type InvertedIndexField = {
  name: string;
  analyzer?: string;
  features?: analyzers.AnalyzerFeature[];
  includeAllFields?: boolean;
  searchField?: boolean;
  trackListPositions?: boolean;
  nested?: InvertedIndexNestedField[];
  cache?: boolean;
};

/**
 * (Enterprise Edition only.) An object representing a nested field in an
 * inverted index.
 */
export type InvertedIndexNestedField = {
  name: string;
  analyzer?: string;
  features?: analyzers.AnalyzerFeature[];
  searchField?: boolean;
  nested?: InvertedIndexNestedField[];
};

/**
 * An object representing an arangosearch index.
 */
export type ArangosearchIndexDescription = {
  id: string;
  type: "arangosearch";
  view: string;
  figures?: Record<string, any>;
  analyzers: string[];
  fields: Record<string, Record<string, any>>;
  includeAllFields: boolean;
  trackListPositions: boolean;
  storeValues: "none" | "id";
};

/**
 * An object representing an internal index.
 */
export type InternalIndexDescription = ArangosearchIndexDescription;

/**
 * An object representing a potentially hidden index.
 *
 * This type can be used to cast the result of `collection.indexes` to better
 * reflect the actual data returned by the server when using the `withHidden`
 * option:
 *
 * ```ts
 * const indexes = await collection.indexes<HiddenIndex>({
 *   withHidden: true
 * }));
 * // indexes may include internal indexes and indexes with a "progress"
 * // property
 * ```
 */
export type HiddenIndexDescription = (
  | IndexDescription
  | InternalIndexDescription
) & {
  /**
   * Progress of this index if it is still being created.
   */
  progress?: number;
};

/**
 * An object representing a vector index.
 */
export type VectorIndexDescription = IndexDescriptionType<
  "vector",
  [string],
  {
    parallelism: number;
    inBackground: boolean;
    /**
     * An array of attribute paths that are stored in the index for
     * efficient filtering.
     *
     * Introduced in: ArangoDB 3.12.7
     */
    storedValues?: string[];
    params: {
      metric: "cosine" | "l2" | "innerProduct";
      dimension: number;
      nLists: number;
      defaultNProbe?: number;
      trainingIterations?: number;
      factory?: string;
    };
  }
>;
//#endregion

//#region Index selectors
/**
 * Index name, id or object with a `name` or `id` property.
 */
export type IndexSelector = ObjectWithIndexId | ObjectWithName | string;

/**
 * An object with an `id` property.
 */
export type ObjectWithIndexId = {
  [key: string]: any;
  id: string;
};

/**
 * An object with a `name` property.
 */
export type ObjectWithName = {
  [key: string]: any;
  name: string;
};

/**
 * @internal
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
    const [head] = selector.split("/");
    if (head !== collectionName) {
      throw new Error(
        `Index ID "${selector}" does not match collection name "${collectionName}"`
      );
    }
    return selector;
  }
  return `${collectionName}/${String(selector)}`;
}
//#endregion
