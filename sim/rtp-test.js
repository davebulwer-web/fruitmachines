// Fails if any machine's payout drifts out of its band. Run after every change: npm test
// Each machine sets its own band in config.test: { rtp: [0.89, 0.93], featureEvery: [20, 60] }.
// Pass machine ids to test only those: node sim/rtp-test.js roll-up
import { simulate, loadMachine } from './simulate.js';
import { machineIds } from '../machines/index.js';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : machineIds;
let failed = false;
for (const id of ids) {
  const config = await loadMachine(id);
  const t = { rtp: [0.89, 0.93], featureEvery: [20, 60], ...(config.test || {}) };
  const r = simulate(config, { plays: 2_000_000, strategy: 'sensible', seed: 12345 });
  const g = simulate(config, { plays: 1_000_000, strategy: 'gambler', seed: 54321 });
  const l = simulate(config, { plays: 1_000_000, strategy: 'lazy', seed: 999 });
  const fail = [];
  if (r.rtp < t.rtp[0] || r.rtp > t.rtp[1]) fail.push(`sensible RTP ${(r.rtp * 100).toFixed(2)}% outside ${t.rtp[0] * 100}-${t.rtp[1] * 100}%`);
  for (const [name, x] of [['gambler', g], ['lazy', l]]) if (x.rtp > r.rtp + 0.02) fail.push(`${name} beats the sensible player: ${(x.rtp * 100).toFixed(2)}%`);
  const every = 1 / r.featureRate;
  if (every < t.featureEvery[0] || every > t.featureEvery[1]) fail.push(`features taken 1 in ${every.toFixed(0)} plays, expected 1 in ${t.featureEvery[0]} to ${t.featureEvery[1]}`);
  console.log(`${config.name}: sensible ${(r.rtp * 100).toFixed(2)}%, gambler ${(g.rtp * 100).toFixed(2)}%, lazy ${(l.rtp * 100).toFixed(2)}%, features 1 in ${every.toFixed(0)}  ${fail.length ? 'FAIL' : 'PASS'}`);
  if (fail.length) { failed = true; console.error('  ' + fail.join('\n  ')); }
}
process.exit(failed ? 1 : 0);
