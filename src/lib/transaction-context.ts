/**
 * Transaction ID scope for stream transaction steps.
 *
 * Node.js uses AsyncLocalStorage so concurrent transactions on the same
 * Connection carry independent transaction IDs through async continuations.
 *
 * In browsers (no AsyncLocalStorage), a single slot is held until the step
 * promise settles. Use separate `Database` instances for concurrent
 * transactions in the browser.
 *
 * @packageDocumentation
 * @internal
 */

let nodeAls:
  | {
      run<T>(store: string, callback: () => T): T;
      getStore(): string | undefined;
    }
  | null = null;
let nodeAlsReady: Promise<void> | null = null;
let fallbackSlot: string | undefined;

function isNodeRuntime(): boolean {
  return (
    typeof process !== "undefined" &&
    typeof process.versions === "object" &&
    process.versions !== null &&
    typeof process.versions.node === "string"
  );
}

function ensureNodeAls(): Promise<void> {
  if (!isNodeRuntime()) {
    return Promise.resolve();
  }
  if (nodeAls) {
    return Promise.resolve();
  }
  if (!nodeAlsReady) {
    nodeAlsReady = (async () => {
      try {
        const spec = ["node:", "async_hooks"].join("");
        const { AsyncLocalStorage } = (await import(
          spec
        )) as typeof import("node:async_hooks");
        nodeAls = new AsyncLocalStorage<string>();
      } catch {
        nodeAls = null;
      }
    })();
  }
  return nodeAlsReady;
}

/**
 * Returns the active stream transaction ID for the current async context, if any.
 */
export function getActiveTransactionId(): string | undefined {
  if (nodeAls) {
    return nodeAls.getStore();
  }
  return fallbackSlot;
}

/**
 * Runs `callback` while `transactionId` is the active transaction ID.
 *
 * On Node.js the scope is preserved until a returned Promise settles.
 * In the browser the slot is cleared when the returned Promise settles.
 */
export async function runTransactionStep<T>(
  transactionId: string,
  callback: () => Promise<T>
): Promise<T> {
  await ensureNodeAls();

  const invoke = (): Promise<T> => {
    const promise = callback();
    if (!promise || typeof promise.then !== "function") {
      throw new Error(
        "Transaction callback was not an async function or did not return a promise!"
      );
    }
    return Promise.resolve(promise);
  };

  if (nodeAls) {
    return nodeAls.run(transactionId, invoke);
  }

  const previous = fallbackSlot;
  fallbackSlot = transactionId;
  try {
    return await invoke().finally(() => {
      fallbackSlot = previous;
    });
  } catch (err) {
    fallbackSlot = previous;
    throw err;
  }
}
