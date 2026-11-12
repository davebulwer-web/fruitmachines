// What each feature is worth on average when taken, for tuning a trail.
// Usage: node sim/feature-values.js [--machine roll-up] [--strategy sensible] [--trials 200000]
import { pathToFileURL } from 'node:url';
import { Machine } from '../engine/machine.js';
import { createRng } from '../engine/rng.js';
import { makeStrategy } from './strategy.js';
import { resolve, loadMachine } from './simulate.js';

export function featureValues(config, { strategy = 'sensible', trials = 200000, seed = 3 } = {}) {
  const rng = createRng(seed);
  const s = makeStrategy(config, strategy);
  const out = {};
  for (const id of Object.keys(config.features)) {
    const m = new Machine(config, rng, { credit: Infinity });
    for (let i = 0; i < trials; i++) {
      m.positions = m.positions.map((p, r) => rng.int(config.reels[r].length));
      const ev = [];
      m.runFeature(id, ev);
      resolve(m, s, rng, () => {});
      if (m.phase !== 'idle') throw new Error(`${id} left the machine in phase ${m.phase}`);
    }
    out[id] = m.meters.out / trials;
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(a => { const [k, v] = a.trim().split(/\s+/); return [k, v ?? true]; }));
  const config = await loadMachine(args.machine || 'oche-cash');
  const v = featureValues(config, { strategy: args.strategy || 'sensible', trials: Number(args.trials || 200000) });
  const rungOf = Object.fromEntries(Object.entries(config.trail?.rungs || {}).map(([r, id]) => [id, r]));
  console.log(`${config.name}: average pay per feature taken ("${args.strategy || 'sensible'}" player)`);
  for (const [id, p] of Object.entries(v)) console.log(`  ${(rungOf[id] ? 'rung ' + rungOf[id] : '').padEnd(8)} ${config.features[id].name.padEnd(16)} ${p.toFixed(1)}p`);
}
