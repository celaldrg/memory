import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/storage.js';

/** In-memory stand-in for localStorage. */
function memoryBackend() {
  const data = new Map();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, String(value)); },
  };
}

/** Runs `body` with globalThis.localStorage replaced by `descriptor`, then restores it. */
async function withLocalStorage(descriptor, body) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor });
  try {
    await body();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
}

test('values round-trip as JSON under a "memory:" key prefix', () => {
  const backend = memoryBackend();
  const store = createStorage(() => backend);
  assert.equal(store.set('lang', 'tr'), true);
  assert.equal(store.set('best-4x4', { moves: 9, timeMs: 1200 }), true);
  assert.equal(store.get('lang', 'en'), 'tr');
  assert.deepEqual(store.get('best-4x4'), { moves: 9, timeMs: 1200 });
  assert.deepEqual([...backend.data.keys()], ['memory:lang', 'memory:best-4x4']);
});

test('missing or unreadable values return the fallback', () => {
  const backend = memoryBackend();
  const store = createStorage(() => backend);
  assert.equal(store.get('missing', 'fallback'), 'fallback');
  assert.equal(store.get('missing'), null);
  backend.data.set('memory:broken', '{oops');
  assert.equal(store.get('broken', 42), 42);
});

test('a throwing backend never crashes the game', () => {
  const store = createStorage(() => ({
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
  }));
  assert.equal(store.get('lang', 'en'), 'en');
  assert.equal(store.set('lang', 'tr'), false);
});

test('a missing or blocked backend never crashes the game', () => {
  const getters = [() => null, () => { throw new Error('SecurityError'); }];
  for (const getBackend of getters) {
    const store = createStorage(getBackend);
    assert.equal(store.get('lang', 'en'), 'en');
    assert.equal(store.set('lang', 'tr'), false);
  }
});

test('the default store leaves localStorage alone at import time and survives it being blocked', async () => {
  let reads = 0;
  const blocked = { get() { reads += 1; throw new Error('SecurityError'); } };
  await withLocalStorage(blocked, async () => {
    const { storage } = await import('../src/storage.js?blocked');
    assert.equal(reads, 0, 'no localStorage access while importing');
    assert.equal(storage.get('lang', 'en'), 'en');
    assert.equal(storage.set('lang', 'tr'), false);
    assert.equal(reads, 2);
  });
});

test('the default store uses localStorage when it is available', async () => {
  const backend = memoryBackend();
  await withLocalStorage({ value: backend }, async () => {
    const { storage } = await import('../src/storage.js?available');
    assert.equal(storage.set('lang', 'tr'), true);
    assert.equal(storage.get('lang', 'en'), 'tr');
    assert.equal(backend.data.get('memory:lang'), '"tr"');
  });
});
