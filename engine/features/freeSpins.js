// Free spins. Config: { kind: 'freeSpins', spins: 3, holds: true, multiplier: 1 }
// holds: holds are allowed on every free spin (default true). multiplier: line wins on these spins
// are paid this many times over (e.g. 2 for double-up spins).
// Phase 'free': play is free.
export default {
  init(m) { m.freeSpins = 0; },
  start(m, f, id, events) {
    m.freeSpins = f.spins;
    m.freeFeature = id;
    m.phase = 'free';
    events.push({ type: 'freeSpins', spins: f.spins, multiplier: f.multiplier || 1, holds: f.holds !== false });
    if (f.holds !== false) { m.holdsOffered = true; events.push({ type: 'holdsOffered' }); }
  },
  phases: {
    free: {
      play: 'free',
      blocking: true,
      holdsEveryPlay: m => m.config.features[m.freeFeature]?.holds !== false,
      afterSpin(m, events, win) {
        const f = m.config.features[m.freeFeature] || {};
        if (win > 0 && f.multiplier > 1) m.pay(Math.min(win * f.multiplier, m.config.jackpot) - win, m.freeFeature, events);
        m.freeSpins--;
        events.push({ type: 'freeSpin', left: m.freeSpins });
        if (m.freeSpins <= 0) { m.phase = 'idle'; m.settle(events); }
        else if (f.holds !== false) { m.holdsOffered = true; events.push({ type: 'holdsOffered' }); }
        return true;                                  // no assists on free spins
      },
    },
  },
};
