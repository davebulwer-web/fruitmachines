// Night Cab: a late-night taxi machine, the third in the series. All amounts in pence.
// The trail is a cab route: numbers on the reels move the cab along it. From stop 5 you are offered the
// City Round board; TAKE it, or SPIN ON (paid) to climb for more fares, at the risk of losing the trail.
// The City Round is a looping board: each roll spends a fare. TAXI squares start a lamp racing round
// the board and you press STOP to ride to the square you want. The POT square wins the Cash Pot,
// a fare meter that grows on losing plays. Any reel win of £1.50 or more lights REPEAT and may pay again.
// Symbols keep the classic codes but show night-out art (see art.js): CH fuzzy dice, LE traffic cone,
// OR traffic lights, PL moon, ME keys, BE fare meter, BA clock tower, SE black cab, QM question mark.

const strip = s => s.trim().split(/\s+/);
const W3 = (a, b, c, pays) => ({ pattern: [a, b, c], pays });
const board = (name, shots, level = 0) => ({ name, kind: 'loopBoard', board: 'city', shots, level });

export default {
  id: 'night-cab',
  name: 'Night Cab',
  tagline: 'Late-night taxi. Ride the trail to the City Round, hail a Taxi to pick your square and grab the Cash Pot.',
  symbolNames: { CH: 'DICE', LE: 'CONE', OR: 'LIGHTS', PL: 'MOON', ME: 'KEYS', BE: 'METER', BA: 'CLOCK', SE: 'CAB' },
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

  holdChance: 0.07,
  nudgeChance: 0.03,
  nudgeCounts: [
    { value: 1, weight: 35 }, { value: 2, weight: 30 }, { value: 3, weight: 20 },
    { value: 4, weight: 10 }, { value: 5, weight: 5 },
  ],

  // Repeat chance: a reel win of £1.50 or more may pay again.
  repeat: { from: 150, chance: 0.15 },

  // The Cash Pot (shown as a fare meter): after a losing play it may tick up 10p from its 20p start, to a top of £4.
  cashPot: { start: 20, add: 10, addChance: 0.04, max: 400 },

  // An 8-stop route. From stop 5 the City Round is offered: take it, or spin on for more fares.
  trail: {
    length: 8,
    featureFrom: 5,
    offer: 'spinOn',
    heldChance: 0.30,
    heldPerRung: 0.04,
    skillStopMax: 6,
    rungs: { 5: 'board2', 6: 'board3', 7: 'board5', 8: 'board8' },
  },

  questionOptions: [
    { value: 'held', weight: 28 }, { value: 'numbersInView', weight: 15 }, { value: 'boost', weight: 18 },
    { value: 'skillStop', weight: 10 }, { value: 'addAgain', weight: 14 }, { value: 'nudges', weight: 10 },
    { value: 'pot', weight: 2 },
  ],

  // The City Round: 20 squares round a 6 by 6 ring, clockwise from GO at the top left.
  boards: {
    city: {
      name: 'CITY ROUND', shotName: 'FARE', cols: 6, rows: 6,
      squares: `GO 20 TAXI F:greenLight UP 20
                MISS F:lostProperty S1 POT
                F:hiLo 20 UP HALF F:rushHour END
                20 TAXI 50 MISS`,
      levels: [
        { label: '20P', cash: 20 },
        { label: 'NUDGES', feature: 'nudgeBank' },
        { label: 'NIGHT BUS', feature: 'nightBus' },
        { label: '£2', cash: 200 },
      ],
    },
  },

  features: {
    // trail stops: the board with more fares (and a level start) the further you ride
    board2: board('2 FARES', 2),
    board3: board('3 FARES', 3),
    board5: board('5 FARES', 5),
    board8: board('8 FARES', 8, 1),

    // features won on the board
    greenLight: {
      name: 'Green Light', short: 'GREEN|LIGHT', kind: 'winSpin', multiplier: 1,
      wins: [
        { value: W3('CH', 'CH', '*', 30), weight: 55 }, { value: W3('CH', 'CH', 'CH', 80), weight: 30 },
        { value: W3('LE', 'LE', 'LE', 100), weight: 15 },
      ],
    },
    hiLo: { name: 'Hi Lo', short: 'HI|LO', kind: 'hiLo', steps: [20, 40, 80, 150, 250, 400] },
    lostProperty: {
      name: 'Lost Property', short: 'LOST|PROPERTY', kind: 'pick', boxes: 3,
      prizes: [
        { value: { label: '20P', cash: 20 }, weight: 30 }, { value: { label: '50P', cash: 50 }, weight: 30 },
        { value: { label: '£1', cash: 100 }, weight: 18 }, { value: { label: 'GREEN LIGHT', feature: 'greenLight' }, weight: 12 },
        { value: { label: 'CASH POT', feature: 'pot' }, weight: 6 }, { value: { label: '£3', cash: 300 }, weight: 4 },
      ],
    },
    rushHour: { name: 'Rush Hour', short: 'RUSH|HOUR X2', kind: 'freeSpins', spins: 3, holds: false, multiplier: 2 },
    nightBus: { name: 'Night Bus', short: 'NIGHT|BUS', kind: 'freeSpins', spins: 3 },
    nudgeBank: { name: 'Nudge Bank', short: 'NUDGE|BANK', kind: 'nudges', bank: true, counts: [{ value: 1, weight: 50 }, { value: 2, weight: 35 }, { value: 3, weight: 15 }] },
    pot: { name: 'Cash Pot', short: 'CASH|POT', kind: 'cashPot' },
  },

  // How the simulated players treat this machine (see sim/strategy.js).
  bots: { sensible: { takeAt: 4, takeAtHeld: 6, loopCollectAt: 250 }, gambler: { takeAt: 8, takeAtHeld: 8 } },

  // Payout test band (sim/rtp-test.js).
  test: { rtp: [0.88, 0.93], featureEvery: [10, 60] },
};
