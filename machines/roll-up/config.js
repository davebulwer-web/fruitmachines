// Roll Up: a travelling funfair machine, the second in the series. All amounts in pence.
// The trail is classic: numbers on the reels climb it, from step 4 the feature is offered and you
// TAKE it or GAMBLE it up a step. Every step enters the same feature game, the looping Fairground
// board, and higher steps give more tokens (shots) and a better start. On the board you roll round and round:
// squares add money, win features, bank nudges, raise the level or give extra shots; MISS loses a
// shot, HALF halves the bank and END finishes it.
// Symbols keep the classic codes but show funfair art (see art.js): CH rubber duck, LE toffee apple,
// OR candy floss, PL ice cream, ME coconut, BE goldfish, BA ticket, SE big wheel, QM question mark.

const strip = s => s.trim().split(/\s+/);
const W3 = (a, b, c, pays) => ({ pattern: [a, b, c], pays });
const board = (name, shots, level = 0) => ({ name, kind: 'loopBoard', board: 'fair', shots, level });

export default {
  id: 'roll-up',
  name: 'Roll Up',
  tagline: 'Funfair. Climb the trail, then roll round and round the Fairground board for cash and rides.',
  symbolNames: { CH: 'DUCK', LE: 'APPLE', OR: 'CANDY', PL: 'ICE CREAM', ME: 'COCONUT', BE: 'GOLDFISH', BA: 'TICKET', SE: 'BIG WHEEL' },
  stake: 10,
  startCredit: 500,
  jackpot: 400,
  questionSymbol: 'QM',
  progression: { type: 'trail' },

  // 20 stops per reel, listed top to bottom; nudging moves to the next stop.
  reels: [
    strip('CH1 LE OR QM PL CH ME LE BE OR SE PL1 CH LE2 OR OR BA PL ME BE'),
    strip('LE CH1 PL OR QM ME LE BE CH OR PL SE LE1 OR LE CH BA PL2 BE ME'),
    strip('OR LE1 PL CH QM LE ME OR BE PL1 LE SE OR CH PL LE BA CH BE ME2'),
  ],

  paytable: [
    W3('SE', 'SE', 'SE', 400), W3('BA', 'BA', 'BA', 250), W3('BE', 'BE', 'BE', 200),
    W3('ME', 'ME', 'ME', 160), W3('PL', 'PL', 'PL', 140), W3('OR', 'OR', 'OR', 120),
    W3('LE', 'LE', 'LE', 100), W3('CH', 'CH', 'CH', 80), W3('CH', 'CH', '*', 30), W3('CH', '*', '*', 10),
  ],

  holdChance: 0.09,
  nudgeChance: 0.035,
  nudgeCounts: [
    { value: 1, weight: 35 }, { value: 2, weight: 30 }, { value: 3, weight: 20 },
    { value: 4, weight: 10 }, { value: 5, weight: 5 },
  ],

  // A 10-step trail. From step 5 the board is offered: take it, or gamble up a step at evens.
  trail: {
    length: 10,
    featureFrom: 5,
    offer: 'gamble',
    gamble: { to: 'next', chance: 0.5 },
    heldChance: 0.30,
    heldPerRung: 0.04,
    skillStopMax: 6,
    rungs: { 5: 'board2', 6: 'board3', 7: 'board4', 8: 'board5', 9: 'board6', 10: 'board10' },
  },

  questionOptions: [
    { value: 'held', weight: 30 }, { value: 'numbersInView', weight: 15 }, { value: 'boost', weight: 20 },
    { value: 'skillStop', weight: 10 }, { value: 'addAgain', weight: 15 }, { value: 'nudges', weight: 10 },
  ],

  // The Fairground: 20 squares round a 6 by 6 ring, clockwise from GO at the top left.
  // Level prizes are paid when the board ends, for the level you reached.
  boards: {
    fair: {
      name: 'THE FAIRGROUND', shotName: 'TOKEN', cols: 6, rows: 6,
      squares: `GO 20 N1 F:winSpin UP 20
                MISS F:hiLo S1 20
                F:pick 20 UP HALF F:doubleUp END
                20 F:freeHolds 50 MISS`,
      levels: [
        { label: '20P', cash: 20 },
        { label: 'NUDGES', feature: 'nudgeBank' },
        { label: 'FREE RIDES', feature: 'freeHolds' },
        { label: '£1.50', cash: 150 },
      ],
    },
  },

  features: {
    // trail rungs: the board with more shots (and a level start) the higher you go
    board2: board('2 TOKENS', 2),
    board3: board('3 TOKENS', 3),
    board4: board('4 TOKENS', 4),
    board5: board('5 TOKENS', 5),
    board6: board('6 TOKENS', 6, 1),
    board10: board('10 TOKENS', 10, 2),

    // features won on the board
    winSpin: {
      name: 'Hook a Duck', short: 'HOOK A|DUCK', kind: 'winSpin', multiplier: 1,
      wins: [
        { value: W3('CH', 'CH', '*', 30), weight: 40 }, { value: W3('CH', 'CH', 'CH', 80), weight: 35 },
        { value: W3('LE', 'LE', 'LE', 100), weight: 25 },
      ],
    },
    hiLo: { name: 'Hi Lo', short: 'HI|LO', kind: 'hiLo', steps: [20, 40, 80, 150, 250, 400] },
    pick: {
      name: 'Coconut Shy', short: 'COCONUT|SHY', kind: 'pick', boxes: 3,
      prizes: [
        { value: { label: '20P', cash: 20 }, weight: 30 }, { value: { label: '50P', cash: 50 }, weight: 30 },
        { value: { label: '£1', cash: 100 }, weight: 20 }, { value: { label: 'HOOK A DUCK', feature: 'winSpin' }, weight: 15 },
        { value: { label: '£3', cash: 300 }, weight: 5 },
      ],
    },
    doubleUp: { name: 'Dodgems', short: 'DODGEMS|X2', kind: 'freeSpins', spins: 3, holds: false, multiplier: 2 },
    freeHolds: { name: 'Free Rides', short: 'FREE|RIDES', kind: 'freeSpins', spins: 3 },
    nudgeBank: { name: 'Nudge Bank', short: 'NUDGE|BANK', kind: 'nudges', bank: true, counts: [{ value: 1, weight: 50 }, { value: 2, weight: 35 }, { value: 3, weight: 15 }] },
  },

  // Cash ladder steps (shown on the glass; not used by a feature on this machine yet).
  ladder: { steps: [20, 40, 60, 100, 150, 200, 300, 400] },

  // How the simulated players treat this machine (see sim/strategy.js).
  bots: { sensible: { takeAt: 5, takeAtHeld: 5, loopCollectAt: 250 }, gambler: { takeAt: 10, takeAtHeld: 10 } },

  // Payout test band (sim/rtp-test.js).
  test: { rtp: [0.88, 0.93], featureEvery: [10, 60] },
};
