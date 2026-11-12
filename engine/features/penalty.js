// Penalty: the repeat chance as a spot kick. A big win queues it (config.repeat = { from, feature: id });
// the player shoots LEFT, MIDDLE or RIGHT and the keeper dives. A goal pays the win again.
// Config: { kind: 'penalty', chance: 0.25 }   (chance of scoring, whichever way you shoot)
// Phase 'penalty': action shoot(0 | 1 | 2).
export default {
  init(m) { m.penalty = null; },
  start(m, f, id, events) {
    m.penalty = { feature: id, amount: m.repeatAmount || 0 };
    m.repeatAmount = 0;
    m.phase = 'penalty';
    events.push({ type: 'penaltyStart', feature: id, amount: m.penalty.amount });
  },
  phases: {
    penalty: {
      blocking: true,
      actions: {
        shoot(m, dir, events) {
          const P = m.penalty, f = m.config.features[P.feature];
          dir = [0, 1, 2].includes(dir) ? dir : 1;
          const goal = m.rng.chance(f.chance ?? 0.25);
          const dive = goal ? (dir + 1 + m.rng.int(2)) % 3 : dir;      // the keeper guesses right on a save
          m.penalty = null;
          events.push({ type: 'penalty', dir, dive, goal, amount: P.amount });
          if (goal) m.pay(P.amount, 'repeat', events);
          m.afterFeature(events);
        },
      },
      bot: m => ['shoot', m.rng.int(3)],
    },
  },
};
