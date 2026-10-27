// The board size and player count picked last. Pure module: storage is the caller's job.
import { SIZES } from './deck.js';
import { PLAYER_COUNTS } from './game.js';

/** Settings for a first visit: the smallest board and one player. */
export const DEFAULT_SETTINGS = Object.freeze({ size: SIZES[0].id, players: PLAYER_COUNTS[0] });

/**
 * Turns saved or user-picked data into valid settings. Each unknown or missing
 * value falls back to its default on its own.
 * @param {unknown} value For example the parsed JSON read from storage.
 * @returns {{size: string, players: number}}
 */
export function normalizeSettings(value) {
  const saved = typeof value === 'object' && value !== null ? value : {};
  return {
    size: SIZES.some((size) => size.id === saved.size) ? saved.size : DEFAULT_SETTINGS.size,
    players: PLAYER_COUNTS.includes(saved.players) ? saved.players : DEFAULT_SETTINGS.players,
  };
}
