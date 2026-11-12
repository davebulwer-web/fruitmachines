// Pick a prize: three (or more) hidden prizes; the player picks one, then all are shown.
// Config: { kind: 'pick', boxes: 3, prizes: [{ value: { label, cash } | { label, feature }, weight }] }
// Phase 'pick': action pick (arg = box index).
export default {
  init(m) { m.pickState = null; },
  start(m, f, id, events) {
    const boxes = Array.from({ length: f.boxes || 3 }, () => m.rng.weighted(f.prizes));
    m.pickState = { feature: id, boxes };
    m.phase = 'pick';
    events.push({ type: 'pickStart', feature: id, count: boxes.length });
  },
  phases: {
    pick: {
      blocking: true,
      actions: {
        pick(m, i, events) {
          const s = m.pickState, n = s.boxes.length;
          const at = Number.isInteger(i) ? ((i % n) + n) % n : m.rng.int(n);
          const prize = s.boxes[at];
          m.pickState = null;
          events.push({ type: 'picked', at, prize, boxes: s.boxes });
          if (prize.cash) m.pay(prize.cash, s.feature, events);
          if (prize.feature) m.queue.push(prize.feature);
          m.afterFeature(events);
        },
      },
      bot: () => 'pick',
    },
  },
};
