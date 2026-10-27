// What the board, the HUD and the win overlay show for a game state. Pure module.
import { getPhase, getWinners } from './game.js';

/** @typedef {import('./game.js').GameState} GameState */

/** @typedef {'down'|'open'|'miss'|'matched'} CardStatus */

/** String key (see i18n.js) of a card's accessible name, per card status. */
export const CARD_LABELS = Object.freeze({ down: 'cardDown', open: 'cardUp', miss: 'cardUp', matched: 'cardFound' });

/**
 * How a card looks right now: face down, open and waiting for its partner,
 * part of a mismatch that is about to close, or matched.
 * @param {GameState} state
 * @param {number} index Card index, row by row.
 * @returns {CardStatus}
 */
export function cardStatus(state, index) {
  const card = state.cards[index];
  if (card.matched) return 'matched';
  if (!card.faceUp) return 'down';
  return getPhase(state) === 'mismatch' ? 'miss' : 'open';
}

/**
 * Pairs found so far and pairs on the board.
 * @param {GameState} state
 * @returns {{found: number, total: number}}
 */
export function pairProgress(state) {
  const matchedCards = state.cards.filter((card) => card.matched).length;
  return { found: matchedCards / 2, total: state.cards.length / 2 };
}

/**
 * Headline of the win overlay as a string key (see i18n.js): a solo win, the
 * winning player (a player index) or a draw.
 * @param {GameState} state A won game.
 * @returns {{key: 'winSolo'|'winPlayer'|'winDraw', player: number|null}}
 */
export function winOutcome(state) {
  if (state.players === 1) return { key: 'winSolo', player: null };
  const winners = getWinners(state);
  return winners.length > 1 ? { key: 'winDraw', player: null } : { key: 'winPlayer', player: winners[0] };
}
