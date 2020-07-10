/**
 * ```ts
 * import type { Dict, Errback, Patch } from "arangojs/util/types";
 * ```
 *
 * Utility types for TypeScript used throughout arangojs.
 *
 * @packageDocumentation
 */

/**
 * Type representing patch data for a given object type to represent a payload
 * ArangoDB can apply in a document PATCH request (i.e. a partial update).
 *
 * This differs from `Partial` in that it also applies itself to any nested
 * objects recursively.
 *
 * @param T - Base type to represent.
 */
export type Patch<T = object> = { [K in keyof T]?: T[K] | Patch<T[K]> };

/**
 * Generic type representing an object with values of a given type.
 *
 * @param T - Type of the object's property values.
 */
export type Dict<T> = { [key: string]: T };
