// Oche Cash: a pub darts machine. All amounts in pence.
// Symbols: CH cherry, LE lemon, OR orange, PL plum, ME melon, BE bell, BA bar, SE seven, QM question mark.
// A digit after a symbol is the dart number it carries, e.g. LE2.

const strip = s => s.trim().split(/\s+/);

const W3 = (a, b, c, pays) => ({ pattern: [a, b, c], pays });
const seg = s => s.trim().split(/\s+/).map(t => { const [label, pays] = t.split(':'); return { label, pays: Number(pays) }; });

export default {
  id: 'oche-cash',
  name: 'Oche Cash',
  tagline: 'Pub darts. Climb the Checkout trail round the board, if Feature Held lets you keep it.',
  stake: 10,
  startCredit: 500,
  jackpot: 400,
  questionSymbol: 'QM',
  progression: { type: 'trail' },   // the Checkout trail below offers the features

  // 20 stops per reel, listed top to bottom; nudging moves to the next stop.
  reels: [
    strip('CH1 LE OR QM PL CH ME LE BE OR SE PL1 CH LE2 OR OR BA PL ME BE'),
    strip('LE CH1 PL OR QM ME LE BE CH OR PL SE LE1 OR LE CH BA PL2 BE ME'),
    strip('OR LE1 PL CH QM LE ME OR BE PL1 LE SE OR CH PL LE BA CH BE ME2'),
  ],

  // Checked in order; the first match pays.
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

  // The Checkout trail: 12 rungs round the dartboard. Features are offered from rung 4.
  trail: {
    length: 12,
    featureFrom: 4,
    heldChance: 0.30,          // chance the Feature Held lamp lights...
    heldPerRung: 0.04,         // ...plus this per rung climbed
    skillStopMax: 8,           // a ? skill stop runs round rungs 1 to 8
    rungs: { 4: 'arrows', 5: 'doubleTop', 6: 'checkout', 7: 'roundTheBoard', 8: 'trebleTop', 9: 'superHolds', 10: 'shanghai', 11: 'cashpot', 12: 'nineDarter' },
  },

  // What a single question mark on the win line can give.
  questionOptions: [
    { value: 'held', weight: 25 }, { value: 'numbersInView', weight: 20 }, { value: 'boost', weight: 20 },
    { value: 'skillStop', weight: 10 }, { value: 'addAgain', weight: 15 }, { value: 'nudges', weight: 10 },
  ],

  features: {
    arrows: { name: 'Arrows', kind: 'nudges', counts: [{ value: 3, weight: 50 }, { value: 4, weight: 30 }, { value: 5, weight: 20 }] },
    doubleTop: {
      name: 'Double Top', kind: 'winSpin', multiplier: 2,
      wins: [
        { value: W3('CH', '*', '*', 10), weight: 30 }, { value: W3('CH', 'CH', '*', 30), weight: 40 },
        { value: W3('CH', 'CH', 'CH', 80), weight: 20 }, { value: W3('LE', 'LE', 'LE', 100), weight: 10 },
      ],
    },
    checkout: { name: 'Checkout', kind: 'ladder', entry: [{ value: 1, weight: 40 }, { value: 2, weight: 30 }, { value: 3, weight: 20 }, { value: 4, weight: 10 }] },
    roundTheBoard: {
      name: 'Round the Board', kind: 'boardStop', skill: false,
      // 20 segments clockwise from the top; a random stop, Cancel slows the lamp
      board: seg('BULL:400 20p:20 60p:60 BUST:0 40p:40 £1:100 20p:20 80p:80 £2:200 40p:40 BUST:0 60p:60 £1:100 20p:20 £1.50:150 40p:40 80p:80 20p:20 £1:100 60p:60'),
    },
    trebleTop: {
      name: 'Treble Top', kind: 'boardStop', skill: true,
      // a true skill stop, so the prizes are smaller: hit the bull for £2
      board: seg('BULL:200 20p:20 40p:40 BUST:0 60p:60 20p:20 £1:100 20p:20 40p:40 BUST:0 80p:80 20p:20 60p:60 40p:40 £1:100 20p:20 BUST:0 40p:40 80p:80 20p:20'),
    },
    superHolds: { name: 'Super Holds', kind: 'freeSpins', spins: 3 },
    shanghai: {
      name: 'Shanghai', kind: 'mystery', repeatChance: 0.25,
      picks: [
        { value: 'arrows', weight: 10 }, { value: 'doubleTop', weight: 15 }, { value: 'checkout', weight: 15 },
        { value: 'roundTheBoard', weight: 15 }, { value: 'trebleTop', weight: 15 }, { value: 'superHolds', weight: 15 },
        { value: 'cashpot', weight: 10 }, { value: 'nineDarter', weight: 5 },
      ],
    },
    cashpot: {
      name: 'Cash Pot', kind: 'streak', endChance: 0.45,
      wins: [
        { value: W3('CH', '*', '*', 10), weight: 20 }, { value: W3('CH', 'CH', '*', 30), weight: 25 },
        { value: W3('CH', 'CH', 'CH', 80), weight: 20 }, { value: W3('LE', 'LE', 'LE', 100), weight: 15 },
        { value: W3('OR', 'OR', 'OR', 120), weight: 10 }, { value: W3('PL', 'PL', 'PL', 140), weight: 6 },
        { value: W3('BE', 'BE', 'BE', 200), weight: 4 },
      ],
    },
    nineDarter: { name: 'Nine Darter', kind: 'jackpot', repeatChance: 0.2 },
  },

  // Cash ladder used by Checkout; the top step is the jackpot.
  ladder: { steps: [20, 40, 60, 100, 150, 200, 300, 400] },

  // Payout test band (sim/rtp-test.js).
  test: { rtp: [0.89, 0.93], featureEvery: [20, 60] },
};
