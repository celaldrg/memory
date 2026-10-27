// Turn rules of the card-matching game. Pure module: every function returns a new
// state and never mutates its input, so the UI can keep the latest state in one variable.
import { createDeck, getSize } from './deck.js';
import { createRng, randomSeed } from './rng.js';

/** Player counts the game supports. */
export const PLAYER_COUNTS = Object.freeze([1, 2]);

/**
 * @typedef {object} Card
 * @property {string} symbol Symbol id (see SYMBOLS in deck.js).
 * @property {boolean} faceUp True while the face is visible: open or matched.
 * @property {boolean} matched True once its pair has been found.
 * @property {number|null} matchedBy Index of the player who found the pair.
 */

/**
 * @typedef {object} GameState
 * @property {string} size Board size id, for example "4x4".
 * @property {number} cols
 * @property {number} rows
 * @property {Card[]} cards Row by row.
 * @property {number[]} open Face-up cards that are not matched yet (0, 1 or 2 indices).
 * @property {number} players 1 or 2.
 * @property {number} current Index of the player whose turn it is.
 * @property {number[]} scores Pairs found per player.
 * @property {number} moves Completed turns: every second flip counts as one move.
 * @property {number} elapsedMs Play time; it runs from the first flip until the win.
 * @property {'ready'|'playing'|'won'} status
 */

/** @typedef {'first'|'second'|'mismatch'|'won'} Phase */

/** @typedef {'invalid'|'finished'|'busy'|'matched'|'open'} RejectReason */

/**
 * What a flip did, so the UI can animate and announce it.
 * @typedef {{type: 'first', index: number}
 *   | {type: 'match', indices: number[], player: number, won: boolean}
 *   | {type: 'mismatch', indices: number[], player: number}
 *   | {type: 'rejected', index: number, reason: RejectReason}} FlipEvent
 */

/**
 * Starts a new game with every card face down.
 * @param {object} [options]
 * @param {string} [options.size='4x4'] Board size id (see SIZES in deck.js).
 * @param {number} [options.players=1] 1 or 2.
 * @param {number} [options.seed] Shuffle seed; a random one is picked when omitted.
 * @param {() => number} [options.rng] Random source in [0, 1); takes precedence over `seed`.
 * @returns {GameState}
 * @throws {RangeError} For an unknown board size or player count.
 */
export function createGame({ size = '4x4', players = 1, seed = randomSeed(), rng = createRng(seed) } = {}) {
  if (!PLAYER_COUNTS.includes(players)) throw new RangeError(`Unsupported player count: ${players}`);
  const { cols, rows } = getSize(size);
  return {
    size,
    cols,
    rows,
    cards: createDeck(size, rng).map((symbol) => ({ symbol, faceUp: false, matched: false, matchedBy: null })),
    open: [],
    players,
    current: 0,
    scores: new Array(players).fill(0),
    moves: 0,
    elapsedMs: 0,
    status: 'ready',
  };
}

/**
 * Flips the card at `index` face up. The second flip of a turn either matches
 * (both cards stay open, the same player continues) or mismatches (both stay
 * visible until `resolve`). Illegal flips leave the state untouched.
 * @param {GameState} state
 * @param {number} index Card index, row by row.
 * @returns {{state: GameState, event: FlipEvent}}
 */
export function flip(state, index) {
  const reason = rejectReason(state, index);
  if (reason) return { state, event: { type: 'rejected', index, reason } };
  const opened = {
    ...state,
    cards: updateCards(state.cards, [index], { faceUp: true }),
    open: [...state.open, index],
    status: 'playing',
  };
  if (opened.open.length === 1) return { state: opened, event: { type: 'first', index } };
  return settleTurn(opened);
}

/**
 * Ends a mismatched turn: both cards turn face down and the turn passes to the
 * next player. Does nothing unless two unmatched cards are open.
 * @param {GameState} state
 * @returns {GameState}
 */
export function resolve(state) {
  if (getPhase(state) !== 'mismatch') return state;
  return {
    ...state,
    cards: updateCards(state.cards, state.open, { faceUp: false }),
    open: [],
    current: (state.current + 1) % state.players,
  };
}

/**
 * Advances the play timer. Time only runs between the first flip and the win.
 * @param {GameState} state
 * @param {number} dtMs Milliseconds since the previous tick; non-positive or non-finite steps are ignored.
 * @returns {GameState}
 */
export function tick(state, dtMs) {
  if (state.status !== 'playing' || !Number.isFinite(dtMs) || dtMs <= 0) return state;
  return { ...state, elapsedMs: state.elapsedMs + dtMs };
}

/**
 * Tells whether flipping the card at `index` is allowed right now.
 * @param {GameState} state
 * @param {number} index
 * @returns {boolean}
 */
export function canFlip(state, index) {
  return rejectReason(state, index) === null;
}

/**
 * Where the current turn stands: waiting for the first or second card, waiting
 * for `resolve` after a mismatch, or finished.
 * @param {GameState} state
 * @returns {Phase}
 */
export function getPhase(state) {
  if (state.status === 'won') return 'won';
  if (state.open.length === 2) return 'mismatch';
  return state.open.length === 1 ? 'second' : 'first';
}

/**
 * Players with the highest score: the winners once the game is won.
 * Two entries mean a draw; a solo game always returns [0].
 * @param {GameState} state
 * @returns {number[]}
 */
export function getWinners(state) {
  const top = Math.max(...state.scores);
  return state.scores.flatMap((score, player) => (score === top ? [player] : []));
}

/** Script for the `?demo` board: [scan start, turn kind] per turn, then one card left face up. */
const DEMO = Object.freeze({
  seed: 2026,
  turns: [[0, 'match'], [5, 'miss'], [10, 'match'], [3, 'miss'], [15, 'match']],
  faceUpFrom: 6,
  elapsedMs: 47000,
});

/**
 * Builds the deterministic mid-game board shown with `?demo` (used for the README
 * screenshot): a solo 4x4 game with three pairs found, two missed turns and one
 * card face up. It is played through the normal rules, so it continues like any game.
 * @returns {GameState}
 */
export function createDemoGame() {
  let state = createGame({ size: '4x4', players: 1, seed: DEMO.seed });
  for (const [from, kind] of DEMO.turns) {
    const [first, second] = pickDemoTurn(state, from, kind);
    state = resolve(flip(flip(state, first).state, second).state);
  }
  state = flip(state, closedCards(state, DEMO.faceUpFrom)[0]).state;
  return tick(state, DEMO.elapsedMs);
}

/** Why a flip is illegal, or null when it is allowed. */
function rejectReason(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.cards.length) return 'invalid';
  if (state.status === 'won') return 'finished';
  if (getPhase(state) === 'mismatch') return 'busy';
  if (state.cards[index].matched) return 'matched';
  if (state.cards[index].faceUp) return 'open';
  return null;
}

/** Scores the two open cards: a match keeps them up and the turn; a mismatch waits for resolve. */
function settleTurn(state) {
  const [a, b] = state.open;
  const counted = { ...state, moves: state.moves + 1 };
  if (state.cards[a].symbol !== state.cards[b].symbol) {
    return { state: counted, event: { type: 'mismatch', indices: [a, b], player: state.current } };
  }
  const cards = updateCards(state.cards, [a, b], { matched: true, matchedBy: state.current });
  const won = cards.every((card) => card.matched);
  const scores = state.scores.map((score, player) => (player === state.current ? score + 1 : score));
  return {
    state: { ...counted, cards, scores, open: [], status: won ? 'won' : 'playing' },
    event: { type: 'match', indices: [a, b], player: state.current, won },
  };
}

/** Copies `cards`, applying `changes` to the cards at `indices`. */
function updateCards(cards, indices, changes) {
  return cards.map((card, index) => (indices.includes(index) ? { ...card, ...changes } : card));
}

/** Face-down card indices, scanning from `start` and wrapping around the board. */
function closedCards(state, start) {
  const count = state.cards.length;
  return Array.from({ length: count }, (_, step) => (start + step) % count)
    .filter((index) => !state.cards[index].faceUp);
}

/** Two face-down cards for a demo turn: a pair for 'match', different symbols for 'miss'. */
function pickDemoTurn(state, from, kind) {
  const [first, ...rest] = closedCards(state, from);
  const isPartner = (index) => state.cards[index].symbol === state.cards[first].symbol;
  const second = kind === 'match' ? rest.find(isPartner) : rest.find((index) => !isPartner(index));
  return [first, second];
}
