import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings.js';

test('a first visit plays a solo 4x4 game', () => {
  assert.deepEqual(DEFAULT_SETTINGS, { size: '4x4', players: 1 });
  for (const value of [null, undefined, 'x', 42, []]) assert.deepEqual(normalizeSettings(value), DEFAULT_SETTINGS);
});

test('valid saved settings are kept', () => {
  assert.deepEqual(normalizeSettings({ size: '6x6', players: 2 }), { size: '6x6', players: 2 });
  assert.deepEqual(normalizeSettings({ size: '4x5', players: 1, extra: true }), { size: '4x5', players: 1 });
});

test('each invalid value falls back to its default on its own', () => {
  assert.deepEqual(normalizeSettings({ size: '5x5', players: 2 }), { size: '4x4', players: 2 });
  assert.deepEqual(normalizeSettings({ size: '6x6', players: 3 }), { size: '6x6', players: 1 });
  assert.deepEqual(normalizeSettings({ size: '6x6', players: '2' }), { size: '6x6', players: 1 });
});
