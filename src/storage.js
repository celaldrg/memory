// The only module that touches localStorage. Every access is wrapped in try/catch,
// so private browsing, blocked site data or a full quota never crash the game.

const PREFIX = 'memory:';

/**
 * @typedef {object} KeyValueStore
 * @property {(key: string, fallback?: any) => any} get Stored JSON value, or `fallback` when missing or unreadable.
 * @property {(key: string, value: any) => boolean} set Saves a JSON value; returns false when it could not.
 */

/**
 * The browser's localStorage, or null when it is missing. Looked up on every
 * call, inside the callers' try/catch (reading it throws when it is blocked),
 * never at import time.
 * @returns {Pick<Storage, 'getItem' | 'setItem'> | null}
 */
function browserStorage() {
  return globalThis.localStorage ?? null;
}

/**
 * Creates a JSON key/value store over a Web Storage-like backend; keys are
 * prefixed with "memory:". Reads fall back and writes return false instead of throwing.
 * @param {() => (Pick<Storage, 'getItem' | 'setItem'> | null)} [getBackend] Defaults to localStorage.
 * @returns {KeyValueStore}
 */
export function createStorage(getBackend = browserStorage) {
  return {
    get(key, fallback = null) {
      try {
        const raw = getBackend()?.getItem(PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        const backend = getBackend();
        if (!backend) return false;
        backend.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Shared store backed by the browser's localStorage. */
export const storage = createStorage();
