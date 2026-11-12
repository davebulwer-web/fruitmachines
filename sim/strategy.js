// Player strategies used by the simulator. The "sensible" player is the reference
// that the advertised payout is measured against.

import { lineWin, lineSymbols, stopsAt, prepareReels } from '../engine/reels.js';

// Expected line win for each hold choice, cached by which reels are held and what they show.
export function makeHoldAdvisor(config) {
  const strips = prepareReels(config);
  const cache = new Map();
  const n = strips.length;
  const ev = (mask, positions) => {
    const heldSyms = strips.map((s, i) => (mask & (1 << i) ? s[positions[i]].sym : '-'));
    const key = mask + ':' + heldSyms.join(',');
    let v = cache.get(key);
    if (v !== undefined) return v;
    let total = 0, count = 0;
    const syms = [];
    const walk = i => {
      if (i === n) { total += lineWin(config, syms); count++; return; }
      if (mask & (1 << i)) { syms[i] = heldSyms[i]; walk(i + 1); return; }
      for (const s of strips[i]) { syms[i] = s.sym; walk(i + 1); }
    };
    walk(0);
    v = total / count;
    cache.set(key, v);
    return v;
  };
  return positions => {
    let best = 0, bestEv = ev(0, positions);
    for (let mask = 1; mask < 1 << n; mask++) {
      const v = ev(mask, positions);
      if (v > bestEv + 1e-9) { bestEv = v; best = mask; }
    }
    return strips.map((_, i) => !!(best & (1 << i)));
  };
}

// Best sequence of nudges: a win if one is reachable (nudging stops at the first win),
// otherwise the position that puts the most dart numbers on the line.
export function bestNudges(config, positions, nudges) {
  const strips = prepareReels(config);
  let best = { win: 0, nums: -1, seq: [] };
  const search = (pos, left, seq) => {
    const stops = stopsAt(config, pos);
    const win = lineWin(config, stops.map(s => s.sym));
    if (win > 0) { if (win > best.win) best = { win, nums: 0, seq: [...seq] }; return; }
    if (best.win === 0) {
      const nums = stops.reduce((a, s) => a + s.num, 0);
      if (nums > best.nums) best = { win: 0, nums, seq: [...seq] };
    }
    if (left === 0) return;
    for (let r = 0; r < pos.length; r++) {
      const next = [...pos];
      next[r] = (next[r] + 1) % strips[r].length;
      seq.push(r);
      search(next, left - 1, seq);
      seq.pop();
    }
  };
  search([...positions], nudges, []);
  return best.seq;
}

// Player profiles. Each plug-in phase reads what it needs from the profile in its bot();
// a machine can override any value with config.bots = { sensible: { takeAt: 5 }, ... }.
export const profiles = {
  // Holds the best reels, nudges to the best win, takes a trail feature at rung 6+ (8+ if held),
  // collects a cash ladder at £1 or more, rolls a dice board until £1, hits skill stops half the time.
  sensible: { smartHolds: true, smartNudges: true, skill: 0.5, takeAt: 6, takeAtHeld: 8, gambleBelow: 100, diceCollectAt: 100 },
  // Never holds or nudges, takes whatever it is offered, collects at once, no skill.
  lazy: { smartHolds: false, smartNudges: false, skill: 0, takeAt: 0, takeAtHeld: 0, gambleBelow: 0, diceCollectAt: 0 },
  // Sensible, but always gambles and climbs for the top.
  gambler: { smartHolds: true, smartNudges: true, skill: 0.5, takeAt: 9, takeAtHeld: Infinity, gambleBelow: Infinity, diceCollectAt: 300 },
};

export function makeStrategy(config, name = 'sensible') {
  if (!profiles[name]) throw new Error(`unknown strategy "${name}"`);
  const profile = { ...profiles[name], ...(config.bots?.[name] || {}) };
  const advise = profile.smartHolds ? makeHoldAdvisor(config) : null;
  return {
    profile,
    skill: profile.skill,
    holds: m => (advise && m.holdsOffered ? advise(m.positions) : []),
    nudges: m => (profile.smartNudges ? bestNudges(config, m.positions, m.nudges) : []),
  };
}

export const strategies = Object.fromEntries(Object.keys(profiles).map(k => [k, config => makeStrategy(config, k)]));
