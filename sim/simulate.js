// Payout simulator: plays the real engine many times and reports the payout (RTP).
// Usage: node sim/simulate.js [--machine oche-cash] [--plays 10000000] [--strategy sensible|lazy|gambler] [--seed 1] [--sessions 2000] [--json]

import { pathToFileURL } from 'node:url';
import { Machine } from '../engine/machine.js';
import { createRng } from '../engine/rng.js';
import { makeStrategy } from './strategy.js';

// Drive the machine through whatever phase it is in until it is idle or wants a paid spin.
// Core phases are handled here; plug-in phases use their own bot(m, profile) to choose an action.
export function resolve(m, s, rng, record) {
  for (let guard = 0; guard < 500; guard++) {
    switch (m.phase) {
      case 'nudge': {
        const seq = s.nudges(m);
        if (seq.length === 0) { record(m.skipNudges()); break; }
        for (const r of seq) { if (m.phase !== 'nudge') break; record(m.nudge(r)); }
        if (m.phase === 'nudge') record(m.skipNudges());
        break;
      }
      case 'stop': {
        const ctx = m.stopCtx;
        let idx;
        if (ctx.skill && rng.chance(s.skill)) {
          // aim for the best segment
          if (ctx.module.aim) idx = ctx.module.aim(m, ctx);
          else if (ctx.kind === 'trail') idx = ctx.segments - 1;
          else idx = ctx.board.reduce((bi, seg, i, arr) => (seg.pays > arr[bi].pays ? i : bi), 0);
        } else idx = rng.int(ctx.segments);
        record(m.stop(idx));
        break;
      }
      case 'idle': return;
      default: {
        const def = m.phaseDef();
        if (def.play === 'free') { record(m.play(def.holdsEveryPlay ? s.holds(m) : [])); break; }
        if (!def.bot) throw new Error(`phase ${m.phase} has no bot for the simulator`);
        const action = def.bot(m, s.profile);
        if (action == null) return;                                // e.g. spin on (a paid spin)
        record(m.act(action));
      }
    }
  }
  throw new Error('stuck in phase ' + m.phase);
}

// One paid play plus everything it leads to. Returns what it paid.
function playGame(m, s, rng, sources, counters) {
  const before = m.meters.out;
  const record = evs => {
    for (const e of evs) {
      if (e.type === 'win') sources[e.source] = (sources[e.source] || 0) + e.amount;
      else if (e.type === 'featureStart') counters.features++;
      else if (e.type === 'featureHeld' && e.lit) counters.held++;
      else if (e.type === 'trailLost') counters.lost++;
      else if (e.type === 'offer') counters.offers++;
    }
  };
  record(m.play(s.holds(m)));
  resolve(m, s, rng, record);
  return m.meters.out - before;
}

export function simulate(config, { plays = 1e6, strategy = 'sensible', seed = 1 } = {}) {
  const rng = createRng(seed);
  const m = new Machine(config, rng, { credit: Infinity });
  const s = makeStrategy(config, strategy);
  const sources = {}, counters = { features: 0, held: 0, lost: 0, offers: 0 };
  let sum = 0, sumSq = 0, hits = 0, biggest = 0;
  for (let i = 0; i < plays; i++) {
    const paid = playGame(m, s, rng, sources, counters);
    sum += paid; sumSq += paid * paid;
    if (paid > 0) hits++;
    if (paid > biggest) biggest = paid;
  }
  const stake = config.stake;
  const mean = sum / plays, variance = sumSq / plays - mean * mean;
  const rtp = mean / stake;
  const se = Math.sqrt(variance / plays) / stake;
  const bySource = Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, v / (plays * stake)]));
  const featureCounts = Object.fromEntries(Object.entries(m.meters.features).map(([k, v]) => [k, v / plays]));
  return { plays, strategy, rtp, margin95: 1.96 * se, hitRate: hits / plays, bySource, featureCounts,
    featureRate: counters.features / plays, offerRate: counters.offers / plays, biggest, sdPerPlay: Math.sqrt(variance) / stake };
}

// How long £5 lasts: plays until the credit can't cover a stake (capped).
export function sessions(config, { count = 2000, strategy = 'sensible', seed = 7, cap = 5000 } = {}) {
  const rng = createRng(seed);
  const s = makeStrategy(config, strategy);
  const lengths = [];
  for (let k = 0; k < count; k++) {
    const m = new Machine(config, rng);
    while (m.canPlay() && m.meters.plays < cap) playGame(m, s, rng, {}, { features: 0, held: 0, lost: 0, offers: 0 });
    lengths.push(m.meters.plays);
  }
  lengths.sort((a, b) => a - b);
  return { median: lengths[Math.floor(count / 2)], p10: lengths[Math.floor(count * 0.1)], p90: lengths[Math.floor(count * 0.9)] };
}

// Machines live in machines/<id>/config.js.
export const loadMachine = async id => (await import(`../machines/${id}/config.js`)).default;

const pct = x => (100 * x).toFixed(2) + '%';

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(a => { const [k, v] = a.trim().split(/\s+/); return [k, v ?? true]; }));
  const config = await loadMachine(args.machine || 'oche-cash');
  const plays = Number(args.plays || 1e7);
  const strategy = args.strategy || 'sensible';
  const t0 = Date.now();
  const res = simulate(config, { plays, strategy, seed: Number(args.seed || 1) });
  const sess = sessions(config, { count: Number(args.sessions || 2000), strategy });
  const secs = (Date.now() - t0) / 1000;
  if (args.json) { console.log(JSON.stringify({ ...res, sessions: sess, secs }, null, 2)); return; }
  console.log(`${config.name}: ${plays.toLocaleString()} plays, "${res.strategy}" player, ${secs.toFixed(1)}s`);
  console.log(`  Payout (RTP):      ${pct(res.rtp)}  ±${pct(res.margin95)} (95%)`);
  for (const [k, v] of Object.entries(res.bySource).sort((a, b) => b[1] - a[1])) console.log(`    from ${k.padEnd(14)} ${pct(v)}`);
  console.log(`  Any win:           1 in ${(1 / res.hitRate).toFixed(2)} plays`);
  console.log(`  Feature offered:   1 in ${(1 / res.offerRate).toFixed(1)} plays; taken 1 in ${(1 / res.featureRate).toFixed(1)}`);
  for (const [k, v] of Object.entries(res.featureCounts).sort((a, b) => b[1] - a[1])) console.log(`    ${k.padEnd(14)} 1 in ${(1 / v).toFixed(0)}`);
  console.log(`  Biggest win:       ${res.biggest}p`);
  console.log(`  £5 lasts (plays):  median ${sess.median}, 10% of sessions ${sess.p10} or fewer, 90% ${sess.p90} or fewer`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
