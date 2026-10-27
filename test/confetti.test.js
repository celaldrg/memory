import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFETTI_COLORS, CONFETTI_SHAPES, planConfetti } from '../src/confetti.js';
import { createRng } from '../src/rng.js';

test('plans the requested number of pieces', () => {
  assert.equal(planConfetti(70, createRng(1)).length, 70);
  assert.deepEqual(planConfetti(0, createRng(1)), []);
});

test('is deterministic per seed', () => {
  assert.deepEqual(planConfetti(40, createRng(9)), planConfetti(40, createRng(9)));
  assert.notDeepEqual(planConfetti(40, createRng(9)), planConfetti(40, createRng(10)));
});

test('every piece uses a known shape and color and stays in range', () => {
  const pieces = planConfetti(500, createRng(77));
  for (const piece of pieces) {
    assert.ok(CONFETTI_SHAPES.includes(piece.shape));
    assert.ok(CONFETTI_COLORS.includes(piece.color));
    assert.ok(piece.left >= 0 && piece.left <= 100);
    assert.ok(piece.size >= 7 && piece.size <= 13);
    assert.ok(piece.delayMs >= 0 && piece.delayMs <= 900);
    assert.ok(piece.durationMs >= 2200 && piece.durationMs <= 3800);
    assert.ok(Math.abs(piece.drift) <= 90);
    assert.ok(Math.abs(piece.spin) <= 720);
  }
  assert.equal(new Set(pieces.map((piece) => piece.shape)).size, CONFETTI_SHAPES.length, 'all shapes appear');
  assert.equal(new Set(pieces.map((piece) => piece.color)).size, CONFETTI_COLORS.length, 'all colors appear');
});
