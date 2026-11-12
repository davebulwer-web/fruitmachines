// Golden Goal: a pub football machine, the fourth in the series. All amounts in pence.
// The trail is the league table: numbers on the reels climb it. From place 5 a feature is offered;
// TAKE it, or GAMBLE it up a place at evens (losing loses the trail). Features change as you climb:
// a Free Kick or a double-money Big Free Kick (steppers: the reels step up and down, press SHOOT when a win shows), the Cup Run board
// (snakes and ladders up the pitch: through balls jump you forward, tackles knock you back, a red card
// ends it, collect your prize any time), Hat Trick free spins and, at the top, the Trophy jackpot.
// Any reel win of £1 or more earns a Penalty: shoot left, middle or right, and a goal pays the win again.
// Symbols keep the classic codes but show football art (see art.js): CH whistle, LE boot, OR scarf,
// PL shirt, ME ball, BE corner flag, BA medal, SE trophy, QM question mark.

const strip = s => s.trim().split(/\s+/);
const W3 = (a, b, c, pays) => ({ pattern: [a, b, c], pays });

export default {
  id: 'golden-goal',
  name: 'Golden Goal',
  tagline: 'Pub football. Climb the league, take a Free Kick, go on a Cup Run and score Penalties to win it again.',
  symbolNames: { CH: 'WHISTLE', LE: 'BOOT', OR: 'SCARF', PL: 'SHIRT', ME: 'BALL', BE: 'FLAG', BA: 'MEDAL', SE: 'TROPHY' },
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

  // Repeat chance as a Penalty: a reel win of £1 or more earns a spot kick to win it again.
  repeat: { from: 100, feature: 'penalty' },

  // The league table: 10 places. From place 5 a feature is offered: take it, or gamble up a place at evens.
  trail: {
    length: 10,
    featureFrom: 5,
    offer: 'gamble',
    gamble: { to: 'next', chance: 0.5 },
    heldChance: 0.30,
    heldPerRung: 0.04,
    skillStopMax: 6,
    rungs: { 5: 'freeKick', 6: 'bigFreeKick', 7: 'cupRun', 8: 'cupRunPlus', 9: 'hatTrick', 10: 'trophy' },
  },

  questionOptions: [
    { value: 'held', weight: 28 }, { value: 'numbersInView', weight: 15 }, { value: 'boost', weight: 18 },
    { value: 'skillStop', weight: 10 }, { value: 'addAgain', weight: 14 }, { value: 'nudges', weight: 10 },
    { value: 'freeKick', weight: 5 },
  ],

  // The Cup Run: 30 squares up the pitch (snakes and ladders). The prize is the last cash square you
  // landed on (it can go down as well as up). Ln = through ball to square n, Sn = tackle back to square n,
  // LOSE = red card. Reaching the last square wins the cup.
  boards: {
    cup: {
      name: 'CUP RUN', maxRolls: 8,
      words: { ladder: 'THROUGH BALL!', snake: 'TACKLED!', lose: 'RED CARD!' },
      squares: `GO:20 30 L8 40 20 S1 50 F:freeKick 60 L16
                LOSE 80 40 S6 100 F:freeKick 120 L23 S11 150
                LOSE 180 F:hatTrick 200 S14 250 300 LOSE 350 400`,
    },
  },

  features: {
    freeKick: { name: 'Free Kick', short: 'FREE|KICK', kind: 'stepper', steps: 10, button: 'SHOOT' },
    bigFreeKick: { name: 'Big Free Kick', short: 'FREE KICK|X2', kind: 'stepper', steps: 12, button: 'SHOOT', multiplier: 2 },
    cupRun: { name: 'Cup Run', short: 'CUP|RUN', kind: 'diceBoard', board: 'cup' },
    cupRunPlus: { name: 'Cup Run Plus', short: 'CUP RUN|PLUS', kind: 'diceBoard', board: 'cup', start: 6 },
    hatTrick: { name: 'Hat Trick', short: 'HAT|TRICK', kind: 'freeSpins', spins: 3 },
    trophy: { name: 'Trophy', short: 'TROPHY', kind: 'jackpot', repeatChance: 0 },
    penalty: { name: 'Penalty', short: 'PENALTY', kind: 'penalty', chance: 0.35 },
  },

  // How the simulated players treat this machine (see sim/strategy.js).
  bots: { sensible: { takeAt: 6, takeAtHeld: 6, diceCollectAt: 150 }, gambler: { takeAt: 10, takeAtHeld: 10, diceCollectAt: 300 } },

  // Payout test band (sim/rtp-test.js).
  test: { rtp: [0.88, 0.93], featureEvery: [10, 60] },
};
