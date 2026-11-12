// Mystery: picks another feature at random, with a chance of queueing a repeat.
// Config: { kind: 'mystery', repeatChance: 0.25, picks: [{ value: featureId, weight }] }
export default {
  start(m, f, id, events) {
    const pick = m.rng.weighted(f.picks);
    events.push({ type: 'mystery', pick });
    if (m.rng.chance(f.repeatChance)) { m.queue.push(m.rng.weighted(f.picks)); events.push({ type: 'repeat', feature: id }); }
    m.runFeature(pick, events);
  },
};
