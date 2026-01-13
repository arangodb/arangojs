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

//#region Access Token Types
/**
 * Options for creating an access token.
 */
export type CreateAccessTokenOptions = {
  /**
   * Unique name for the access token.
   * Must be unique per user.
   */
  name: string;
  /**
   * Unix timestamp (in seconds) indicating when the token expires.
   * If not provided, token does not expire.
   *
   * Note: Only Unix timestamp (number) is accepted, not Date objects.
   */
  valid_until?: number;
};

/**
 * Access token returned when creating a new token.
 * This is the only time the token value is returned.
 */
export type AccessToken = {
  /**
   * Unique identifier for the token.
   */
  id: number;
  /**
   * Name of the token.
   */
  name: string;
  /**
   * Unix timestamp (in seconds) when the token expires.
   */
  valid_until: number;
  /**
   * Unix timestamp (in seconds) when the token was created.
   */
  created_at: number;
  /**
   * MD5 fingerprint of the token.
   */
  fingerprint: string;
  /**
   * Whether the token is currently active.
   */
  active: boolean;
  /**
   * The actual token value.
   * This is only present in the creation response and cannot be retrieved again.
   */
  token: string;
};

/**
 * Access token metadata (without the token value).
 * Returned when listing tokens.
 */
export type AccessTokenMetadata = {
  /**
   * Unique identifier for the token.
   */
  id: number;
  /**
   * Name of the token.
   */
  name: string;
  /**
   * Unix timestamp (in seconds) when the token expires.
   */
  valid_until: number;
  /**
   * Unix timestamp (in seconds) when the token was created.
   */
  created_at: number;
  /**
   * MD5 fingerprint of the token.
   */
  fingerprint: string;
  /**
   * Whether the token is currently active.
   */
  active: boolean;
};

/**
 * Response from listing access tokens.
 */
export type AccessTokenListResponse = {
  /**
   * Array of access token metadata.
   */
  tokens: AccessTokenMetadata[];
};
//#endregion