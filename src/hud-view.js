// The stat tiles (moves, time, best) and the turn bar (pairs found, or the two players).
import { formatTime } from './format.js';
import { pairProgress } from './view-model.js';

/**
 * Finds the HUD elements in `doc` and returns functions that fill them in.
 * @param {Document} doc
 * @returns {{render: (state: object, best: object|null, t: Function) => void, renderTime: (ms: number) => void}}
 */
export function createHudView(doc) {
  const byId = (id) => doc.getElementById(id);
  const moves = byId('stat-moves');
  const time = byId('stat-time');
  const best = byId('stat-best');
  const bestTile = byId('best-tile');
  const soloBar = byId('solo-bar');
  const duoBar = byId('duo-bar');
  const progress = byId('progress');
  const pairs = byId('pairs-value');
  const chips = [byId('player-0'), byId('player-1')];

  /**
   * Updates the clock tile; it only touches the DOM when the shown second changes.
   * @param {number} ms
   */
  function renderTime(ms) {
    const text = formatTime(ms);
    if (time.textContent !== text) time.textContent = text;
  }

  /**
   * Fills in every tile and the turn bar. The Best tile only shows in solo games,
   * because two-player games are never recorded.
   * @param {import('./game.js').GameState} state
   * @param {{moves: number, timeMs: number}|null} bestResult Best solo result for this board size.
   * @param {(key: string, params?: object) => string} t Translate function.
   */
  function render(state, bestResult, t) {
    moves.textContent = String(state.moves);
    renderTime(state.elapsedMs);
    bestTile.hidden = state.players !== 1;
    best.textContent = bestResult
      ? t('bestValue', { moves: bestResult.moves, time: formatTime(bestResult.timeMs) })
      : t('none');

    const { found, total } = pairProgress(state);
    pairs.textContent = t('pairsValue', { found, total });
    progress.setAttribute('aria-valuemax', String(total));
    progress.setAttribute('aria-valuenow', String(found));
    progress.style.setProperty('--progress', `${(found / total) * 100}%`);

    soloBar.hidden = state.players !== 1;
    duoBar.hidden = state.players === 1;
    chips.forEach((chip, player) => {
      chip.querySelector('.name').textContent = t('player', { n: player + 1 });
      chip.querySelector('.score').textContent = String(state.scores[player] ?? 0);
      chip.classList.toggle('is-active', state.status !== 'won' && state.current === player);
    });
  }

  return { render, renderTime };
}
