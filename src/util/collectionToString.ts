/**
 * Helper function for coercing a value that might be a string representing a
 * collection name, or an {@link ArangoCollection} object to a string.
 *
 * @packageDocumentation
 * @internal
 */
import { ArangoCollection, isArangoCollection } from "../collection";

/**
 * Coerces the given collection name or {@link ArangoCollection} object to
 * a string representing the collection name.
 *
 * @param collection - Collection name or {@link ArangoCollection} object.
 *
 * @internal
 */
export function collectionToString(
  collection: string | ArangoCollection
): string {
  if (isArangoCollection(collection)) {
    return String(collection.name);
  } else return String(collection);
}
