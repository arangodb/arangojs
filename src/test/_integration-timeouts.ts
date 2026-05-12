import type { Database } from "../databases.js";
import { isArangoError } from "../errors.js";
import { isClusterRuntime } from "./_config.js";

/** Suite/hook ceiling; cluster work often exceeds Mocha’s global 10s default. */
export const clusterIntegrationTimeoutMs = isClusterRuntime ? 180000 : 60000;

export const propagationAfterCreateDatabaseMs = isClusterRuntime ? 60000 : 30000;

/** `waitForPropagation` on collections, views, graphs, etc. */
export const propagationForResourceMs = isClusterRuntime ? 60000 : 10000;

/** Analyzers and similar metadata (28-accessing-analyzers parallel creates). */
export const propagationAnalyzerPathMs = isClusterRuntime ? 90000 : 65000;

/** Single-analyzer tests (29-manipulating-analyzers). */
export const propagationAnalyzerMs = isClusterRuntime ? 60000 : 30000;

export async function waitForNewDatabase(db: Database): Promise<void> {
  await db.waitForPropagation(
    { pathname: "/_api/version" },
    propagationAfterCreateDatabaseMs,
  );
}

/** Best-effort teardown after a hook timeout or partial setup (cluster races). */
export function isIgnorableNotFoundError(e: unknown): boolean {
  if (!isArangoError(e)) return false;
  if (e.code === 404) return true;
  return e.errorNum === 1202 || e.errorNum === 1203 || e.errorNum === 1228;
}
