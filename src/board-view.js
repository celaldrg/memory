// The card grid: one button per card, kept in sync with the game state.
// Pointer, keyboard and assistive-technology input on the grid become pick requests.
import { createSymbolSvg } from './card-art.js';
import { canFlip } from './game.js';
import { nextFocus } from './navigation.js';
import { SYMBOL_ART } from './symbols.js';
import { CARD_LABELS, cardStatus } from './view-model.js';

/** Creates a <span> with a class name and children. */
function span(className, ...children) {
  const element = document.createElement('span');
  element.className = className;
  element.append(...children);
  return element;
}

/** One card: a button holding the back and the face, which a 3D flip swaps. */
function createCard(symbol, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card';
  button.dataset.index = String(index);
  button.style.setProperty('--tone', SYMBOL_ART[symbol].color);
  button.append(span('card-inner', span('card-back'), span('card-face', createSymbolSvg(symbol))));
  button.addEventListener('animationend', () => button.classList.remove('is-pop'));
  return button;
}

/**
 * Creates the board view and starts listening for input on `root`.
 * @param {HTMLElement} root Element that holds the cards.
 * @param {(index: number) => void} onPick Called with the index of the card the player picked.
 * @returns {{build: (state: object, t: Function) => void, update: (state: object, t: Function) => void, focus: () => void}}
 */
export function createBoardView(root, onPick) {
  let buttons = [];
  let cols = 1;
  let focusIndex = 0;
  let shownMatched = new Set();
  let press = null;
  let pickedByPointer = false;

  const indexOf = (target) => {
    const card = target instanceof Element ? target.closest('.card') : null;
    return card && root.contains(card) ? Number(card.dataset.index) : -1;
  };

  /** Roving tabindex: only the card with keyboard focus is in the tab order. */
  function setFocusIndex(index) {
    focusIndex = index;
    buttons.forEach((button, i) => { button.tabIndex = i === index ? 0 : -1; });
  }

  // A tap or click picks a card when it is pressed and released on that same card.
  root.addEventListener('pointerdown', (event) => {
    pickedByPointer = false;
    // Touch captures the pointer to the first card it hits; without this, lifting the
    // finger over another card would still count as a tap on the first one.
    if (event.target.hasPointerCapture(event.pointerId)) event.target.releasePointerCapture(event.pointerId);
    press = event.isPrimary && event.button === 0 ? { id: event.pointerId, index: indexOf(event.target) } : null;
  });
  root.addEventListener('pointerup', (event) => {
    const index = indexOf(event.target);
    if (press && press.id === event.pointerId && press.index === index && index >= 0) {
      pickedByPointer = true;
      setFocusIndex(index);
      onPick(index);
    }
    press = null;
  });
  root.addEventListener('pointercancel', () => { press = null; });
  // Enter, Space and screen readers activate a button with a click that no pointer press preceded.
  root.addEventListener('click', (event) => {
    const handled = pickedByPointer;
    pickedByPointer = false;
    const index = indexOf(event.target);
    if (!handled && index >= 0) onPick(index);
  });
  root.addEventListener('keydown', (event) => {
    pickedByPointer = false;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next = nextFocus(focusIndex, event.key, cols, buttons.length);
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    buttons[next].focus();
  });
  root.addEventListener('focusin', (event) => {
    const index = indexOf(event.target);
    if (index >= 0 && index !== focusIndex) setFocusIndex(index);
  });

  /**
   * Shows the cards of a new game, all with their current look.
   * @param {import('./game.js').GameState} state
   * @param {(key: string, params?: object) => string} t Translate function.
   */
  function build(state, t) {
    cols = state.cols;
    root.style.setProperty('--cols', String(state.cols));
    root.style.setProperty('--rows', String(state.rows));
    buttons = state.cards.map((card, index) => createCard(card.symbol, index));
    shownMatched = new Set(state.cards.flatMap((card, index) => (card.matched ? [index] : [])));
    root.replaceChildren(...buttons);
    setFocusIndex(0);
    update(state, t);
  }

  /**
   * Brings every card in line with `state`; pairs found since the last update pop.
   * Cards that cannot be flipped right now are marked aria-disabled (no hover lift, no pointer cursor).
   * @param {import('./game.js').GameState} state
   * @param {(key: string, params?: object) => string} t Translate function.
   */
  function update(state, t) {
    state.cards.forEach((card, index) => {
      const button = buttons[index];
      const status = cardStatus(state, index);
      button.classList.toggle('is-up', status !== 'down');
      button.classList.toggle('is-open', status === 'open');
      button.classList.toggle('is-miss', status === 'miss');
      button.classList.toggle('is-matched', status === 'matched');
      if (status === 'matched' && !shownMatched.has(index)) {
        shownMatched.add(index);
        button.classList.add('is-pop');
      }
      if (state.players > 1 && card.matched) button.dataset.owner = String(card.matchedBy);
      else delete button.dataset.owner;
      button.setAttribute('aria-disabled', String(!canFlip(state, index)));
      button.setAttribute('aria-label', t(CARD_LABELS[status], { n: index + 1, symbol: t(`symbol.${card.symbol}`) }));
    });
  }

  /** Moves keyboard focus to the card that last had it. */
  function focus() {
    buttons[focusIndex]?.focus();
  }

  return { build, update, focus };
}
