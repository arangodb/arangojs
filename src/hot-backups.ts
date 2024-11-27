/**
 * ```ts
 * import type { HotBackupOptions } from "arangojs/hot-backups";
 * ```
 *
 * The "hot-backups" module provides types for managing hot backups.
 *
 * @packageDocumentation
 */

/**
 * (Enterprise Edition only.) Options for creating a hot backup.
 */
export type HotBackupOptions = {
  /**
   * If set to `true` and no global transaction lock can be acquired within the
   * given timeout, a possibly inconsistent backup is taken.
   *
   * Default: `false`
   */
  allowInconsistent?: boolean;
  /**
   * (Enterprise Edition cluster only.) If set to `true` and no global
   * transaction lock can be acquired within the given timeout, all running
   * transactions are forcefully aborted to ensure that a consistent backup
   * can be created.
   *
   * Default: `false`.
   */
  force?: boolean;
  /**
   * Label to appended to the backup's identifier.
   *
   * Default: If omitted or empty, a UUID will be generated.
   */
  label?: string;
  /**
   * Time in seconds that the operation will attempt to get a consistent
   * snapshot.
   *
   * Default: `120`.
   */
  timeout?: number;
};

/**
 * (Enterprise Edition only.) Result of a hot backup.
 */
export type HotBackupResult = {
  id: string;
  potentiallyInconsistent: boolean;
  sizeInBytes: number;
  datetime: string;
  nrDBServers: number;
  nrFiles: number;
};

/**
 * (Enterprise Edition only.) List of known hot backups.
 */
export type HotBackupList = {
  server: string;
  list: Record<
    string,
    HotBackupResult & {
      version: string;
      keys: any[];
      available: boolean;
      nrPiecesPresent: number;
      countIncludesFilesOnly: boolean;
    }
  >;
};
