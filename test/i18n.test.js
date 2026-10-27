import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { SYMBOLS } from '../src/deck.js';
import { PLAYER_COUNTS } from '../src/game.js';
import { DEFAULT_LANGUAGE, LANGUAGES, STRINGS, isLanguage, otherLanguage, translate } from '../src/i18n.js';
import { CARD_LABELS } from '../src/view-model.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test('English is the default and Turkish the other language', () => {
  assert.deepEqual([...LANGUAGES], ['en', 'tr']);
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.deepEqual(Object.keys(STRINGS).sort(), [...LANGUAGES].sort());
});

test('English and Turkish define the same keys, none of them empty', () => {
  assert.deepEqual(Object.keys(STRINGS.tr).sort(), Object.keys(STRINGS.en).sort());
  for (const language of LANGUAGES) {
    for (const [key, text] of Object.entries(STRINGS[language])) {
      assert.ok(text.trim().length > 0, `${language}.${key} is empty`);
    }
  }
});

test('both languages use the same placeholders in every string', () => {
  for (const [key, text] of Object.entries(STRINGS.en)) {
    assert.deepEqual(placeholders(STRINGS.tr[key]), placeholders(text), key);
  }
});

test('every card symbol has a name in both languages', () => {
  for (const symbol of SYMBOLS) {
    for (const language of LANGUAGES) {
      assert.ok(STRINGS[language][`symbol.${symbol}`], `${language}: symbol.${symbol}`);
    }
  }
});

test('the language button shows the code of the language it switches to', () => {
  assert.equal(translate('en', 'languageButton'), 'TR');
  assert.equal(translate('tr', 'languageButton'), 'EN');
  assert.equal(otherLanguage('en'), 'tr');
  assert.equal(otherLanguage('tr'), 'en');
});

test('translate fills placeholders and falls back safely', () => {
  assert.equal(translate('en', 'player', { n: 2 }), 'Player 2');
  assert.equal(translate('tr', 'player', { n: 2 }), 'Oyuncu 2');
  assert.equal(translate('tr', 'winPlayer', { player: 'Oyuncu 1' }), 'Oyuncu 1 kazandı!');
  assert.equal(translate('en', 'player'), 'Player {n}', 'a missing parameter keeps its placeholder');
  assert.equal(translate('en', 'player', { toString: 'x' }), 'Player {n}', 'only own parameters count');
  assert.equal(translate('de', 'newGame'), 'New game', 'unknown language falls back to English');
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
});

test('translate only reads its own string tables', () => {
  assert.equal(translate('en', 'toString'), 'toString', 'inherited object members are not strings');
  assert.equal(translate('tr', 'constructor'), 'constructor');
  assert.equal(translate('constructor', 'newGame'), 'New game', 'inherited members are not languages');
  assert.equal(translate('__proto__', 'close'), 'Close');
});

test('isLanguage accepts only the supported codes', () => {
  assert.equal(isLanguage('en'), true);
  assert.equal(isLanguage('tr'), true);
  for (const value of ['EN', 'de', '', null, undefined, 1]) assert.equal(isLanguage(value), false);
});

test('every string key used by index.html and the UI modules exists', () => {
  const html = read('index.html');
  const used = [...html.matchAll(/data-i18n(?:-label|-title)?="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(used.length > 10, 'index.html marks its texts with data-i18n');
  for (const file of readdirSync(new URL('src/', root)).filter((name) => name.endsWith('.js'))) {
    const source = read(`src/${file}`);
    used.push(...[...source.matchAll(/\b(?:t|say)\('([\w.]+)'/g)].map((match) => match[1]));
  }
  // Keys built at run time: card labels, win headlines and player-count options.
  used.push(...Object.values(CARD_LABELS), 'winSolo', 'winPlayer', 'winDraw');
  used.push(...PLAYER_COUNTS.map((count) => `playerCount${count}`));
  for (const key of new Set(used)) {
    for (const language of LANGUAGES) assert.ok(Object.hasOwn(STRINGS[language], key), `${language} lacks "${key}"`);
  }
});
