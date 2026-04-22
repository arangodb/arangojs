import type { Database } from "../databases.js";

/**
 * Fetches the ArangoDB `version` string (e.g. `3.12.4`, `4.0.0-nightly`) and parses into the
 * numeric encoding in XYYZZ format (e.g. `31204`, `40000`).
 * This is to avoid using config.arangoVersion, which is not available in the test environment.
 */

export function versionStringToArangoVersionCode(version: string): number {
  const core = version.trim().split("-")[0] ?? "";
  const parts = core.split(".");
  const major = parseInt(parts[0] ?? "0", 10) || 0;
  const minor = parseInt(parts[1] ?? "0", 10) || 0;
  const patch = parseInt(parts[2] ?? "0", 10) || 0;
  return major * 10000 + minor * 100 + patch;
}

export async function fetchArangoVersionCode(db: Database): Promise<number> {
  const { version } = await db.version();
  const versionCode = versionStringToArangoVersionCode(version);
  return versionCode;
}

