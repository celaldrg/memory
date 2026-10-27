// Plans a burst of confetti drawn with plain CSS shapes. Pure module: randomness is injected.

/** Colors of the confetti pieces. */
export const CONFETTI_COLORS = Object.freeze(['#8b5cf6', '#a78bfa', '#c084fc', '#fbbf24', '#f472b6', '#22d3ee', '#4ade80']);

/** Shapes the stylesheet can draw (see the .confetti rules in style.css). */
export const CONFETTI_SHAPES = Object.freeze(['square', 'circle', 'triangle', 'strip']);

/**
 * @typedef {object} ConfettiPiece
 * @property {string} shape One of CONFETTI_SHAPES.
 * @property {string} color One of CONFETTI_COLORS.
 * @property {number} left Start position, in percent of the screen width (0-100).
 * @property {number} size Edge length in pixels.
 * @property {number} delayMs Wait before the piece starts falling.
 * @property {number} durationMs Time the fall takes.
 * @property {number} drift Sideways travel in pixels during the fall (negative = left).
 * @property {number} spin Rotation in degrees during the fall.
 */

/**
 * Plans `count` confetti pieces. The same random sequence always gives the same burst.
 * @param {number} count
 * @param {() => number} rng Random source returning floats in [0, 1).
 * @returns {ConfettiPiece[]}
 */
export function planConfetti(count, rng) {
  const pick = (items) => items[Math.floor(rng() * items.length)];
  const between = (min, max) => Math.round(min + rng() * (max - min));
  return Array.from({ length: count }, () => ({
    shape: pick(CONFETTI_SHAPES),
    color: pick(CONFETTI_COLORS),
    left: between(0, 100),
    size: between(7, 13),
    delayMs: between(0, 900),
    durationMs: between(2200, 3800),
    drift: between(-90, 90),
    spin: between(-720, 720),
  }));
}
