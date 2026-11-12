// Supermarket: a supermarket machine, the fifth in the series. All amounts in pence.
// The trail is the machine's name: numbers on the reels light the letters of SUPERMARKET one by one,
// adding up as they go. The letters are lost on the next game unless the Feature Held lamp lights,
// so you need a run of good numbers. Light all 11 and the till spins to pick your feature: the
// Trolley Dash board (with SPECIAL OFFER squares that double your bank), Price Check hi-lo, a Lucky Bag
// pick, Buy One Get One Free double-money spins, the Express Till win spin or your Loyalty Points
// (a cash pot that grows on losing plays).
// Symbols keep the classic codes but show shopping art (see art.js): CH carrot, LE milk, OR bread,
// PL cheese, ME beans, BE basket, BA till, SE golden trolley, QM question mark.

const strip = s => s.trim().split(/\s+/);
const W3 = (a, b, c, pays) => ({ pattern: [a, b, c], pays });
const dash = (name, shots, level = 0) => ({ name, short: name.replace(' ', '|'), kind: 'loopBoard', board: 'aisles', shots, level });

export default {
  id: 'supermarket',
  name: 'Supermarket',
  tagline: 'Light all eleven letters of SUPERMARKET, then the till picks your feature: a Trolley Dash, Price Check, Lucky Bag and more.',
  symbolNames: { CH: 'CARROT', LE: 'MILK', OR: 'BREAD', PL: 'CHEESE', ME: 'BEANS', BE: 'BASKET', BA: 'TILL', SE: 'TROLLEY' },
  stake: 10,
  startCredit: 500,
  jackpot: 400,
  questionSymbol: 'QM',
  progression: { type: 'trail' },
  trailLetters: 'SUPERMARKET',

  // 20 stops per reel, listed top to bottom; nudging moves to the next stop.
  reels: [
    strip('CH1 LE OR3 QM PL CH ME2 LE BE OR SE PL4 CH LE1 OR OR2 BA PL ME3 BE'),
    strip('LE CH2 PL OR QM ME3 LE BE1 CH OR4 PL SE LE2 OR LE CH BA3 PL1 BE ME'),
    strip('OR LE1 PL CH3 QM LE ME OR2 BE PL LE4 SE OR CH1 PL LE BA CH BE2 ME3'),
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

  // Loyalty Points: a cash pot that may tick up 10p after a losing play, from 20p to £4.
  cashPot: { start: 20, add: 10, addChance: 0.04, max: 400 },

  // The letters trail: 11 letters; the numbers on the win line add up. Lost on the next game unless
  // the Feature Held lamp lights (more likely the further along you are). The 11th starts the till spin.
  trail: {
    length: 11,
    featureFrom: 11,
    heldChance: 0.10,
    heldPerRung: 0.025,
    auto: true,
    threeNumbersJump: false,
    skillStopMax: 8,
    rungs: { 11: 'till' },
  },

  questionOptions: [
    { value: 'held', weight: 25 }, { value: 'numbersInView', weight: 20 }, { value: 'boost', weight: 15 }, { value: 'skillStop', weight: 15 },
    { value: 'addAgain', weight: 20 }, { value: 'nudges', weight: 15 },
  ],

  // Trolley Dash: 20 squares round a 6 by 6 ring, clockwise from GO at the top left.
  boards: {
    aisles: {
      name: 'TROLLEY DASH', shotName: 'TRIP', cols: 6, rows: 6,
      squares: `GO 20 F:priceCheck UP 30 N1
                MISS F:luckyBag S1 POT
                DOUBLE 20 UP HALF F:bogof END
                20 F:expressTill 50 MISS`,
      levels: [
        { label: '20P', cash: 20 },
        { label: 'NUDGES', feature: 'nudgeBank' },
        { label: 'BOGOF', feature: 'bogof' },
        { label: '£2', cash: 200 },
      ],
    },
  },

  features: {
    // the till: a lamp runs round the aisles and stops at random on your feature
    till: {
      name: 'The Till', short: 'THE|TILL', kind: 'boardStop', skill: false,
      board: [
        { label: '4 TRIPS', feature: 'dash4' }, { label: 'PRICE CHECK', feature: 'priceCheck' },
        { label: '5 TRIPS', feature: 'dash5' }, { label: 'LUCKY BAG', feature: 'luckyBag' },
        { label: '8 TRIPS', feature: 'dash8' }, { label: 'BOGOF', feature: 'bogof' },
        { label: 'EXPRESS TILL', feature: 'expressTill' }, { label: 'LOYALTY', feature: 'loyalty' },
      ],
    },
    dash4: dash('Trolley Dash', 4),
    dash5: dash('Trolley Dash', 5),
    dash8: dash('Trolley Dash', 8, 1),
    priceCheck: { name: 'Price Check', short: 'PRICE|CHECK', kind: 'hiLo', steps: [20, 40, 80, 150, 250, 400] },
    luckyBag: {
      name: 'Lucky Bag', short: 'LUCKY|BAG', kind: 'pick', boxes: 3,
      prizes: [
        { value: { label: '20P', cash: 20 }, weight: 30 }, { value: { label: '50P', cash: 50 }, weight: 30 },
        { value: { label: '£1', cash: 100 }, weight: 18 }, { value: { label: 'EXPRESS TILL', feature: 'expressTill' }, weight: 12 },
        { value: { label: 'LOYALTY', feature: 'loyalty' }, weight: 6 }, { value: { label: '£3', cash: 300 }, weight: 4 },
      ],
    },
    bogof: { name: 'Buy One Get One Free', short: 'BOGOF|X2', kind: 'freeSpins', spins: 3, holds: false, multiplier: 2 },
    expressTill: {
      name: 'Express Till', short: 'EXPRESS|TILL', kind: 'winSpin', multiplier: 1,
      wins: [
        { value: W3('CH', 'CH', '*', 30), weight: 45 }, { value: W3('CH', 'CH', 'CH', 80), weight: 35 },
        { value: W3('LE', 'LE', 'LE', 100), weight: 20 },
      ],
    },
    loyalty: { name: 'Loyalty Points', short: 'LOYALTY|POINTS', kind: 'cashPot' },
    nudgeBank: { name: 'Nudge Bank', short: 'NUDGE|BANK', kind: 'nudges', bank: true, counts: [{ value: 1, weight: 50 }, { value: 2, weight: 35 }, { value: 3, weight: 15 }] },
  },

  bots: { sensible: { loopCollectAt: 250 } },

  // Payout test band (sim/rtp-test.js).
  test: { rtp: [0.88, 0.93], featureEvery: [10, 60] },
};
