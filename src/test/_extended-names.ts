import type { Database } from "../databases.js";
import { isArangoError } from "../errors.js";
import { fetchArangoVersionCode } from "./_arango-server-version.js";
import { propagationForResourceMs } from "./_integration-timeouts.js";

export const extendedCollectionNames = [
  "abc?tag",
  "abc#part",
  "abc?tag#part",
  "abc space",
  "abc%part",
  "abc%3F%2Fpart",
  "Espa\u00f1a",
];

/** Probe the live naming capability; unrelated failures must fail the suite. */
export async function supportsExtendedNames(db: Database): Promise<boolean> {
  if ((await fetchArangoVersionCode(db)) < 31100) return false;
  const collection = db.collection(`extended_probe?${Date.now()}`);
  try {
    await collection.create();
  } catch (error) {
    if (isArangoError(error) && error.errorNum === 1208) return false;
    throw error;
  }
  try {
    await waitForExtendedCollection(db, collection.name);
    return true;
  } finally {
    await collection.drop();
  }
}

export async function waitForExtendedCollection(
  db: Database,
  name: string,
): Promise<void> {
  await db.waitForPropagation(
    { pathname: `/_api/collection/${encodeURIComponent(name)}` },
    propagationForResourceMs,
  );
}
