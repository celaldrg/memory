// Number formatting for the HUD and the win overlay. Pure module.

/**
 * Formats a duration as m:ss, or h:mm:ss from one hour on. Partial seconds are
 * dropped, and negative or non-finite input counts as zero.
 * @param {number} ms Duration in milliseconds.
 * @returns {string} For example "0:47" or "1:02:05".
 */
export function formatTime(ms) {
  const totalSeconds = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}
