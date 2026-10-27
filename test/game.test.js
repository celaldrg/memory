import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SIZES } from '../src/deck.js';
import {
  PLAYER_COUNTS, canFlip, createDemoGame, createGame, flip, getPhase, getWinners, resolve, tick,
} from '../src/game.js';

// Helpers that read the board like a player with perfect memory.
const symbolAt = (state, index) => state.cards[index].symbol;
const partnerOf = (state, index) =>
  state.cards.findIndex((card, i) => i !== index && card.symbol === symbolAt(state, index));
const firstClosed = (state) => state.cards.findIndex((card) => !card.faceUp);
const otherClosed = (state, index) =>
  state.cards.findIndex((card) => !card.faceUp && card.symbol !== symbolAt(state, index));

/** Flips the given cards in order and returns the resulting state. */
const play = (state, ...indices) => indices.reduce((current, index) => flip(current, index).state, state);

/** The current player finds the pair of the first face-down card. */
function matchTurn(state) {
  const first = firstClosed(state);
  return play(state, first, partnerOf(state, first));
}

/** The current player flips two different symbols, then the turn is resolved. */
function missTurn(state) {
  const first = firstClosed(state);
  return resolve(play(state, first, otherClosed(state, first)));
}

/** The current player finds every remaining pair. */
function finish(state) {
  let current = state;
  const remaining = current.cards.filter((card) => !card.matched).length / 2;
  for (let turn = 0; turn < remaining; turn += 1) current = matchTurn(current);
  return current;
}

const newGame = (options = {}) => createGame({ seed: 7, ...options });

function countSymbols(cards) {
  const counts = new Map();
  for (const { symbol } of cards) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  return counts;
}

describe('createGame', () => {
  test('starts a solo 4x4 game with every card face down', () => {
    const state = newGame();
    assert.equal(state.size, '4x4');
    assert.equal(state.cards.length, 16);
    assert.ok(state.cards.every((card) => !card.faceUp && !card.matched && card.matchedBy === null));
    assert.deepEqual(state.open, []);
    assert.equal(state.players, 1);
    assert.equal(state.current, 0);
    assert.deepEqual(state.scores, [0]);
    assert.equal(state.moves, 0);
    assert.equal(state.elapsedMs, 0);
    assert.equal(state.status, 'ready');
    assert.equal(getPhase(state), 'first');
  });

  test('deals each symbol exactly twice on every board size', () => {
    for (const { id, cols, rows } of SIZES) {
      for (let seed = 0; seed < 100; seed += 1) {
        const state = createGame({ size: id, seed });
        assert.equal(state.cols, cols);
        assert.equal(state.rows, rows);
        assert.equal(state.cards.length, cols * rows);
        for (const [symbol, count] of countSymbols(state.cards)) {
          assert.equal(count, 2, `${id}, seed ${seed}: ${symbol} appears ${count} times`);
        }
      }
    }
  });

  test('is deterministic per seed, and an injected rng wins over the seed', () => {
    assert.deepEqual(createGame({ seed: 5 }), createGame({ seed: 5 }));
    assert.notDeepEqual(createGame({ seed: 5 }).cards, createGame({ seed: 6 }).cards);
    assert.deepEqual(createGame({ seed: 5, rng: () => 0 }).cards, createGame({ seed: 6, rng: () => 0 }).cards);
  });

  test('supports one or two players and rejects anything else', () => {
    assert.deepEqual([...PLAYER_COUNTS], [1, 2]);
    assert.deepEqual(newGame({ players: 2 }).scores, [0, 0]);
    for (const players of [0, 3, '2', 1.5]) {
      assert.throws(() => newGame({ players }), RangeError);
    }
    assert.throws(() => newGame({ size: '5x5' }), RangeError);
  });
});

describe('flip and resolve', () => {
  test('the first flip opens one card and starts the game', () => {
    const { state, event } = flip(newGame(), 3);
    assert.deepEqual(event, { type: 'first', index: 3 });
    assert.equal(state.cards[3].faceUp, true);
    assert.deepEqual(state.open, [3]);
    assert.equal(state.status, 'playing');
    assert.equal(state.moves, 0);
    assert.equal(getPhase(state), 'second');
  });

  test('a matching second flip keeps both cards open and scores the pair', () => {
    const start = newGame();
    const partner = partnerOf(start, 0);
    const { state, event } = flip(play(start, 0), partner);
    assert.deepEqual(event, { type: 'match', indices: [0, partner], player: 0, won: false });
    for (const index of [0, partner]) {
      assert.deepEqual(state.cards[index], { symbol: symbolAt(start, 0), faceUp: true, matched: true, matchedBy: 0 });
    }
    assert.deepEqual(state.open, []);
    assert.deepEqual(state.scores, [1]);
    assert.equal(state.moves, 1);
    assert.equal(getPhase(state), 'first');
  });

  test('a mismatching second flip keeps both cards visible until resolve()', () => {
    const start = newGame();
    const other = otherClosed(start, 0);
    const { state, event } = flip(play(start, 0), other);
    assert.deepEqual(event, { type: 'mismatch', indices: [0, other], player: 0 });
    assert.ok(state.cards[0].faceUp && state.cards[other].faceUp);
    assert.ok(!state.cards[0].matched && !state.cards[other].matched);
    assert.deepEqual(state.open, [0, other]);
    assert.equal(state.moves, 1);
    assert.equal(getPhase(state), 'mismatch');

    const resolved = resolve(state);
    assert.ok(!resolved.cards[0].faceUp && !resolved.cards[other].faceUp);
    assert.deepEqual(resolved.open, []);
    assert.deepEqual(resolved.scores, [0]);
    assert.equal(resolved.moves, 1);
    assert.equal(getPhase(resolved), 'first');
  });

  test('a third flip is rejected while two unmatched cards are open', () => {
    const start = newGame();
    const pending = play(start, 0, otherClosed(start, 0));
    for (const third of [firstClosed(pending), partnerOf(pending, 0)]) {
      const { state, event } = flip(pending, third);
      assert.deepEqual(event, { type: 'rejected', index: third, reason: 'busy' });
      assert.strictEqual(state, pending);
      assert.equal(state.cards[third].faceUp, false);
      assert.equal(canFlip(pending, third), false);
      assert.equal(canFlip(resolve(pending), third), true);
    }
  });

  test('an open card cannot be flipped again', () => {
    const opened = play(newGame(), 4);
    const { state, event } = flip(opened, 4);
    assert.deepEqual(event, { type: 'rejected', index: 4, reason: 'open' });
    assert.strictEqual(state, opened);
    assert.equal(canFlip(opened, 4), false);
  });

  test('a matched card cannot be flipped again', () => {
    const start = newGame();
    const partner = partnerOf(start, 0);
    const matched = play(start, 0, partner);
    const oneOpen = play(matched, firstClosed(matched));
    for (const state of [matched, oneOpen]) {
      for (const index of [0, partner]) {
        const result = flip(state, index);
        assert.deepEqual(result.event, { type: 'rejected', index, reason: 'matched' });
        assert.strictEqual(result.state, state);
      }
    }
  });

  test('indices outside the board are rejected', () => {
    const state = newGame();
    for (const index of [-1, 16, 1.5, Number.NaN, '3', undefined]) {
      const result = flip(state, index);
      assert.equal(result.event.reason, 'invalid');
      assert.strictEqual(result.state, state);
      assert.equal(canFlip(state, index), false);
    }
  });

  // The board marks a card aria-disabled exactly when canFlip says no.
  test('canFlip agrees with flip for every card at every phase of a turn', () => {
    const start = newGame();
    const pending = play(start, 0, otherClosed(start, 0));
    const states = [start, play(start, 0), pending, play(start, 0, partnerOf(start, 0)), finish(start)];
    for (const state of states) {
      state.cards.forEach((_, index) => {
        assert.equal(canFlip(state, index), flip(state, index).event.type !== 'rejected', `card ${index}`);
      });
    }
    assert.ok(start.cards.every((_, index) => canFlip(start, index)), 'a new game accepts every card');
    assert.ok(pending.cards.every((_, index) => !canFlip(pending, index)), 'no card while a miss is shown');
  });

  test('resolve() does nothing unless a mismatch is pending', () => {
    const start = newGame();
    const states = [start, play(start, 0), play(start, 0, partnerOf(start, 0)), finish(start)];
    for (const state of states) assert.strictEqual(resolve(state), state);
  });

  test('moves count completed turns only', () => {
    let state = play(newGame(), 0);
    assert.equal(state.moves, 0, 'first flip');
    state = play(state, 0);
    assert.equal(state.moves, 0, 'rejected flip');
    state = play(state, otherClosed(state, 0));
    assert.equal(state.moves, 1, 'mismatch');
    state = resolve(state);
    assert.equal(state.moves, 1, 'resolve');
    state = matchTurn(state);
    assert.equal(state.moves, 2, 'match');
  });

  test('flip, resolve and tick never mutate the state they are given', () => {
    const start = newGame();
    const pending = play(start, 0, otherClosed(start, 0));
    for (const state of [start, pending]) {
      const snapshot = structuredClone(state);
      flip(state, firstClosed(state));
      resolve(state);
      tick(state, 1000);
      assert.deepEqual(state, snapshot);
    }
  });
});

describe('winning', () => {
  for (const { id } of SIZES) {
    test(`finding the last pair wins a ${id} game`, () => {
      const start = createGame({ size: id, seed: 11 });
      const pairs = start.cards.length / 2;
      let state = start;
      for (let found = 1; found < pairs; found += 1) state = matchTurn(state);
      assert.equal(state.status, 'playing');

      const last = firstClosed(state);
      const { state: won, event } = flip(play(state, last), partnerOf(state, last));
      assert.deepEqual(event, { type: 'match', indices: [last, partnerOf(state, last)], player: 0, won: true });
      assert.equal(won.status, 'won');
      assert.equal(getPhase(won), 'won');
      assert.ok(won.cards.every((card) => card.matched && card.faceUp));
      assert.equal(won.moves, pairs);
      assert.deepEqual(won.scores, [pairs]);
    });
  }

  test('missed turns add moves but the game still ends once every pair is found', () => {
    const won = finish(missTurn(missTurn(newGame())));
    assert.equal(won.status, 'won');
    assert.equal(won.moves, 8 + 2);
    assert.deepEqual(won.scores, [8]);
  });

  test('no flip is accepted after the win', () => {
    const won = finish(newGame());
    const result = flip(won, 0);
    assert.deepEqual(result.event, { type: 'rejected', index: 0, reason: 'finished' });
    assert.strictEqual(result.state, won);
    assert.equal(canFlip(won, 0), false);
  });
});

describe('timer', () => {
  test('waits for the first flip', () => {
    const state = newGame();
    assert.strictEqual(tick(state, 1000), state);
  });

  test('runs while playing, including while a mismatch is shown', () => {
    let state = tick(tick(play(newGame(), 0), 400), 600);
    assert.equal(state.elapsedMs, 1000);
    state = play(state, otherClosed(state, 0));
    assert.equal(getPhase(state), 'mismatch');
    assert.equal(tick(state, 250).elapsedMs, 1250);
  });

  test('ignores zero, negative and non-finite steps', () => {
    const state = play(newGame(), 0);
    for (const dt of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
      assert.strictEqual(tick(state, dt), state);
    }
  });

  test('stops at the win', () => {
    const won = finish(tick(matchTurn(newGame()), 5000));
    assert.equal(won.elapsedMs, 5000);
    assert.strictEqual(tick(won, 1000), won);
  });
});

describe('two players', () => {
  test('a miss passes the turn, but only once it is resolved', () => {
    const start = newGame({ players: 2 });
    const pending = play(start, 0, otherClosed(start, 0));
    assert.equal(pending.current, 0);
    assert.equal(resolve(pending).current, 1);
  });

  test('turns alternate on every miss', () => {
    let state = newGame({ players: 2 });
    const turns = [];
    for (let turn = 0; turn < 4; turn += 1) {
      turns.push(state.current);
      state = missTurn(state);
    }
    assert.deepEqual(turns, [0, 1, 0, 1]);
  });

  test('a match scores for the current player, who keeps the turn', () => {
    const state = missTurn(newGame({ players: 2 }));
    const first = firstClosed(state);
    const partner = partnerOf(state, first);
    const { state: next, event } = flip(play(state, first), partner);
    assert.deepEqual(event, { type: 'match', indices: [first, partner], player: 1, won: false });
    assert.deepEqual(next.scores, [0, 1]);
    assert.equal(next.current, 1);
    assert.equal(next.cards[first].matchedBy, 1);
    assert.equal(next.cards[partner].matchedBy, 1);

    const back = missTurn(matchTurn(next));
    assert.deepEqual(back.scores, [0, 2]);
    assert.equal(back.current, 0);
  });

  test('a solo player keeps the turn after a miss', () => {
    assert.equal(missTurn(newGame()).current, 0);
  });

  test('getWinners names the player with more pairs, or both on a draw', () => {
    let lead = newGame({ players: 2 });
    for (let turn = 0; turn < 5; turn += 1) lead = matchTurn(lead);
    lead = finish(missTurn(lead));
    assert.equal(lead.status, 'won');
    assert.deepEqual(lead.scores, [5, 3]);
    assert.deepEqual(getWinners(lead), [0]);

    let draw = newGame({ players: 2 });
    for (let turn = 0; turn < 4; turn += 1) draw = matchTurn(draw);
    draw = finish(missTurn(draw));
    assert.deepEqual(draw.scores, [4, 4]);
    assert.deepEqual(getWinners(draw), [0, 1]);

    assert.deepEqual(getWinners(finish(newGame())), [0]);
  });
});

describe('demo board', () => {
  test('is a deterministic solo 4x4 game in mid-play with one card face up', () => {
    const demo = createDemoGame();
    assert.deepEqual(createDemoGame(), demo);
    assert.equal(demo.size, '4x4');
    assert.equal(demo.players, 1);
    assert.equal(demo.status, 'playing');
    assert.equal(getPhase(demo), 'second');
    const matched = demo.cards.filter((card) => card.matched).length;
    assert.ok(matched >= 4 && matched < demo.cards.length, `${matched} matched cards`);
    assert.equal(demo.cards.filter((card) => card.faceUp && !card.matched).length, 1);
    assert.deepEqual(demo.scores, [matched / 2]);
    assert.ok(demo.moves > matched / 2, 'includes missed turns');
    assert.ok(demo.elapsedMs > 0);
    for (const count of countSymbols(demo.cards).values()) assert.equal(count, 2);
  });

  test('continues like a normal game', () => {
    const demo = createDemoGame();
    const [open] = demo.open;
    assert.equal(flip(demo, partnerOf(demo, open)).event.type, 'match');
    assert.equal(finish(resolve(play(demo, partnerOf(demo, open)))).status, 'won');
  });
});
