import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, flip, tick } from '../src/game.js';
import { isBetter, loadBest, recordWin } from '../src/records.js';
import { createStorage } from '../src/storage.js';

/** The real storage helper over an in-memory stand-in for localStorage. */
function memoryStore() {
  const data = new Map();
  const backend = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
  return { store: createStorage(() => backend), data };
}

/** Summary of a finished solo 4x4 game, as recordWin reads it. */
const won = (moves, elapsedMs, overrides = {}) => ({ size: '4x4', players: 1, status: 'won', moves, elapsedMs, ...overrides });

test('isBetter prefers fewer moves, then less time', () => {
  const best = { moves: 10, timeMs: 1000 };
  assert.equal(isBetter(best, null), true);
  assert.equal(isBetter({ moves: 9, timeMs: 99000 }, best), true);
  assert.equal(isBetter({ moves: 11, timeMs: 1 }, best), false);
  assert.equal(isBetter({ moves: 10, timeMs: 999 }, best), true);
  assert.equal(isBetter({ moves: 10, timeMs: 1000 }, best), false);
});

test('the first solo win becomes the best result', () => {
  const { store, data } = memoryStore();
  assert.equal(loadBest(store, '4x4'), null);
  assert.deepEqual(recordWin(store, won(12, 30500.4)), { best: { moves: 12, timeMs: 30500 }, isNew: true });
  assert.deepEqual(loadBest(store, '4x4'), { moves: 12, timeMs: 30500 });
  assert.deepEqual(JSON.parse(data.get('memory:best-4x4')), { moves: 12, timeMs: 30500 });
});

test('a better result replaces the best and a worse one does not', () => {
  const { store } = memoryStore();
  recordWin(store, won(12, 30000));
  assert.deepEqual(recordWin(store, won(14, 1000)), { best: { moves: 12, timeMs: 30000 }, isNew: false });
  assert.deepEqual(recordWin(store, won(12, 31000)), { best: { moves: 12, timeMs: 30000 }, isNew: false });
  assert.deepEqual(recordWin(store, won(12, 29000)), { best: { moves: 12, timeMs: 29000 }, isNew: true });
  assert.deepEqual(recordWin(store, won(10, 60000)), { best: { moves: 10, timeMs: 60000 }, isNew: true });
  assert.deepEqual(loadBest(store, '4x4'), { moves: 10, timeMs: 60000 });
});

test('best results are kept per board size', () => {
  const { store } = memoryStore();
  recordWin(store, won(12, 30000));
  recordWin(store, won(25, 90000, { size: '6x6' }));
  assert.deepEqual(loadBest(store, '4x4'), { moves: 12, timeMs: 30000 });
  assert.deepEqual(loadBest(store, '6x6'), { moves: 25, timeMs: 90000 });
  assert.equal(loadBest(store, '4x5'), null);
});

test('unfinished and two-player games are not recorded', () => {
  const { store, data } = memoryStore();
  assert.deepEqual(recordWin(store, won(8, 1000, { status: 'playing' })), { best: null, isNew: false });
  assert.deepEqual(recordWin(store, won(8, 1000, { players: 2 })), { best: null, isNew: false });
  assert.equal(data.size, 0);
});

test('malformed saved data is ignored and replaced by the next win', () => {
  const { store, data } = memoryStore();
  const broken = ['not json', 'null', '[1,2]', '{"moves":"12","timeMs":1}', '{"moves":0,"timeMs":1}', '{"moves":5,"timeMs":-1}'];
  for (const raw of broken) {
    data.set('memory:best-4x4', raw);
    assert.equal(loadBest(store, '4x4'), null, raw);
  }
  assert.equal(recordWin(store, won(20, 5000)).isNew, true);
  assert.deepEqual(loadBest(store, '4x4'), { moves: 20, timeMs: 5000 });
});

test('a store that cannot save still reports the new best', () => {
  const store = createStorage(() => ({
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceededError'); },
  }));
  assert.deepEqual(recordWin(store, won(9, 2000)), { best: { moves: 9, timeMs: 2000 }, isNew: true });
});

test('a real solo game is recorded once it is won', () => {
  const { store } = memoryStore();
  let state = createGame({ seed: 3 });
  for (let index = 0; index < state.cards.length; index += 1) {
    if (state.cards[index].matched) continue;
    const partner = state.cards.findIndex((card, i) => i !== index && card.symbol === state.cards[index].symbol);
    state = flip(tick(flip(state, index).state, 1500), partner).state;
    if (state.status !== 'won') assert.equal(recordWin(store, state).isNew, false);
  }
  assert.equal(state.status, 'won');
  assert.deepEqual(recordWin(store, state), { best: { moves: 8, timeMs: 12000 }, isNew: true });
  assert.deepEqual(loadBest(store, '4x4'), { moves: 8, timeMs: 12000 });
});
