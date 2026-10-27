// Entry point: holds the current game, wires the controls to the views and drives the clock.
import { createBoardView } from './board-view.js';
import { SIZES } from './deck.js';
import { PLAYER_COUNTS, createDemoGame, createGame, flip, resolve, tick } from './game.js';
import { createHudView } from './hud-view.js';
import { DEFAULT_LANGUAGE, isLanguage, otherLanguage, translate } from './i18n.js';
import { loadBest, recordWin } from './records.js';
import { normalizeSettings } from './settings.js';
import { storage } from './storage.js';
import { createWinView } from './win-view.js';

/** How long a mismatched pair stays visible before it turns back. */
const MISMATCH_DELAY_MS = 900;
/** Pause between the last match and the win overlay, so the final flip is seen. */
const WIN_DELAY_MS = 700;

const sizeSelect = document.getElementById('size-select');
const playersSelect = document.getElementById('players-select');
const languageButton = document.getElementById('lang-toggle');
const announcer = document.getElementById('announcer');

const savedLanguage = storage.get('lang');
let language = isLanguage(savedLanguage) ? savedLanguage : DEFAULT_LANGUAGE;
let game = null;
let best = null;
let frame = 0;
let lastFrameTime = null;
let resolveTimer = 0;
let winTimer = 0;

const t = (key, params) => translate(language, key, params);
const board = createBoardView(document.getElementById('board'), pickCard);
const hud = createHudView(document);
const winView = createWinView(document.getElementById('win-dialog'), newGame);

/** Board size and player count as the selects show them. */
function selectedSettings() {
  return normalizeSettings({ size: sizeSelect.value, players: Number(playersSelect.value) });
}

/** Replaces the current game, stopping its clock and pending timers. */
function startGame(next) {
  clearTimeout(resolveTimer);
  clearTimeout(winTimer);
  stopClock();
  winView.close();
  game = next;
  best = loadBest(storage, game.size);
  sizeSelect.value = game.size;
  playersSelect.value = String(game.players);
  board.build(game, t);
  hud.render(game, best, t);
}

/** Starts a fresh game with the size and player count from the selects. */
function newGame() {
  startGame(createGame(selectedSettings()));
}

/** Redraws everything that depends on the game state. */
function render() {
  board.update(game, t);
  hud.render(game, best, t);
}

/** Puts `text` in the live region that screen readers announce. */
function say(key, params) {
  announcer.textContent = t(key, params);
}

/** Flips the picked card if the rules allow it and reacts to what happened. */
function pickCard(index) {
  const { state, event } = flip(game, index);
  if (event.type === 'rejected') return;
  game = state;
  render();
  startClock();
  const symbolAt = (i) => t(`symbol.${game.cards[i].symbol}`);
  if (event.type === 'first') say('sayFirst', { symbol: symbolAt(event.index) });
  if (event.type === 'mismatch') {
    say('sayMismatch', { symbol: symbolAt(event.indices[1]) });
    resolveTimer = setTimeout(endMissedTurn, MISMATCH_DELAY_MS);
  }
  if (event.type === 'match') {
    say('sayMatch', { symbol: symbolAt(event.indices[1]) });
    if (event.won) finishGame();
  }
}

/** Turns a mismatched pair back down; in a two-player game the turn passes. */
function endMissedTurn() {
  game = resolve(game);
  render();
  if (game.players > 1) say('sayTurn', { player: t('player', { n: game.current + 1 }) });
}

/** Stops the clock, saves a solo record and shows the win overlay. */
function finishGame() {
  stopClock();
  const record = recordWin(storage, game);
  best = record.best;
  hud.render(game, best, t);
  winTimer = setTimeout(() => winView.show(game, record, t), WIN_DELAY_MS);
}

/** Runs the clock from the player's first flip; it pauses while the page is hidden. */
function startClock() {
  if (frame || game.status !== 'playing') return;
  lastFrameTime = null;
  frame = requestAnimationFrame(onFrame);
}

function stopClock() {
  cancelAnimationFrame(frame);
  frame = 0;
}

function onFrame(now) {
  if (lastFrameTime !== null) {
    game = tick(game, now - lastFrameTime);
    hud.renderTime(game.elapsedMs);
  }
  lastFrameTime = now;
  frame = game.status === 'playing' ? requestAnimationFrame(onFrame) : 0;
}

/** Fills the select menus once; their labels are translated by applyLanguage. */
function buildSelects() {
  sizeSelect.replaceChildren(...SIZES.map(({ id }) => new Option(id, id)));
  playersSelect.replaceChildren(...PLAYER_COUNTS.map((count) => new Option(String(count), String(count))));
}

/** Writes every static and generated text in the current language. */
function applyLanguage() {
  document.documentElement.lang = language;
  document.title = t('documentTitle');
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const element of document.querySelectorAll('[data-i18n-label]')) element.setAttribute('aria-label', t(element.dataset.i18nLabel));
  for (const element of document.querySelectorAll('[data-i18n-title]')) element.title = t(element.dataset.i18nTitle);
  SIZES.forEach(({ cols, rows }, index) => { sizeSelect.options[index].text = t('sizeOption', { cols, rows }); });
  PLAYER_COUNTS.forEach((count, index) => { playersSelect.options[index].text = t(`playerCount${count}`); });
}

function toggleLanguage() {
  language = otherLanguage(language);
  storage.set('lang', language);
  // The last announcement is in the old language.
  announcer.textContent = '';
  applyLanguage();
  render();
}

function changeSettings() {
  storage.set('settings', selectedSettings());
  newGame();
}

document.getElementById('new-game').addEventListener('click', newGame);
languageButton.addEventListener('click', toggleLanguage);
sizeSelect.addEventListener('change', changeSettings);
playersSelect.addEventListener('change', changeSettings);
document.addEventListener('visibilitychange', () => { lastFrameTime = null; });
// Arrow keys pressed while nothing has focus jump into the card grid.
document.addEventListener('keydown', (event) => {
  if (event.target === document.body && event.key.startsWith('Arrow')) {
    event.preventDefault();
    board.focus();
  }
});

buildSelects();
applyLanguage();
startGame(new URLSearchParams(window.location.search).has('demo')
  ? createDemoGame()
  : createGame(normalizeSettings(storage.get('settings'))));
