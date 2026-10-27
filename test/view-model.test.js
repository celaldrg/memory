import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoGame, createGame, flip, resolve } from '../src/game.js';
import { cardStatus, pairProgress, winOutcome } from '../src/view-model.js';

const play = (state, ...indices) => indices.reduce((current, index) => flip(current, index).state, state);
const partnerOf = (state, index) =>
  state.cards.findIndex((card, i) => i !== index && card.symbol === state.cards[index].symbol);
const otherThan = (state, index) =>
  state.cards.findIndex((card) => !card.faceUp && card.symbol !== state.cards[index].symbol);

/** Turn limit for playOut: a broken rule then fails the test instead of looping forever. */
const MAX_TURNS = 1000;

/** Plays to the end: the current player finds a pair when `keepsTurn(state)` is true and misses otherwise. */
function playOut(state, keepsTurn) {
  let current = state;
  for (let turn = 0; turn < MAX_TURNS && current.status !== 'won'; turn += 1) {
    const first = current.cards.findIndex((card) => !card.matched);
    if (!keepsTurn(current)) current = resolve(play(current, first, otherThan(current, first)));
    else current = play(current, first, partnerOf(current, first));
  }
  assert.equal(current.status, 'won', `no win within ${MAX_TURNS} turns`);
  return current;
}

test('cards go from down to open to miss and back down', () => {
  const start = createGame({ seed: 4 });
  const other = otherThan(start, 0);
  assert.equal(cardStatus(start, 0), 'down');
  const open = play(start, 0);
  assert.equal(cardStatus(open, 0), 'open');
  const missed = play(open, other);
  assert.equal(cardStatus(missed, 0), 'miss');
  assert.equal(cardStatus(missed, other), 'miss');
  assert.equal(cardStatus(resolve(missed), 0), 'down');
});

test('a found pair shows as matched', () => {
  const start = createGame({ seed: 4 });
  const partner = partnerOf(start, 0);
  const matched = play(start, 0, partner);
  assert.equal(cardStatus(matched, 0), 'matched');
  assert.equal(cardStatus(matched, partner), 'matched');
});

test('the demo board shows three found pairs and one open card', () => {
  const demo = createDemoGame();
  const statuses = demo.cards.map((_, index) => cardStatus(demo, index));
  assert.equal(statuses.filter((status) => status === 'matched').length, 6);
  assert.deepEqual(statuses.flatMap((status, index) => (status === 'open' ? [index] : [])), demo.open);
  assert.deepEqual(pairProgress(demo), { found: 3, total: 8 });
});

test('pairProgress counts pairs on every board size', () => {
  assert.deepEqual(pairProgress(createGame({ size: '4x5', seed: 1 })), { found: 0, total: 10 });
  assert.deepEqual(pairProgress(createGame({ size: '6x6', seed: 1 })), { found: 0, total: 18 });
});

test('winOutcome names a solo win, the winning player or a draw', () => {
  const solo = playOut(createGame({ seed: 8 }), () => true);
  assert.deepEqual(winOutcome(solo), { key: 'winSolo', player: null });

  const secondWins = playOut(createGame({ seed: 8, players: 2 }), (state) => state.current === 1);
  assert.deepEqual(secondWins.scores, [0, 8]);
  assert.deepEqual(winOutcome(secondWins), { key: 'winPlayer', player: 1 });

  const draw = playOut(createGame({ seed: 8, players: 2 }), (state) => {
    const found = state.scores[0] + state.scores[1];
    return state.current === (found < 4 ? 0 : 1);
  });
  assert.deepEqual(draw.scores, [4, 4]);
  assert.deepEqual(winOutcome(draw), { key: 'winDraw', player: null });
});
