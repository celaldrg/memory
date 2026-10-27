// Original card artwork. Every symbol is a handful of simple SVG shapes on a
// 64 x 64 canvas, drawn in its own color. Pure data: card-art.js turns it into
// SVG elements, and the tests check that every symbol has art.

const INK = 'rgba(15, 23, 42, 0.45)';
const SNOW = '#f8fafc';
const CENTER = 32;

const round = (value) => Math.round(value * 100) / 100;
const xy = ([x, y]) => `${x} ${y}`;

/** The point `radius` away from (cx, cy) at `angle` radians (0 = right, clockwise). */
function polar(cx, cy, radius, angle) {
  return [round(cx + radius * Math.cos(angle)), round(cy + radius * Math.sin(angle))];
}

/** Attributes of a rounded stroke without fill. */
function stroke(color, width) {
  return { fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
}

/** Attributes of a filled shape whose corners are softened by a stroke in the same color. */
function soft(color, width) {
  return { fill: color, stroke: color, 'stroke-width': width, 'stroke-linejoin': 'round' };
}

/** Evenly spaced rays around the center, from radius `from` to radius `to`, as one path. */
function raysPath(count, from, to) {
  return Array.from({ length: count }, (_, ray) => {
    const angle = (ray * 2 * Math.PI) / count - Math.PI / 2;
    return `M${xy(polar(CENTER, CENTER, from, angle))}L${xy(polar(CENTER, CENTER, to, angle))}`;
  }).join('');
}

/** Corner points of a star with `tips` points around (cx, cy), the first tip pointing up. */
function starPoints(cx, cy, tips, outer, inner) {
  return Array.from({ length: tips * 2 }, (_, corner) => {
    const angle = (corner * Math.PI) / tips - Math.PI / 2;
    return xy(polar(cx, cy, corner % 2 === 0 ? outer : inner, angle));
  }).join(' ');
}

/** Six arms of `length` with a V-shaped twig on each, as one path. */
function snowflakePath(length) {
  return Array.from({ length: 6 }, (_, arm) => {
    const angle = (arm * Math.PI) / 3 - Math.PI / 2;
    const [bx, by] = polar(CENTER, CENTER, length * 0.55, angle);
    const twig = (turn) => xy(polar(bx, by, length * 0.36, angle + turn));
    return `M${CENTER} ${CENTER}L${xy(polar(CENTER, CENTER, length, angle))}M${twig(-0.75)}L${bx} ${by}L${twig(0.75)}`;
  }).join('');
}

/** A heart pointing down at (32, 31); three of them turned around that point make a clover. */
const HEART = 'M32 31C27 27 21 23 21 17.5 21 14 23.5 11.5 26.5 11.5 29 11.5 31 13 32 15 '
  + '33 13 35 11.5 37.5 11.5 40.5 11.5 43 14 43 17.5 43 23 37 27 32 31Z';

/** One artwork entry: its main color and the shapes `draw` makes with it. */
const art = (color, draw) => Object.freeze({ color, parts: draw(color) });

/**
 * Artwork per symbol id (see SYMBOLS in deck.js): the main color and the SVG
 * shapes, each as [tag, attributes].
 * @type {Readonly<Record<string, {color: string, parts: Array<[string, Record<string, string|number>]>}>>}
 */
export const SYMBOL_ART = Object.freeze({
  sun: art('#fbbf24', (c) => [
    ['circle', { cx: 32, cy: 32, r: 11, fill: c }],
    ['path', { d: raysPath(8, 18, 26), ...stroke(c, 4) }],
  ]),
  moon: art('#c7d2fe', (c) => [
    ['path', { d: 'M29 12A20 20 0 1 0 48.4 39.8A17 17 0 0 1 29 12Z', fill: c }],
    ['circle', { cx: 21, cy: 37, r: 3, fill: INK }],
    ['circle', { cx: 29, cy: 45, r: 2, fill: INK }],
  ]),
  leaf: art('#a3e635', (c) => [
    ['path', { d: 'M14 50C14 28 28 14 50 14C50 36 36 50 14 50Z', fill: c }],
    ['path', { d: 'M18 46L40 24', ...stroke(INK, 2.5) }],
    ['path', { d: 'M9 55L15 49', ...stroke(c, 4) }],
  ]),
  drop: art('#38bdf8', (c) => [
    ['path', { d: 'M32 8C26 18 15 29 15 40a17 17 0 0 0 34 0C49 29 38 18 32 8Z', fill: c }],
    ['path', { d: 'M23 41a9 9 0 0 0 7 8', ...stroke('rgba(255, 255, 255, 0.7)', 3) }],
  ]),
  star: art('#fde047', (c) => [
    ['polygon', { points: starPoints(32, 34, 5, 24, 10.5), ...soft(c, 3) }],
  ]),
  wave: art('#2dd4bf', (c) => [
    ['path', { d: 'M8 26c5-6 11-6 16 0s11 6 16 0 11-6 16 0', ...stroke(c, 5) }],
    ['path', { d: 'M8 40c5-6 11-6 16 0s11 6 16 0 11-6 16 0', ...stroke(c, 5) }],
  ]),
  mountain: art('#a78bfa', (c) => [
    ['polygon', { points: '30 52 45 24 60 52', fill: c, opacity: 0.6 }],
    ['polygon', { points: '45 24 49.3 32 45 29.5 40.7 32', fill: SNOW, opacity: 0.8 }],
    ['polygon', { points: '4 52 24 14 44 52', fill: c }],
    ['polygon', { points: '24 14 30.8 27 27.5 24.5 24 28 20.5 24.5 17.2 27', fill: SNOW }],
  ]),
  fish: art('#fb923c', (c) => [
    ['polygon', { points: '42 32 56 21 53 32 56 43', ...soft(c, 2) }],
    ['path', { d: 'M9 32C17 20 34 18 45 32C34 46 17 44 9 32Z', fill: c }],
    ['path', { d: 'M29 25c2.5 4.5 2.5 9.5 0 14', ...stroke(INK, 2.5) }],
    ['circle', { cx: 19, cy: 30, r: 2.6, fill: '#0f172a' }],
  ]),
  cloud: art('#e2e8f0', (c) => [
    ['path', { d: 'M18 49h28a10 10 0 0 0 0-20 13 13 0 0 0-25-3 10 10 0 0 0-3 23z', fill: c }],
  ]),
  bolt: art('#e879f9', (c) => [
    ['polygon', { points: '38 6 14 36 29 36 24 58 50 26 35 26', ...soft(c, 2.5) }],
  ]),
  flower: art('#f472b6', (c) => [
    ...[0, 72, 144, 216, 288].map((turn) =>
      ['ellipse', { cx: 32, cy: 19, rx: 8, ry: 11.5, fill: c, transform: `rotate(${turn} 32 32)` }]),
    ['circle', { cx: 32, cy: 32, r: 7, fill: '#fde047' }],
  ]),
  tree: art('#34d399', (c) => [
    ['rect', { x: 28, y: 42, width: 8, height: 13, rx: 2, fill: '#d97706' }],
    ['polygon', { points: '32 6 47 26 40 26 52 42 12 42 24 26 17 26', ...soft(c, 2) }],
  ]),
  snowflake: art('#a5f3fc', (c) => [
    ['path', { d: snowflakePath(24), ...stroke(c, 3.5) }],
  ]),
  flame: art('#f87171', (c) => [
    ['path', { d: 'M32 6c4 10 16 16 16 31a16 16 0 0 1-32 0c0-7 3-12 7-16 0 6 3 9 6 10-1-9 1-17 3-25z', fill: c }],
    ['path', { d: 'M32 30c2 6 8 8 8 14a8 8 0 0 1-16 0c0-4 2-7 4-9 0 3 2 5 3 5 0-4 0-7 1-10z', fill: '#fbbf24' }],
  ]),
  planet: art('#60a5fa', (c) => [
    ['path', { d: 'M6 32a26 9 0 0 1 52 0', ...stroke('#bfdbfe', 3), transform: 'rotate(-20 32 32)' }],
    ['circle', { cx: 32, cy: 32, r: 14, fill: c }],
    ['circle', { cx: 27, cy: 26, r: 4, fill: 'rgba(255, 255, 255, 0.3)' }],
    ['path', { d: 'M6 32a26 9 0 0 0 52 0', ...stroke('#bfdbfe', 3), transform: 'rotate(-20 32 32)' }],
  ]),
  rainbow: art('#fb7185', () => [
    ['path', { d: 'M10 43a22 22 0 0 1 44 0', ...stroke('#f87171', 5) }],
    ['path', { d: 'M16 43a16 16 0 0 1 32 0', ...stroke('#fde047', 5) }],
    ['path', { d: 'M22 43a10 10 0 0 1 20 0', ...stroke('#38bdf8', 5) }],
    ['ellipse', { cx: 11, cy: 45, rx: 8, ry: 5, fill: '#e2e8f0' }],
    ['ellipse', { cx: 53, cy: 45, rx: 8, ry: 5, fill: '#e2e8f0' }],
  ]),
  clover: art('#4ade80', (c) => [
    ['path', { d: 'M32 33q2 13 10 21', ...stroke(c, 4) }],
    ...[0, 120, 240].map((turn) => ['path', { d: HEART, fill: c, transform: `rotate(${turn} 32 31)` }]),
  ]),
  gem: art('#c084fc', (c) => [
    ['polygon', { points: '20 12 44 12 56 26 32 56 8 26', ...soft(c, 2) }],
    ['polygon', { points: '26 26 32 12 38 26', fill: 'rgba(255, 255, 255, 0.25)' }],
    ['path', { d: 'M8 26h48M20 12l6 14 6 30M44 12l-6 14-6 30M26 26l6-14 6 14', ...stroke('rgba(250, 232, 255, 0.75)', 1.8) }],
  ]),
});
