// Thrill Park: a theme park machine, the sixth in the series (a big brother to Roll Up's funfair).
// No numbers and no trail: instead some reel stops are a golden RIDE TICKET bonus symbol. Three tickets
// anywhere in the nine visible squares (not just the win line) start the feature at once (one ride); four
// or five give two or three rides. Each ride is a spin of the Ride Wheel: a lamp races round eight rides and you press
// STOP to pick one. Rides: Rollercoaster (a cash ladder you can gamble up), Log Flume (a win spin),
// Ghost Train (pick a carriage), Drop Tower (hi-lo), Carousel (free spins with holds), Water Splash
// (steppers), Teacups (80p) and Pirate Ship (£1.40).
// Symbols keep the classic codes but show theme park art (see art.js): CH balloon, LE hot dog,
// OR popcorn, PL soda, ME park map, BE mascot, BA coaster car, SE castle, BN golden ride ticket.

const strip = s => s.trim().split(/\s+/);
const W3 = (a, b, c, pays) => ({ pattern: [a, b, c], pays });
const tickets = n => ({ name: n === 1 ? 'Ride Wheel' : `${n} Rides`, short: `${n}|RIDE${n === 1 ? '' : 'S'}`, kind: 'series', feature: 'rideWheel', times: n });

export default {
  id: 'thrill-park',
  name: 'Thrill Park',
  tagline: 'Theme park. Three golden ride tickets anywhere on the reels and you are in: stop the Ride Wheel on the ride you want.',
  symbolNames: { CH: 'BALLOON', LE: 'HOT DOG', OR: 'POPCORN', PL: 'SODA', ME: 'MAP', BE: 'MASCOT', BA: 'COASTER', SE: 'CASTLE' },
  stake: 10,
  startCredit: 500,
  jackpot: 400,
  progression: { type: 'scatter' },

  // 20 stops per reel, listed top to bottom; BN is the ride ticket bonus symbol.
  reels: [
    strip('CH LE OR BN PL CH ME LE BE OR SE PL CH LE OR BN BA PL ME BE'),
    strip('LE CH PL OR BN ME LE BE CH BN PL SE LE OR LE CH BA PL BN ME'),
    strip('OR LE PL CH BN LE ME OR BE PL LE SE OR CH PL BN BA CH BE ME'),
  ],

  paytable: [
    W3('SE', 'SE', 'SE', 400), W3('BA', 'BA', 'BA', 250), W3('BE', 'BE', 'BE', 200),
    W3('ME', 'ME', 'ME', 160), W3('PL', 'PL', 'PL', 140), W3('OR', 'OR', 'OR', 120),
    W3('LE', 'LE', 'LE', 100), W3('CH', 'CH', 'CH', 80), W3('CH', 'CH', '*', 30), W3('CH', '*', '*', 10),
  ],

  holdChance: 0.11,
  nudgeChance: 0.045,
  nudgeCounts: [
    { value: 1, weight: 35 }, { value: 2, weight: 30 }, { value: 3, weight: 20 },
    { value: 4, weight: 10 }, { value: 5, weight: 5 },
  ],

  // Bonus symbols: 3 tickets in view give one ride, 4 give two and 5 give three.
  scatter: { symbol: 'BN', min: 3, rungs: { 3: 'rides3', 4: 'rides4', 5: 'rides5' } },

  features: {
    rides3: tickets(1),
    rides4: tickets(2),
    rides5: tickets(3),
    // the Ride Wheel: a skill stop round eight rides (worth = a rough value, for the simulator's aim)
    rideWheel: {
      name: 'Ride Wheel', short: 'RIDE|WHEEL', kind: 'boardStop', skill: true,
      board: [
        { label: 'COASTER', feature: 'coaster', worth: 60 }, { label: 'TEACUPS', pays: 80 },
        { label: 'LOG FLUME', feature: 'logFlume', worth: 60 }, { label: 'GHOST TRAIN', feature: 'ghostTrain', worth: 55 },
        { label: 'PIRATE SHIP', pays: 140 }, { label: 'DROP TOWER', feature: 'dropTower', worth: 35 },
        { label: 'CAROUSEL', feature: 'carousel', worth: 80 }, { label: 'SPLASH', feature: 'splash', worth: 30 },
      ],
    },
    coaster: { name: 'Rollercoaster', short: 'ROLLER|COASTER', kind: 'ladder', steps: [20, 40, 60, 100, 150, 200, 300, 400],
      entry: [{ value: 0, weight: 30 }, { value: 1, weight: 35 }, { value: 2, weight: 25 }, { value: 3, weight: 10 }] },
    logFlume: {
      name: 'Log Flume', short: 'LOG|FLUME', kind: 'winSpin', multiplier: 1,
      wins: [
        { value: W3('CH', 'CH', '*', 30), weight: 45 }, { value: W3('CH', 'CH', 'CH', 80), weight: 35 },
        { value: W3('LE', 'LE', 'LE', 100), weight: 20 },
      ],
    },
    ghostTrain: {
      name: 'Ghost Train', short: 'GHOST|TRAIN', kind: 'pick', boxes: 3,
      prizes: [
        { value: { label: '20P', cash: 20 }, weight: 35 }, { value: { label: '50P', cash: 50 }, weight: 30 },
        { value: { label: '£1', cash: 100 }, weight: 20 }, { value: { label: 'LOG FLUME', feature: 'logFlume' }, weight: 10 },
        { value: { label: '£3', cash: 300 }, weight: 5 },
      ],
    },
    dropTower: { name: 'Drop Tower', short: 'DROP|TOWER', kind: 'hiLo', steps: [20, 40, 80, 150, 250, 400] },
    carousel: { name: 'Carousel', short: 'CAROUSEL', kind: 'freeSpins', spins: 3 },
    splash: { name: 'Water Splash', short: 'WATER|SPLASH', kind: 'stepper', steps: 8, button: 'STOP' },
  },

  // Payout test band (sim/rtp-test.js).
  test: { rtp: [0.88, 0.93], featureEvery: [10, 60] },
};
