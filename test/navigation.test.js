import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFocus } from '../src/navigation.js';

// A 4x4 board:   0  1  2  3
//                4  5  6  7
//                8  9 10 11
//               12 13 14 15
const move = (index, key) => nextFocus(index, key, 4, 16);

test('arrow keys move one card in their direction', () => {
  assert.equal(move(5, 'ArrowRight'), 6);
  assert.equal(move(5, 'ArrowLeft'), 4);
  assert.equal(move(5, 'ArrowUp'), 1);
  assert.equal(move(5, 'ArrowDown'), 9);
});

test('focus stops at the edges of the board', () => {
  assert.equal(move(3, 'ArrowRight'), 3);
  assert.equal(move(4, 'ArrowLeft'), 4);
  assert.equal(move(2, 'ArrowUp'), 2);
  assert.equal(move(13, 'ArrowDown'), 13);
  assert.equal(move(0, 'ArrowLeft'), 0);
  assert.equal(move(15, 'ArrowRight'), 15);
});

test('Home and End jump to the ends of the row', () => {
  assert.equal(move(6, 'Home'), 4);
  assert.equal(move(6, 'End'), 7);
  assert.equal(move(12, 'Home'), 12);
});

test('works on wider boards too', () => {
  assert.equal(nextFocus(7, 'ArrowDown', 6, 36), 13);
  assert.equal(nextFocus(11, 'ArrowRight', 6, 36), 11);
  assert.equal(nextFocus(30, 'End', 6, 36), 35);
  assert.equal(nextFocus(19, 'ArrowDown', 4, 20), 19);
});

test('other keys do not move focus', () => {
  for (const key of ['Enter', ' ', 'a', 'Tab', 'Escape', 'toString']) assert.equal(move(5, key), null);
});
