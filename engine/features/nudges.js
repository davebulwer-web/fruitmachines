// Nudges feature. Config: { kind: 'nudges', counts: [{ value, weight }], bank: false }
// bank: false gives the nudges now, on the reels as they stand.
// bank: true puts them in the nudge bank (at least one), kept for the following spins until used.
export default {
  start(m, f, id, events) {
    const n = m.rng.weighted(f.counts);
    if (f.bank) { m.awardNudgeBank(n, events); m.afterFeature(events); return; }
    m.awardNudges(n, events);
    m.phase = 'nudge';
  },
};
