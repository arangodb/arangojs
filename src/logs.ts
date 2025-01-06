/**
 * ```ts
 * import type { LogLevel } from "arangojs/logs";
 * ```
 *
 * The "logs" module provides types for ArangoDB logs.
 *
 * @packageDocumentation
 */

//#region Shared types
/**
 * Numeric representation of the logging level of a log entry.
 */
export enum LogLevel {
  FATAL,
  ERROR,
  WARNING,
  INFO,
  DEBUG,
}

/**
 * String representation of the logging level of a log entry.
 */
export type LogLevelLabel = keyof typeof LogLevel;

/**
 * Logging level setting.
 */
export type LogLevelSetting = LogLevelLabel | "DEFAULT";

/**
 * Log sorting direction, ascending or descending.
 */
export type LogSortDirection = "asc" | "desc";
//#endregion

//#region Log operation options
/**
 * Options for retrieving log entries.
 */
export type LogEntriesOptions = {
  /**
   * Maximum log level of the entries to retrieve.
   *
   * Default: `INFO`.
   */
  upto?: LogLevel | LogLevelLabel | Lowercase<LogLevelLabel>;
  /**
   * If set, only log entries with this log level will be returned.
   */
  level?: LogLevel | LogLevelLabel | Lowercase<LogLevelLabel>;
  /**
   * If set, only log entries with an `lid` greater than or equal to this value
   * will be returned.
   */
  start?: number;
  /**
   * If set, only this many entries will be returned.
   */
  size?: number;
  /**
   * If set, this many log entries will be skipped.
   */
  offset?: number;
  /**
   * If set, only log entries containing the specified text will be returned.
   */
  search?: string;
  /**
   * If set to `"desc"`, log entries will be returned in reverse chronological
   * order.
   *
   * Default: `"asc"`.
   */
  sort?: LogSortDirection;
};
//#endregion

//#region Log operation results
/**
 * An object representing a single log entry.
 */
export type LogMessage = {
  id: number;
  topic: string;
  level: LogLevelLabel;
  date: string;
  message: string;
};

/**
 * An object representing a list of log entries.
 */
export type LogEntries = {
  totalAmount: number;
  lid: number[];
  topic: string[];
  level: LogLevel[];
  timestamp: number[];
  text: string[];
};
//#endregion
