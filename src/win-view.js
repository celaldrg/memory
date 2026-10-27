// The win overlay: the result, a few stats and a burst of CSS-shape confetti.
import { planConfetti } from './confetti.js';
import { formatTime } from './format.js';
import { createRng, randomSeed } from './rng.js';
import { pairProgress, winOutcome } from './view-model.js';

const CONFETTI_PIECES = 70;

/** A stat tile for the overlay: label and value. */
function statTile(label, value) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  const term = document.createElement('dt');
  term.textContent = label;
  const detail = document.createElement('dd');
  detail.textContent = value;
  tile.append(term, detail);
  return tile;
}

/** One confetti piece; its look and fall come from CSS custom properties. */
function confettiPiece(piece) {
  const element = document.createElement('span');
  element.className = `is-${piece.shape}`;
  element.style.setProperty('--x', `${piece.left}%`);
  element.style.setProperty('--size', `${piece.size}px`);
  element.style.setProperty('--color', piece.color);
  element.style.setProperty('--delay', `${piece.delayMs}ms`);
  element.style.setProperty('--duration', `${piece.durationMs}ms`);
  element.style.setProperty('--drift', `${piece.drift}px`);
  element.style.setProperty('--spin', `${piece.spin}deg`);
  return element;
}

/**
 * Wires the win dialog and returns functions to open and close it.
 * @param {HTMLDialogElement} dialog
 * @param {() => void} onPlayAgain Called when the player asks for a new game.
 * @returns {{show: (state: object, record: {best: object|null, isNew: boolean}, t: Function) => void, close: () => void}}
 */
export function createWinView(dialog, onPlayAgain) {
  const find = (selector) => dialog.querySelector(selector);
  const title = find('#win-title');
  const text = find('#win-text');
  const badge = find('#win-badge');
  const stats = find('#win-stats');
  const confetti = find('.confetti');

  find('#win-again').addEventListener('click', () => {
    dialog.close();
    onPlayAgain();
  });
  find('#win-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => confetti.replaceChildren());

  /**
   * Opens the overlay for a won game.
   * @param {import('./game.js').GameState} state
   * @param {{best: {moves: number, timeMs: number}|null, isNew: boolean}} record Result of recordWin.
   * @param {(key: string, params?: object) => string} t Translate function.
   */
  function show(state, record, t) {
    const outcome = winOutcome(state);
    const playerName = (player) => t('player', { n: player + 1 });
    title.textContent = t(outcome.key, outcome.player === null ? {} : { player: playerName(outcome.player) });
    text.textContent = t('allFound', { pairs: pairProgress(state).total });
    badge.hidden = !record.isNew;
    const time = statTile(t('time'), formatTime(state.elapsedMs));
    stats.replaceChildren(...(state.players === 1
      ? [statTile(t('moves'), String(state.moves)), time,
        statTile(t('best'), record.best ? t('bestValue', { moves: record.best.moves, time: formatTime(record.best.timeMs) }) : t('none'))]
      : [...state.scores.map((score, player) => statTile(playerName(player), String(score))), time]));
    confetti.replaceChildren(...planConfetti(CONFETTI_PIECES, createRng(randomSeed())).map(confettiPiece));
    if (!dialog.open) dialog.showModal();
  }

  /** Closes the overlay if it is open. */
  function close() {
    if (dialog.open) dialog.close();
  }

  return { show, close };
}
