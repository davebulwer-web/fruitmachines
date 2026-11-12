// Jackpot: pays the machine's jackpot, with a chance to pay it again.
// Config: { kind: 'jackpot', repeatChance: 0.2 }
export default {
  start(m, f, id, events) {
    m.pay(m.config.jackpot, id, events);
    if (m.rng.chance(f.repeatChance)) { events.push({ type: 'repeat', feature: id }); m.pay(m.config.jackpot, id, events); }
    m.afterFeature(events);
  },
};
