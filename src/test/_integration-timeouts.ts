import type { Database } from "../databases.js";
import { isArangoError } from "../errors.js";
import { ERROR_ARANGO_CONFLICT } from "../lib/codes.js";
import type { AccessToken, CreateAccessTokenOptions } from "../users.js";
import { isClusterRuntime } from "./_config.js";

/** Suite/hook ceiling; cluster work often exceeds Mocha’s global 10s default. */
export const clusterIntegrationTimeoutMs = isClusterRuntime ? 180000 : 60000;

export const propagationAfterCreateDatabaseMs = isClusterRuntime ? 60000 : 30000;

/** `waitForPropagation` on collections, views, graphs, etc. */
export const propagationForResourceMs = isClusterRuntime ? 60000 : 10000;

/** Analyzers and similar metadata (28-accessing-analyzers). */
export const propagationAnalyzerPathMs = isClusterRuntime ? 120000 : 65000;

/** Single-analyzer tests (29-manipulating-analyzers). */
export const propagationAnalyzerMs = isClusterRuntime ? 60000 : 30000;

export async function waitForNewDatabase(db: Database): Promise<void> {
  await db.waitForPropagation(
    { pathname: "/_api/version" },
    propagationAfterCreateDatabaseMs,
  );
}

/** User metadata (e.g. after `createUser`) must be visible on every coordinator. */
export async function waitForUserPropagated(
  db: Database,
  username: string,
): Promise<void> {
  await db.waitForPropagation(
    { pathname: `/_api/user/${encodeURIComponent(username)}` },
    propagationForResourceMs,
  );
}

/** Access-token routes after `createAccessToken` / similar writes. */
export async function waitForAccessTokensEndpoint(
  db: Database,
  username: string,
): Promise<void> {
  await db.waitForPropagation(
    { pathname: `/_api/token/${encodeURIComponent(username)}` },
    propagationForResourceMs,
  );
}

/** Compare token ids from create vs list (JSON may use number or numeric string). */
export function accessTokenIdsEqual(a: unknown, b: unknown): boolean {
  const na = typeof a === "number" ? a : Number(a);
  const nb = typeof b === "number" ? b : Number(b);
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
}

/**
 * Poll `getAccessTokens` until a row matches `id` and/or `name` (cluster-safe;
 * `waitForPropagation` on the token route is not always aligned with list reads).
 */
export async function waitUntilAccessTokenListed(
  db: Database,
  username: string,
  match: { id?: unknown; name?: string },
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tokens = await db.getAccessTokens(username);
    const hit = tokens.find((t) => {
      if (match.name !== undefined && t.name !== match.name) return false;
      if (match.id !== undefined && !accessTokenIdsEqual(t.id, match.id))
        return false;
      return true;
    });
    if (hit) return;
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error(
    `Timeout waiting for access token ${JSON.stringify(match)} (user ${username})`,
  );
}

/** Poll until no token with the given id is returned (post-delete / revoke). */
export async function waitUntilAccessTokenNotListed(
  db: Database,
  username: string,
  id: unknown,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tokens = await db.getAccessTokens(username);
    if (!tokens.some((t) => accessTokenIdsEqual(t.id, id))) return;
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error(
    `Timeout waiting for access token id ${String(id)} to disappear (user ${username})`,
  );
}

/**
 * Creates an access token and waits until user/token state is coherent on all
 * coordinators. Retries on HTTP 409 / write-write conflicts when several token
 * writes are issued in sequence under load balancing.
 */
export async function createAccessTokenAndPropagate(
  db: Database,
  username: string,
  options: CreateAccessTokenOptions,
): Promise<AccessToken> {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = (await db.createAccessToken(
        username,
        options,
      )) as AccessToken;
      await waitForAccessTokensEndpoint(db, username);
      await waitForUserPropagated(db, username);
      await waitUntilAccessTokenListed(
        db,
        username,
        { id: result.id, name: options.name },
        propagationForResourceMs,
      );
      return result;
    } catch (e: unknown) {
      const conflict =
        isArangoError(e) &&
        (e.errorNum === ERROR_ARANGO_CONFLICT ||
          e.code === 409 ||
          (typeof e.message === "string" &&
            e.message.includes("_rev values do not match")));
      if (!conflict || attempt === maxAttempts - 1) throw e;
      await new Promise((r) =>
        setTimeout(r, 250 * (attempt + 1) + Math.floor(Math.random() * 120)),
      );
    }
  }
  throw new Error("createAccessTokenAndPropagate: unreachable");
}

/** Poll `listAnalyzers` until every name exists (cluster-safe vs per-host GET). */
export async function waitUntilAnalyzerNamesInList(
  db: Database,
  requiredNames: Iterable<string>,
  timeoutMs: number,
): Promise<void> {
  const required = new Set(requiredNames);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const names = new Set((await db.listAnalyzers()).map((a) => a.name));
    let ok = true;
    for (const n of required) {
      if (!names.has(n)) {
        ok = false;
        break;
      }
    }
    if (ok) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for analyzer names in listAnalyzers`,
  );
}

/** Best-effort teardown after a hook timeout or partial setup (cluster races). */
export function isIgnorableNotFoundError(e: unknown): boolean {
  if (!isArangoError(e)) return false;
  if (e.code === 404) return true;
  return e.errorNum === 1202 || e.errorNum === 1203 || e.errorNum === 1228;
}
