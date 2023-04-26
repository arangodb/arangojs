/**
 * ```ts
 * import type { ArangoSearchView } from "arangojs/view";
 * ```
 *
 * The "view" module provides View related types and interfaces for TypeScript.
 *
 * @packageDocumentation
 */
import { ArangoApiResponse } from "./connection";
import { Database } from "./database";
import { isArangoError } from "./error";
import { VIEW_NOT_FOUND } from "./lib/codes";

/**
 * Indicates whether the given value represents a {@link View}.
 *
 * @param view - A value that might be a View.
 */
export function isArangoView(view: any): view is View {
  return Boolean(view && view.isArangoView);
}

/**
 * Sorting direction. Descending or ascending.
 */
export type Direction = "desc" | "asc";

/**
 * Policy to consolidate based on segment byte size and live document count as
 * dictated by the customization attributes.
 *
 * @deprecated The `bytes_accum` consolidation policy was deprecated in
 * ArangoDB 3.7 and should be replaced with the `tier` consolidation policy.
 */
export type BytesAccumConsolidationPolicy = {
  /**
   * Type of consolidation policy.
   */
  type: "bytes_accum";
  /**
   * Must be in the range of `0.0` to `1.0`.
   */
  threshold?: number;
};

/**
 * Policy to consolidate if the sum of all candidate segment byte size is less
 * than the total segment byte size multiplied by a given threshold.
 */
export type TierConsolidationPolicy = {
  /**
   * Type of consolidation policy.
   */
  type: "tier";
  /**
   * Size below which all segments are treated as equivalent.
   *
   * Default: `2097152` (2 MiB)
   */
  segmentsBytesFloor?: number;
  /**
   * Maximum allowed size of all consolidation segments.
   *
   * Default: `5368709120` (5 GiB)
   */
  segmentsBytesMax?: number;
  /**
   * Maximum number of segments that are evaluated as candidates for
   * consolidation.
   *
   * Default: `10`
   */
  segmentsMax?: number;
  /**
   * Minimum number of segments that are evaluated as candidates for
   * consolidation.
   *
   * Default: `1`
   */
  segmentsMin?: number;
  /**
   * Consolidation candidates with a score less than this value will be
   * filtered out.
   *
   * Default: `0`
   */
  minScore?: number;
};

/**
 * Compression for storing data.
 */
export type Compression = "lz4" | "none";

/**
 * Options for creating a View.
 */
export type CreateViewOptions =
  | CreateArangoSearchViewOptions
  | CreateSearchAliasViewOptions;

/**
 * Options for replacing a View's properties.
 */
export type ViewPropertiesOptions =
  | ArangoSearchViewPropertiesOptions
  | SearchAliasViewPropertiesOptions;

/**
 * Options for partially modifying a View's properties.
 */
export type ViewPatchPropertiesOptions =
  | ArangoSearchViewPropertiesOptions
  | SearchAliasViewPatchPropertiesOptions;

/**
 * A link definition for an ArangoSearch View.
 */
export type ArangoSearchViewLinkOptions = {
  /**
   * A list of names of Analyzers to apply to values of processed document
   * attributes.
   *
   * Default: `["identity"]`
   */
  analyzers?: string[];
  /**
   * An object mapping names of attributes to process for each document to
   * {@link ArangoSearchViewLinkOptions} definitions.
   */
  fields?: Record<string, ArangoSearchViewLinkOptions>;
  /**
   * If set to `true`, all document attributes will be processed, otherwise
   * only the attributes in `fields` will be processed.
   *
   * Default: `false`
   */
  includeAllFields?: boolean;
  /**
   * (Enterprise Edition only.) An object mapping attribute names to
   * {@link ArangoSearchViewLinkOptions} definitions to index sub-objects
   * stored in an array.
   */
  nested?: Record<string, ArangoSearchViewLinkOptions>;
  /**
   * If set to `true`, the position of values in array values will be tracked,
   * otherwise all values in an array will be treated as equal alternatives.
   */
  trackListPositions?: boolean;
  /**
   * Controls how the view should keep track of the attribute values.
   *
   * Default: `"none"`
   */
  storeValues?: "none" | "id";
  /**
   * If set to `true`, then no exclusive lock is used on the source collection
   * during View index creation, so that it remains basically available.
   *
   * Default: `false`
   */
  inBackground?: boolean;
  /**
   * (Enterprise Edition only.) If set to `true`, then field normalization
   * values are always cached in memory.
   *
   * Default: `false`
   */
  cache?: boolean;
};

/**
 * Options for modifying the properties of an ArangoSearch View.
 */
export type ArangoSearchViewPropertiesOptions = {
  /**
   * How many commits to wait between removing unused files.
   *
   * Default: `2`
   */
  cleanupIntervalStep?: number;
  /**
   * How long to wait between applying the `consolidationPolicy`.
   *
   * Default: `10000`
   */
  consolidationIntervalMsec?: number;
  /**
   * How long to wait between commiting View data store changes and making
   * documents visible to queries.
   *
   * Default: `1000`
   */
  commitIntervalMsec?: number;
  /**
   * Consolidation policy to apply for selecting which segments should be
   * merged.
   *
   * Default: `{ type: "tier" }`
   */
  consolidationPolicy?: TierConsolidationPolicy;
  /**
   * An object mapping names of linked collections to
   * {@link ArangoSearchViewLinkOptions} definitions.
   */
  links?: Record<string, Omit<ArangoSearchViewLinkOptions, "nested">>;
};

/**
 * Options for partially modifying the properties of an ArangoSearch View.
 */
export type ArangoSearchViewPatchPropertiesOptions =
  ArangoSearchViewPropertiesOptions;

/**
 * Options for creating an ArangoSearch View.
 */
export type CreateArangoSearchViewOptions =
  ArangoSearchViewPropertiesOptions & {
    /**
     * Type of the View.
     */
    type: "arangosearch";
    /**
     * Maximum number of writers cached in the pool.
     *
     * Default: `64`
     */
    writebufferIdle?: number;
    /**
     * Maximum number of concurrent active writers that perform a transaction.
     *
     * Default: `0`
     */
    writebufferActive?: number;
    /**
     * Maximum memory byte size per writer before a writer flush is triggered.
     *
     * Default: `33554432` (32 MiB)
     */
    writebufferSizeMax?: number;
    /**
     * Attribute path (`field`) for the value of each document that will be
     * used for sorting.
     *
     * If `direction` is set to `"asc"` or `asc` is set to `true`,
     * the primary sorting order will be ascending.
     *
     * If `direction` is set to `"desc"` or `asc` is set to `false`,
     * the primary sorting order will be descending.
     */
    primarySort?: (
      | {
          /**
           * Attribute path for the value of each document to use for
           * sorting.
           */
          field: string;
          /**
           * If set to `"asc"`, the primary sorting order will be ascending.
           * If set to `"desc"`, the primary sorting order will be descending.
           */
          direction: Direction;
        }
      | {
          /**
           * Attribute path for the value of each document to use for
           * sorting.
           */
          field: string;
          /**
           * If set to `true`, the primary sorting order will be ascending.
           * If set to `false`, the primary sorting order will be descending.
           */
          asc: boolean;
        }
    )[];
    /**
     * Compression to use for the primary sort data.
     *
     * Default: `"lz4"`
     */
    primarySortCompression?: Compression;
    /**
     * (Enterprise Edition only.) Always cache primary sort columns in memory.
     *
     * Default: `false`
     */
    primarySortCache?: boolean;
    /**
     * (Enterprise Edition only.) Always cache primary key columns in memory.
     *
     * Default: `false`
     */
    primaryKeyCache?: boolean;
    /**
     * Attribute paths for which values should be stored in the view index
     * in addition to those used for sorting via `primarySort`.
     */
    storedValues?: {
      /**
       * Attribute paths for which values should be stored in the view index
       * in addition to those used for sorting via `primarySort`.
       */
      fields: string[];
      /**
       * How the attribute values should be compressed.
       *
       * Default: `"lz4"`
       */
      compression?: Compression;
      /**
       * (Enterprise Edition only.) If set to `true`, then stored values are
       * always cached in memory.
       *
       * Default: `false`
       */
      cache?: boolean;
    }[];
  };

/**
 * Options defining an index used in a SearchAlias View.
 */
export type SearchAliasViewIndexOptions = {
  /**
   *  Name of a collection.
   */
  collection: string;
  /**
   * Name of an inverted index in the collection.
   */
  index: string;
};

/**
 * Options for modifying the properties of a SearchAlias View.
 */
export type SearchAliasViewPropertiesOptions = {
  /**
   * An array of inverted indexes to add to the View.
   */
  indexes: SearchAliasViewIndexOptions[];
};

/**
 * Options defining an index to be modified in a SearchAlias View.
 */
export type SearchAliasViewPatchIndexOptions = SearchAliasViewIndexOptions & {
  /**
   * Whether to add or remove the index.
   *
   * Default: `"add"`
   */
  operation?: "add" | "del";
};

/**
 * Options for partially modifying the properties of a SearchAlias View.
 */
export type SearchAliasViewPatchPropertiesOptions = {
  /**
   * An array of inverted indexes to add to the View.
   */
  indexes: SearchAliasViewPatchIndexOptions[];
};

/**
 * Options for creating a SearchAlias View.
 */
export type CreateSearchAliasViewOptions = SearchAliasViewPropertiesOptions & {
  /**
   * Type of the View.
   */
  type: "search-alias";
};

/**
 * Generic description of a View.
 */
export type GenericViewDescription = {
  /**
   * A globally unique identifier for this View.
   */
  globallyUniqueId: string;
  /**
   * An identifier for this View.
   */
  id: string;
  /**
   * Name of the View.
   */
  name: string;
};

export type ViewDescription =
  | ArangoSearchViewDescription
  | SearchAliasViewDescription;

export type ArangoSearchViewDescription = GenericViewDescription & {
  type: "arangosearch";
};

export type SearchAliasViewDescription = GenericViewDescription & {
  type: "search-alias";
};

export type ViewProperties =
  | ArangoSearchViewProperties
  | SearchAliasViewProperties;

/**
 * A link definition for an ArangoSearch View.
 */
export type ArangoSearchViewLink = {
  analyzers: string[];
  fields: Record<string, ArangoSearchViewLink>;
  includeAllFields: boolean;
  nested?: Record<string, ArangoSearchViewLink>;
  trackListPositions: boolean;
  storeValues: "none" | "id";
  cache: boolean;
};

/**
 * Properties of an ArangoSearch View.
 */
export type ArangoSearchViewProperties = ArangoSearchViewDescription & {
  cleanupIntervalStep: number;
  consolidationIntervalMsec: number;
  commitIntervalMsec: number;
  writebufferIdle: number;
  writebufferActive: number;
  writebufferSizeMax: number;
  consolidationPolicy: TierConsolidationPolicy | BytesAccumConsolidationPolicy;
  primarySort: {
    field: string;
    direction: Direction;
  }[];
  primarySortCompression: Compression;
  primarySortCache: boolean;
  primaryKeyCache: boolean;
  storedValues: {
    fields: string[];
    compression: Compression;
    cache: boolean;
  }[];
  links: Record<string, Omit<ArangoSearchViewLink, "nested">>;
};

/**
 * Properties of a SearchAlias View.
 */
export type SearchAliasViewProperties = SearchAliasViewDescription & {
  indexes: { collection: string; index: string }[];
};

/**
 * Represents a View in a {@link database.Database}.
 */
export class View {
  protected _name: string;
  protected _db: Database;

  /**
   * @internal
   */
  constructor(db: Database, name: string) {
    this._db = db;
    this._name = name.normalize("NFC");
  }

  /**
   * @internal
   *
   * Indicates that this object represents an ArangoDB View.
   */
  get isArangoView(): true {
    return true;
  }

  /**
   * Name of the View.
   */
  get name() {
    return this._name;
  }

  /**
   * Retrieves general information about the View.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = db.view("some-view");
   * const data = await view.get();
   * // data contains general information about the View
   * ```
   */
  get(): Promise<ArangoApiResponse<ViewDescription>> {
    return this._db.request({
      path: `/_api/view/${encodeURIComponent(this._name)}`,
    });
  }

  /**
   * Checks whether the View exists.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = db.view("some-view");
   * const exists = await view.exists();
   * console.log(exists); // indicates whether the View exists
   * ```
   */
  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err: any) {
      if (isArangoError(err) && err.errorNum === VIEW_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Creates a View with the given `options` and the instance's name.
   *
   * See also {@link database.Database#createView}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = db.view("potatoes");
   * await view.create();
   * // the ArangoSearch View "potatoes" now exists
   * ```
   */
  create<Options extends CreateViewOptions>(
    options: CreateViewOptions
  ): Promise<
    typeof options extends CreateArangoSearchViewOptions
      ? ArangoSearchViewDescription
      : Options extends CreateSearchAliasViewOptions
      ? SearchAliasViewDescription
      : ViewDescription
  > {
    return this._db.request({
      method: "POST",
      path: "/_api/view",
      body: {
        ...options,
        name: this._name,
      },
    });
  }

  /**
   * Renames the View and updates the instance's `name` to `newName`.
   *
   * Additionally removes the instance from the {@link database.Database}'s internal
   * cache.
   *
   * **Note**: Renaming Views may not be supported when ArangoDB is
   * running in a cluster configuration.
   *
   * @param newName - The new name of the View.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view1 = db.view("some-view");
   * await view1.rename("other-view");
   * const view2 = db.view("some-view");
   * const view3 = db.view("other-view");
   * // Note all three View instances are different objects but
   * // view1 and view3 represent the same ArangoDB view!
   * ```
   */
  async rename(newName: string): Promise<ArangoApiResponse<ViewDescription>> {
    const result = this._db.renameView(this._name, newName);
    this._name = newName.normalize("NFC");
    return result;
  }

  /**
   * Retrieves the View's properties.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = db.view("some-view");
   * const data = await view.properties();
   * // data contains the View's properties
   * ```
   */
  properties(): Promise<ArangoApiResponse<ViewProperties>> {
    return this._db.request({
      path: `/_api/view/${encodeURIComponent(this._name)}/properties`,
    });
  }

  /**
   * Updates the properties of the View.
   *
   * @param properties - Properties of the View to update.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = db.view("some-view");
   * const result = await view.updateProperties({
   *   consolidationIntervalMsec: 234
   * });
   * console.log(result.consolidationIntervalMsec); // 234
   * ```
   */
  updateProperties<Properties extends ViewPatchPropertiesOptions | undefined>(
    properties?: Properties
  ): Promise<
    Properties extends ArangoSearchViewPatchPropertiesOptions
      ? ArangoSearchViewProperties
      : Properties extends SearchAliasViewPatchPropertiesOptions
      ? SearchAliasViewProperties
      : ViewProperties
  > {
    return this._db.request({
      method: "PATCH",
      path: `/_api/view/${encodeURIComponent(this._name)}/properties`,
      body: properties ?? {},
    });
  }

  /**
   * Replaces the properties of the View.
   *
   * @param properties - New properties of the View.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = db.view("some-view");
   * const result = await view.replaceProperties({
   *   consolidationIntervalMsec: 234
   * });
   * console.log(result.consolidationIntervalMsec); // 234
   * ```
   */
  replaceProperties<Properties extends ViewPropertiesOptions | undefined>(
    properties?: Properties
  ): Promise<
    Properties extends ArangoSearchViewPropertiesOptions
      ? ArangoSearchViewProperties
      : Properties extends SearchAliasViewPropertiesOptions
      ? SearchAliasViewProperties
      : ViewProperties
  > {
    return this._db.request({
      method: "PUT",
      path: `/_api/view/${encodeURIComponent(this._name)}/properties`,
      body: properties ?? {},
    });
  }

  /**
   * Deletes the View from the database.
   *
   * @example
   *
   * ```js
   * const db = new Database();
   * const view = db.view("some-view");
   * await view.drop();
   * // the View "some-view" no longer exists
   * ```
   */
  drop(): Promise<boolean> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/view/${encodeURIComponent(this._name)}`,
      },
      (res) => res.body.result
    );
  }
}
