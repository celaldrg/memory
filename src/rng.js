// Seeded randomness and shuffling. Pure module: no DOM, no globals touched at import time.

/**
 * Creates a deterministic pseudo-random number generator (mulberry32).
 * The same seed always yields the same sequence.
 * @param {number} seed Any number; it is reduced to an unsigned 32-bit integer.
 * @returns {() => number} A function returning floats in [0, 1).
 */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks a fresh unsigned 32-bit seed for callers that do not inject one.
 * @returns {number}
 */
export function randomSeed() {
  return Math.floor(Math.random() * 4294967296);
}

/**
 * Returns a shuffled copy of `items` using the Fisher-Yates algorithm.
 * The input array is left untouched.
 * @template T
 * @param {readonly T[]} items
 * @param {() => number} rng Random source returning floats in [0, 1).
 * @returns {T[]}
 */
export function shuffle(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
