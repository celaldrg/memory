import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYMBOLS } from '../src/deck.js';
import { SYMBOL_ART } from '../src/symbols.js';

const SHAPE_TAGS = new Set(['circle', 'ellipse', 'path', 'polygon', 'rect']);
const NUMBER = /^-?\d+(\.\d+)?$/;

test('every card symbol has artwork, and only those symbols', () => {
  assert.deepEqual(Object.keys(SYMBOL_ART).sort(), [...SYMBOLS].sort());
});

test('every symbol has its own color', () => {
  const colors = SYMBOLS.map((symbol) => SYMBOL_ART[symbol].color);
  for (const color of colors) assert.match(color, /^#[0-9a-f]{6}$/);
  assert.equal(new Set(colors).size, colors.length);
});

test('artwork is made of simple shapes with plain attributes only', () => {
  for (const symbol of SYMBOLS) {
    const { parts } = SYMBOL_ART[symbol];
    assert.ok(parts.length > 0, symbol);
    for (const [tag, attributes] of parts) {
      assert.ok(SHAPE_TAGS.has(tag), `${symbol}: <${tag}>`);
      for (const [name, value] of Object.entries(attributes)) {
        assert.match(name, /^[a-z-]+$/, `${symbol}: ${name}`);
        assert.ok(!name.startsWith('on') && name !== 'href', `${symbol}: ${name}`);
        assert.ok(!String(value).includes('url('), `${symbol}: ${name} references something external`);
      }
    }
  }
});

test('computed geometry is finite and stays on the 64 x 64 canvas', () => {
  for (const symbol of SYMBOLS) {
    for (const [, attributes] of SYMBOL_ART[symbol].parts) {
      const geometry = attributes.points ?? (/^M/.test(attributes.d ?? '') ? attributes.d : null);
      if (!geometry) continue;
      for (const token of String(geometry).match(/-?\d+(\.\d+)?/g)) {
        assert.match(token, NUMBER);
        assert.ok(Math.abs(Number(token)) <= 64, `${symbol}: ${token}`);
      }
    }
  }
});
