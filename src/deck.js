// Board sizes, card symbols and deck building. Pure module.
import { shuffle } from './rng.js';

/**
 * Board sizes offered by the game. `id` is what the UI and the saved records use.
 * @type {ReadonlyArray<Readonly<{id: string, cols: number, rows: number}>>}
 */
export const SIZES = Object.freeze([
  Object.freeze({ id: '4x4', cols: 4, rows: 4 }),
  Object.freeze({ id: '4x5', cols: 4, rows: 5 }),
  Object.freeze({ id: '6x6', cols: 6, rows: 6 }),
]);

/**
 * Ids of the card faces; the UI draws one original SVG symbol per id.
 * There are exactly enough for the largest board (6x6 = 18 pairs).
 * @type {ReadonlyArray<string>}
 */
export const SYMBOLS = Object.freeze([
  'sun', 'moon', 'leaf', 'drop', 'star', 'wave',
  'mountain', 'fish', 'cloud', 'bolt', 'flower', 'tree',
  'snowflake', 'flame', 'planet', 'rainbow', 'clover', 'gem',
]);

/**
 * Looks up a board size by its id.
 * @param {string} id For example "4x4".
 * @returns {Readonly<{id: string, cols: number, rows: number}>}
 * @throws {RangeError} When the id is not one of SIZES.
 */
export function getSize(id) {
  const size = SIZES.find((candidate) => candidate.id === id);
  if (!size) throw new RangeError(`Unknown board size: ${id}`);
  return size;
}

/**
 * Builds a shuffled deck for a board: a random choice of symbols, each exactly twice.
 * @param {string} sizeId One of the SIZES ids.
 * @param {() => number} rng Random source returning floats in [0, 1).
 * @returns {string[]} Symbol ids in board order (row by row).
 */
export function createDeck(sizeId, rng) {
  const { cols, rows } = getSize(sizeId);
  const symbols = shuffle(SYMBOLS, rng).slice(0, (cols * rows) / 2);
  return shuffle([...symbols, ...symbols], rng);
}
