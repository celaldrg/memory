import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime } from '../src/format.js';

test('formatTime shows minutes and zero-padded seconds', () => {
  const cases = [[0, '0:00'], [999, '0:00'], [1000, '0:01'], [47000, '0:47'], [59999, '0:59'], [60000, '1:00'], [61500, '1:01'], [3599000, '59:59']];
  for (const [ms, text] of cases) assert.equal(formatTime(ms), text, `${ms} ms`);
});

test('formatTime adds hours from one hour on', () => {
  assert.equal(formatTime(3600000), '1:00:00');
  assert.equal(formatTime(3661000), '1:01:01');
  assert.equal(formatTime(36005000), '10:00:05');
});

test('formatTime treats negative and non-finite input as zero', () => {
  for (const ms of [-1, -60000, Number.NaN, Number.POSITIVE_INFINITY, undefined]) assert.equal(formatTime(ms), '0:00');
});
