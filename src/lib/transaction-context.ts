/**
 * Transaction ID scope for opt-in asynchronous stream transaction steps.
 *
 * @packageDocumentation
 * @internal
 */

type TransactionContext = {
  connection: object;
  transactionId: string;
};

type AsyncLocalStorageLike = {
  run<T>(store: TransactionContext, callback: () => T): T;
  getStore(): TransactionContext | undefined;
};

let nodeAsyncLocalStorage: AsyncLocalStorageLike | null = null;
let nodeAsyncLocalStorageReady: Promise<void> | null = null;
let nodeAsyncLocalStorageError: unknown;

const browserTransactionIds = new WeakMap<object, string>();

function isNodeRuntime(): boolean {
  return (
    typeof process !== "undefined" &&
    typeof process.versions === "object" &&
    process.versions !== null &&
    typeof process.versions.node === "string"
  );
}

function ensureNodeAsyncLocalStorage(): Promise<void> {
  if (!isNodeRuntime() || nodeAsyncLocalStorage) {
    return Promise.resolve();
  }
  if (!nodeAsyncLocalStorageReady) {
    nodeAsyncLocalStorageReady = (async () => {
      try {
        // Keep the specifier dynamic so browser bundlers do not try to resolve
        // the Node-only module.
        const specifier = ["node:", "async_hooks"].join("");
        const { AsyncLocalStorage } = (await import(
          specifier
        )) as typeof import("node:async_hooks");
        nodeAsyncLocalStorage =
          new AsyncLocalStorage<TransactionContext>() as AsyncLocalStorageLike;
      } catch (error) {
        nodeAsyncLocalStorageError = error;
      }
    })();
  }
  return nodeAsyncLocalStorageReady;
}

/**
 * Returns the transaction ID scoped to `connection`, if any.
 */
export function getActiveTransactionId(connection: object): string | undefined {
  const context = nodeAsyncLocalStorage?.getStore();
  if (context?.connection === connection) {
    return context.transactionId;
  }
  return browserTransactionIds.get(connection);
}

/**
 * Runs `callback` with `transactionId` scoped to `connection` until the
 * callback's returned Promise settles.
 */
export async function runTransactionStep<T>(
  connection: object,
  transactionId: string,
  callback: () => Promise<T>,
): Promise<T> {
  await ensureNodeAsyncLocalStorage();

  const invoke = (): Promise<T> => {
    const promise = callback();
    if (!promise || typeof promise.then !== "function") {
      throw new Error(
        "Transaction callback was not an async function or did not return a promise!",
      );
    }
    return Promise.resolve(promise);
  };

  if (isNodeRuntime()) {
    if (!nodeAsyncLocalStorage) {
      const detail =
        nodeAsyncLocalStorageError instanceof Error
          ? `: ${nodeAsyncLocalStorageError.message}`
          : "";
      throw new Error(
        `Async transaction context is unavailable in this Node.js runtime${detail}`,
      );
    }
    return nodeAsyncLocalStorage.run({ connection, transactionId }, invoke);
  }

  if (browserTransactionIds.has(connection)) {
    throw new Error(
      "Concurrent asynchronous transaction steps on the same connection are not supported in browsers.",
    );
  }

  browserTransactionIds.set(connection, transactionId);
  try {
    return await invoke();
  } finally {
    browserTransactionIds.delete(connection);
  }
}
