// Win spin: the reels are forced to a winning line, optionally paid at a multiple.
// Config: { kind: 'winSpin', multiplier: 2, wins: [{ value: { pattern, pays }, weight }] }
export default {
  start(m, f, id, events) {
    const entry = m.rng.weighted(f.wins);
    const positions = m.forceWin(entry.pattern);
    events.push({ type: 'spin', positions, held: m.config.reels.map(() => false), forced: true });
    m.pay(entry.pays * (f.multiplier || 1), id, events);
    m.afterFeature(events);
  },
};
