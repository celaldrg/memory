// Keyboard movement over the card grid. Pure module.

/**
 * Where keyboard focus goes from `index` on a grid `cols` cards wide that holds
 * `count` cards. Arrow keys move one card and stop at the edges; Home and End
 * jump to the first and last card of the row.
 * @param {number} index Card that has focus now.
 * @param {string} key A KeyboardEvent `key` value.
 * @param {number} cols Cards per row.
 * @param {number} count Cards on the board.
 * @returns {number|null} The card to focus, or null when `key` does not move focus.
 */
export function nextFocus(index, key, cols, count) {
  const column = index % cols;
  const rowStart = index - column;
  const targets = {
    ArrowLeft: column > 0 ? index - 1 : index,
    ArrowRight: column < cols - 1 && index + 1 < count ? index + 1 : index,
    ArrowUp: index >= cols ? index - cols : index,
    ArrowDown: index + cols < count ? index + cols : index,
    Home: rowStart,
    End: Math.min(rowStart + cols, count) - 1,
  };
  return Object.hasOwn(targets, key) ? targets[key] : null;
}
