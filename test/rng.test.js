import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, randomSeed, shuffle } from '../src/rng.js';

const take = (rng, count) => Array.from({ length: count }, () => rng());

test('createRng repeats the same sequence for the same seed', () => {
  assert.deepEqual(take(createRng(42), 50), take(createRng(42), 50));
});

test('createRng gives different sequences for different seeds', () => {
  assert.notDeepEqual(take(createRng(1), 10), take(createRng(2), 10));
});

test('createRng only returns floats in [0, 1)', () => {
  for (const value of take(createRng(7), 10000)) {
    assert.ok(value >= 0 && value < 1, `out of range: ${value}`);
  }
});

test('randomSeed maps Math.random onto an unsigned 32-bit integer', (t) => {
  const cases = [[0, 0], [0.5, 2147483648], [1 - 2 ** -53, 4294967295]];
  for (const [random, seed] of cases) {
    t.mock.method(Math, 'random', () => random);
    assert.equal(randomSeed(), seed);
    t.mock.restoreAll();
  }
});

test('shuffle returns a permutation and leaves the input untouched', () => {
  const items = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const shuffled = shuffle(items, createRng(3));
  assert.notStrictEqual(shuffled, items);
  assert.notDeepEqual(shuffled, [...items]);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), [...items]);
});

test('shuffle is Fisher-Yates: step i swaps position i with a pick from 0..i', () => {
  assert.deepEqual(shuffle([1, 2, 3, 4], () => 0), [2, 3, 4, 1]);
  assert.deepEqual(shuffle([1, 2, 3, 4], () => 0.999), [1, 2, 3, 4]);
});

test('shuffle is deterministic per seed', () => {
  const items = Array.from({ length: 20 }, (_, index) => index);
  assert.deepEqual(shuffle(items, createRng(99)), shuffle(items, createRng(99)));
  assert.notDeepEqual(shuffle(items, createRng(99)), shuffle(items, createRng(100)));
});

test('shuffle is unbiased: every order of three items is about equally likely', () => {
  const rng = createRng(2024);
  const counts = new Map();
  for (let run = 0; run < 6000; run += 1) {
    const order = shuffle(['a', 'b', 'c'], rng).join('');
    counts.set(order, (counts.get(order) ?? 0) + 1);
  }
  assert.equal(counts.size, 6);
  for (const [order, count] of counts) {
    assert.ok(count > 850 && count < 1150, `${order} came up ${count} times out of 6000`);
  }
});
