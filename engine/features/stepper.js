// Steppers ("free kick"): the reels step up and down on their own, one stop at a time, through a set
// number of steps, and the lamp keeps cycling round them. Press STOP while a win shows to keep it.
// The engine works out the whole run of steps first (there is always at least one win in it), so a
// stop is just "which step was showing". It reuses the core skill-stop lamp.
// Config: { kind: 'stepper', steps: 10, button: 'SHOOT', multiplier: 1 }
import { lineSymbols, lineWin } from '../reels.js';

const stepper = {
  start(m, f, id, events) {
    const cfg = m.config, n = f.steps ?? 10;
    let seq, wins;
    for (let tries = 0; tries < 500; tries++) {
      seq = []; wins = [];
      let pos = [...m.positions];
      for (let k = 0; k < n; k++) {
        pos = pos.map((p, i) => { const len = cfg.reels[i].length; return (p + (m.rng.chance(0.5) ? 1 : len - 1)) % len; });
        seq.push(pos);
        wins.push(lineWin(cfg, lineSymbols(cfg, pos)) * (f.multiplier ?? 1));
      }
      if (wins.some(w => w > 0)) break;
    }
    m.startStop({ kind: 'stepper', skill: true, segments: n, seq, wins, feature: id, button: f.button || 'STOP', module: stepper }, events);
  },
  onStop(m, ctx, at, events) {
    m.positions = [...ctx.seq[at]];
    events.push({ type: 'stepperStop', at, positions: [...m.positions], win: ctx.wins[at] });
    if (ctx.wins[at]) m.pay(ctx.wins[at], ctx.feature, events);
    m.afterFeature(events);
  },
  // simulator: a good player stops on the biggest win
  aim: (m, ctx) => ctx.wins.reduce((bi, w, i, a) => (w > a[bi] ? i : bi), 0),
};
export default stepper;
