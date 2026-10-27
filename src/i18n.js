// English and Turkish UI strings plus a small translate helper. Pure module.

/** Supported languages. */
export const LANGUAGES = Object.freeze(['en', 'tr']);

/** Language shown until the player picks another one. */
export const DEFAULT_LANGUAGE = 'en';

/**
 * Every visible string, per language. `{name}` marks a placeholder.
 * @type {Readonly<Record<string, Readonly<Record<string, string>>>>}
 */
export const STRINGS = Object.freeze({
  en: Object.freeze({
    documentTitle: 'Memory · Card-matching game',
    title: 'Memory',
    newGame: 'New game',
    languageButton: 'TR',
    languageLabel: 'TR: switch to Turkish',
    moves: 'Moves',
    time: 'Time',
    best: 'Best',
    bestHint: 'Best solo result on this board: fewest moves, then fastest time',
    bestValue: '{moves} · {time}',
    none: '—',
    board: 'Board',
    sizeOption: '{cols} × {rows}',
    players: 'Players',
    playerCount1: '1 player',
    playerCount2: '2 players',
    pairs: 'Pairs',
    pairsValue: '{found} / {total}',
    player: 'Player {n}',
    cards: 'Cards',
    cardDown: 'Card {n}, face down',
    cardUp: 'Card {n}, {symbol}',
    cardFound: 'Card {n}, {symbol}, found',
    hint: 'Arrow keys move · Enter or Space flips',
    source: 'Source on GitHub',
    sayFirst: '{symbol}',
    sayMatch: '{symbol}: a match!',
    sayMismatch: '{symbol}: no match',
    sayTurn: "{player}'s turn",
    winSolo: 'You won!',
    winPlayer: '{player} wins!',
    winDraw: "It's a draw!",
    allFound: 'All {pairs} pairs found.',
    newBest: 'New best!',
    playAgain: 'Play again',
    close: 'Close',
    'symbol.sun': 'sun',
    'symbol.moon': 'moon',
    'symbol.leaf': 'leaf',
    'symbol.drop': 'drop',
    'symbol.star': 'star',
    'symbol.wave': 'wave',
    'symbol.mountain': 'mountain',
    'symbol.fish': 'fish',
    'symbol.cloud': 'cloud',
    'symbol.bolt': 'lightning bolt',
    'symbol.flower': 'flower',
    'symbol.tree': 'tree',
    'symbol.snowflake': 'snowflake',
    'symbol.flame': 'flame',
    'symbol.planet': 'planet',
    'symbol.rainbow': 'rainbow',
    'symbol.clover': 'clover',
    'symbol.gem': 'gem',
  }),
  tr: Object.freeze({
    documentTitle: 'Hafıza · Kart eşleştirme oyunu',
    title: 'Hafıza',
    newGame: 'Yeni oyun',
    languageButton: 'EN',
    languageLabel: 'EN: İngilizceye geç',
    moves: 'Hamle',
    time: 'Süre',
    best: 'En iyi',
    bestHint: 'Bu tahtadaki en iyi tek oyunculu sonuç: en az hamle, sonra en kısa süre',
    bestValue: '{moves} · {time}',
    none: '—',
    board: 'Tahta',
    sizeOption: '{cols} × {rows}',
    players: 'Oyuncu',
    playerCount1: '1 oyuncu',
    playerCount2: '2 oyuncu',
    pairs: 'Çiftler',
    pairsValue: '{found} / {total}',
    player: 'Oyuncu {n}',
    cards: 'Kartlar',
    cardDown: 'Kart {n}, kapalı',
    cardUp: 'Kart {n}, {symbol}',
    cardFound: 'Kart {n}, {symbol}, bulundu',
    hint: 'Ok tuşlarıyla gez · Enter ya da Boşluk ile çevir',
    source: "Kaynak kodu GitHub'da",
    sayFirst: '{symbol}',
    sayMatch: '{symbol}: eşleşti!',
    sayMismatch: '{symbol}: eşleşmedi',
    sayTurn: 'Sıra: {player}',
    winSolo: 'Kazandın!',
    winPlayer: '{player} kazandı!',
    winDraw: 'Berabere!',
    allFound: 'Tüm {pairs} çift bulundu.',
    newBest: 'Yeni rekor!',
    playAgain: 'Tekrar oyna',
    close: 'Kapat',
    'symbol.sun': 'güneş',
    'symbol.moon': 'ay',
    'symbol.leaf': 'yaprak',
    'symbol.drop': 'damla',
    'symbol.star': 'yıldız',
    'symbol.wave': 'dalga',
    'symbol.mountain': 'dağ',
    'symbol.fish': 'balık',
    'symbol.cloud': 'bulut',
    'symbol.bolt': 'şimşek',
    'symbol.flower': 'çiçek',
    'symbol.tree': 'ağaç',
    'symbol.snowflake': 'kar tanesi',
    'symbol.flame': 'alev',
    'symbol.planet': 'gezegen',
    'symbol.rainbow': 'gökkuşağı',
    'symbol.clover': 'yonca',
    'symbol.gem': 'mücevher',
  }),
});

/**
 * Tells whether `value` is one of LANGUAGES.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isLanguage(value) {
  return LANGUAGES.includes(value);
}

/**
 * The language the toggle button switches to.
 * @param {string} language
 * @returns {string}
 */
export function otherLanguage(language) {
  return language === 'tr' ? 'en' : 'tr';
}

/**
 * Looks up a string and fills in its `{name}` placeholders. Unknown languages fall
 * back to English, unknown keys to the key itself; unknown placeholders stay as they are.
 * @param {string} language
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function translate(language, key, params = {}) {
  const tables = [STRINGS[isLanguage(language) ? language : DEFAULT_LANGUAGE], STRINGS[DEFAULT_LANGUAGE]];
  const table = tables.find((strings) => Object.hasOwn(strings, key));
  const template = table ? table[key] : key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name) =>
    (Object.hasOwn(params, name) ? String(params[name]) : placeholder));
}
