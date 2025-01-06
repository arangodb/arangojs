/**
 * ```ts
 * import type { ArangoUser } from "arangojs/users";
 * ```
 *
 * The "users" module provides types for ArangoDB users.
 *
 * @packageDocumentation
 */
import * as collections from "./collections.js";
import * as databases from "./databases.js";

//#region Shared types
/**
 * Access level for an ArangoDB user's access to a collection or database.
 */
export type AccessLevel = "rw" | "ro" | "none";
//#endregion

//#region User operation options
/**
 * Options for modifying an ArangoDB user.
 */
export type UserOptions = {
  /**
   * Password the ArangoDB user will use for authentication.
   */
  passwd: string;
  /**
   * Whether the ArangoDB user account is enabled and can authenticate.
   *
   * Default: `true`
   */
  active?: boolean;
  /**
   * Additional information to store about this user.
   *
   * Default: `{}`
   */
  extra?: Record<string, any>;
};

/**
 * Options for accessing or manipulating access levels.
 */
export type UserAccessLevelOptions = {
  /**
   * The database to access or manipulate the access level of.
   *
   * If `collection` is an `ArangoCollection`, this option defaults to the
   * database the collection is contained in. Otherwise this option defaults to
   * the current database.
   */
  database?: databases.Database | string;
  /**
   * The collection to access or manipulate the access level of.
   */
  collection?: collections.ArangoCollection | string;
};

/**
 * Database user to create with a database.
 */
export type CreateDatabaseUserOptions = {
  /**
   * Username of the user to create.
   */
  username: string;
  /**
   * Password of the user to create.
   *
   * Default: `""`
   */
  passwd?: string;
  /**
   * Whether the user is active.
   *
   * Default: `true`
   */
  active?: boolean;
  /**
   * Additional data to store with the user object.
   */
  extra?: Record<string, any>;
};
//#endregion

//#region User operation results
/**
 * Properties of an ArangoDB user object.
 */
export type ArangoUser = {
  /**
   * ArangoDB username of the user.
   */
  user: string;
  /**
   * Whether the ArangoDB user account is enabled and can authenticate.
   */
  active: boolean;
  /**
   * Additional information to store about this user.
   */
  extra: Record<string, any>;
};
//#endregion
