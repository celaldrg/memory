// Turns the artwork data from symbols.js into SVG elements for the card faces.
import { SYMBOL_ART } from './symbols.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Creates the decorative SVG drawing of a symbol.
 * @param {string} symbol Symbol id, for example "sun".
 * @returns {SVGSVGElement}
 */
export function createSymbolSvg(symbol) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const [tag, attributes] of SYMBOL_ART[symbol].parts) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) shape.setAttribute(name, String(value));
    svg.append(shape);
  }
  return svg;
}
