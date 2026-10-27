// Best result per board size: fewest moves first, then the shortest time.
// Pure module: the key/value store (see storage.js) is passed in by the caller.

/**
 * @typedef {object} BestResult
 * @property {number} moves
 * @property {number} timeMs
 */

/** @typedef {import('./storage.js').KeyValueStore} KeyValueStore */
/** @typedef {import('./game.js').GameState} GameState */

/** Storage key of the best result for a board size. */
const bestKey = (size) => `best-${size}`;

/**
 * Whether `candidate` beats `current`: fewer moves win; equal moves are decided by time.
 * @param {BestResult} candidate
 * @param {BestResult|null} current
 * @returns {boolean}
 */
export function isBetter(candidate, current) {
  if (!current) return true;
  if (candidate.moves !== current.moves) return candidate.moves < current.moves;
  return candidate.timeMs < current.timeMs;
}

/**
 * Reads the best result saved for a board size. Missing or malformed data counts as none.
 * @param {KeyValueStore} store
 * @param {string} size Board size id, for example "4x4".
 * @returns {BestResult|null}
 */
export function loadBest(store, size) {
  const value = store.get(bestKey(size), null);
  return isResult(value) ? { moves: value.moves, timeMs: value.timeMs } : null;
}

/**
 * Saves a won solo game when it beats the best result for its board size.
 * Unfinished and two-player games are never recorded.
 * @param {KeyValueStore} store
 * @param {Pick<GameState, 'size' | 'players' | 'status' | 'moves' | 'elapsedMs'>} game
 * @returns {{best: BestResult|null, isNew: boolean}} The best result after this game, and whether this game set it.
 */
export function recordWin(store, game) {
  const best = loadBest(store, game.size);
  if (game.status !== 'won' || game.players !== 1) return { best, isNew: false };
  const result = { moves: game.moves, timeMs: Math.round(game.elapsedMs) };
  if (!isBetter(result, best)) return { best, isNew: false };
  store.set(bestKey(game.size), result);
  return { best: result, isNew: true };
}

/** Shape check for a stored best result. */
function isResult(value) {
  return typeof value === 'object' && value !== null
    && Number.isInteger(value.moves) && value.moves > 0
    && Number.isFinite(value.timeMs) && value.timeMs >= 0;
}
