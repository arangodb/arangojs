/**
 * ```ts
 * import type { ArangoSearchView } from "arangojs/view";
 * ```
 *
 * The "view" module provides View related types and interfaces for TypeScript.
 *
 * @packageDocumentation
 */
import { ArangoResponseMetadata } from "./connection";
import { Database } from "./database";
import { isArangoError } from "./error";
import { VIEW_NOT_FOUND } from "./lib/codes";

/**
 * String values indicating the View type.
 */
export enum ViewType {
  ARANGOSEARCH_VIEW = "arangosearch",
}

/**
 * Indicates whether the given value represents a {@link View}.
 *
 * @param view - A value that might be a View.
 */
export function isArangoView(view: any): view is View {
  return Boolean(view && view.isArangoView);
}

/**
 * Generic description of a View.
 */
export type ViewDescription = {
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
  /**
   * Type of the View.
   */
  type: ViewType;
};

/**
 * A link definition for an ArangoSearch View.
 */
export type ArangoSearchViewLink = {
  /**
   * A list of names of Analyzers to apply to values of processed document
   * attributes.
   *
   * Default: `["identity"]`
   */
  analyzers?: string[];
  /**
   * An object mapping names of attributes to process for each document to
   * {@link ArangoSearchViewLink} definitions.
   */
  fields?: Record<string, ArangoSearchViewLink | undefined>;
  /**
   * If set to `true`, all document attributes will be processed, otherwise
   * only the attributes in `fields` will be processed.
   *
   * Default: `false`
   */
  includeAllFields?: boolean;
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
};

/**
 * Properties of an ArangoSearch View.
 */
export type ArangoSearchViewProperties = {
  /**
   * How many commits to wait between removing unused files.
   */
  cleanupIntervalStep: number;
  /**
   * How long to wait between applying the `consolidationPolicy`.
   */
  consolidationIntervalMsec: number;
  /**
   * Maximum number of writers cached in the pool.
   */
  writebufferIdle: number;
  /**
   * Maximum number of concurrent active writers that perform a transaction.
   */
  writebufferActive: number;
  /**
   * Maximum memory byte size per writer before a writer flush is triggered.
   */
  writebufferSizeMax: number;
  /**
   * Consolidation policy to apply for selecting which segments should be
   * merged.
   */
  consolidationPolicy: BytesAccumConsolidationPolicy | TierConsolidationPolicy;
  /**
   * Attribute path (`field`) for the value of each document that is
   * used for sorting.
   */
  primarySort: {
    /**
     * Attribute path for the value of each document used for
     * sorting.
     */
    field: string;
    /**
     * If set to `"asc"`, the primary sorting order is ascending.
     * If set to `"desc"`, the primary sorting order is descending.
     */
    direction: "desc" | "asc";
  }[];
  /**
   * Compression to use for the primary sort data.
   *
   * Default: `"lz4"`
   */
  primarySortCompression: PrimarySortCompression;
  /**
   * Attribute paths for which values should be stored in the view index
   * in addition to those used for sorting via `primarySort`.
   */
  storedValues: {
    /**
     * Attribute paths for which values should be stored in the view index
     * in addition to those used for sorting via `primarySort`.
     */
    fields: string[];
  }[];
  /**
   * An object mapping names of linked collections to
   * {@link ArangoSearchViewLink} definitions.
   */
  links: Record<string, ArangoSearchViewLink | undefined>;
};

/**
 * Policy to consolidate based on segment byte size and live document count as
 * dictated by the customization attributes.
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
   * Minimum number of segments that will be evaluated as candidates
   * for consolidation.
   *
   * Default: `1`
   */
  segmentsMin?: number;
  /**
   * Maximum number of segments that will be evaluated as candidates
   * for consolidation.
   *
   * Default: `10`
   */
  segmentsMax?: number;
  /**
   * Maximum allowed size of all consolidated segments.
   *
   * Default: `5368709120`, i.e. 5 GiB
   */
  segmentsBytesMax?: number;
  /**
   * Defines the value to treat all smaller segments as equal for
   * consolidation selection.
   *
   * Default: `2097152`, i.e. 2 MiB
   */
  segmentsBytesFloor?: number;
  /**
   * Minimum score.
   */
  minScore?: number;
};

/**
 * Compression to use for primary sort data of a View.
 *
 * Default: `"lz4"`
 */
export type PrimarySortCompression = "lz4" | "none";

/**
 * Properties of an ArangoSearch View.
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
   * Default: `33554432`, i.e. 32 MiB
   */
  writebufferSizeMax?: number;
  /**
   * Consolidation policy to apply for selecting which segments should be
   * merged.
   */
  consolidationPolicy?: BytesAccumConsolidationPolicy | TierConsolidationPolicy;
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
        direction: "desc" | "asc";
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
  primarySortCompression?: PrimarySortCompression;
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
  }[];
  /**
   * An object mapping names of linked collections to
   * {@link ArangoSearchViewLink} definitions.
   */
  links?: Record<string, ArangoSearchViewLink | undefined>;
};

/**
 * Represents a View in a {@link Database}.
 *
 * See {@link ArangoSearchView} for the concrete type representing an
 * ArangoSearch View.
 */
export class View<
  PropertiesOptions extends Record<string, unknown> = any,
  Properties extends Record<string, unknown> = any
> {
  protected _name: string;
  protected _db: Database;

  /**
   * @internal
   * @hidden
   */
  constructor(db: Database, name: string) {
    this._db = db;
    this._name = name;
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
  get(): Promise<ViewDescription & ArangoResponseMetadata> {
    return this._db.request(
      { path: `/_api/view/${this.name}` },
      (res) => res.body
    );
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
    } catch (err) {
      if (isArangoError(err) && err.errorNum === VIEW_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Creates a View with the given `options` and the instance's name.
   *
   * See also {@link Database.createView}.
   *
   * @example
   * ```js
   * const db = new Database();
   * const view = db.view("potatoes");
   * await view.create();
   * // the ArangoSearch View "potatoes" now exists
   * ```
   */
  create(
    options?: PropertiesOptions & { type: ViewType }
  ): Promise<ViewDescription & Properties> {
    return this._db.request(
      {
        method: "POST",
        path: "/_api/view",
        body: {
          type: ViewType.ARANGOSEARCH_VIEW,
          ...(options || {}),
          name: this.name,
        },
      },
      (res) => res.body
    );
  }

  /**
   * Renames the View and updates the instance's `name` to `newName`.
   *
   * Additionally removes the instance from the {@link Database}'s internal
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
  async rename(
    newName: string
  ): Promise<ViewDescription & ArangoResponseMetadata> {
    const result = this._db.renameView(this._name, newName);
    this._name = newName;
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
  properties(): Promise<ViewDescription & Properties & ArangoResponseMetadata> {
    return this._db.request(
      { path: `/_api/view/${this.name}/properties` },
      (res) => res.body
    );
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
  updateProperties(
    properties?: PropertiesOptions
  ): Promise<ViewDescription & Properties> {
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/view/${this.name}/properties`,
        body: properties || {},
      },
      (res) => res.body
    );
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
  replaceProperties(
    properties?: PropertiesOptions
  ): Promise<ViewDescription & Properties> {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/view/${this.name}/properties`,
        body: properties || {},
      },
      (res) => res.body
    );
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
        path: `/_api/view/${this.name}`,
      },
      (res) => res.body.result
    );
  }
}

/**
 * Represents an ArangoSearch View in a {@link Database}.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ArangoSearchView
  extends View<
    ArangoSearchViewPropertiesOptions,
    ArangoSearchViewProperties & { type: ViewType.ARANGOSEARCH_VIEW }
  > {}
