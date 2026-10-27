import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIZES, SYMBOLS, createDeck, getSize } from '../src/deck.js';
import { createRng } from '../src/rng.js';

const SEEDS = Array.from({ length: 300 }, (_, index) => index * 7919 + 1);

function countSymbols(deck) {
  const counts = new Map();
  for (const symbol of deck) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  return counts;
}

test('board sizes are 4x4, 4x5 and 6x6', () => {
  assert.deepEqual(SIZES.map((size) => size.id), ['4x4', '4x5', '6x6']);
  for (const { id, cols, rows } of SIZES) assert.equal(id, `${cols}x${rows}`);
});

test('symbols are unique and cover the largest board', () => {
  assert.equal(new Set(SYMBOLS).size, SYMBOLS.length);
  const largestBoard = Math.max(...SIZES.map(({ cols, rows }) => cols * rows));
  assert.ok(SYMBOLS.length >= largestBoard / 2);
});

for (const { id, cols, rows } of SIZES) {
  test(`every ${id} deck holds each of its symbols exactly twice (${SEEDS.length} seeds)`, () => {
    for (const seed of SEEDS) {
      const deck = createDeck(id, createRng(seed));
      assert.equal(deck.length, cols * rows);
      const counts = countSymbols(deck);
      assert.equal(counts.size, (cols * rows) / 2);
      for (const [symbol, count] of counts) {
        assert.ok(SYMBOLS.includes(symbol), `unknown symbol ${symbol}`);
        assert.equal(count, 2, `seed ${seed}: ${symbol} appears ${count} times`);
      }
    }
  });
}

test('the same seed always deals the same deck', () => {
  for (const { id } of SIZES) {
    assert.deepEqual(createDeck(id, createRng(12345)), createDeck(id, createRng(12345)));
  }
});

test('different seeds deal different decks', () => {
  for (const { id } of SIZES) {
    assert.notDeepEqual(createDeck(id, createRng(1)), createDeck(id, createRng(2)));
  }
});

test('pairs land in different places from seed to seed', () => {
  const partnerPositions = new Set(SEEDS.slice(0, 50).map((seed) => {
    const deck = createDeck('4x4', createRng(seed));
    return deck.lastIndexOf(deck[0]);
  }));
  assert.ok(partnerPositions.size > 5, `only ${partnerPositions.size} distinct positions`);
});

test('smaller boards draw a varying choice of symbols', () => {
  const choices = new Set(SEEDS.slice(0, 20).map((seed) => [...new Set(createDeck('4x4', createRng(seed)))].sort().join()));
  assert.ok(choices.size > 1);
});

test('unknown board sizes are rejected', () => {
  assert.deepEqual(getSize('4x5'), { id: '4x5', cols: 4, rows: 5 });
  assert.throws(() => getSize('5x5'), RangeError);
  assert.throws(() => createDeck('3x3', createRng(1)), RangeError);
});
