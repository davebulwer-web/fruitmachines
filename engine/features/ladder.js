// Cash ladder: start on a random step, then collect or gamble up one step at a time.
// The gamble is fair (chance of going up = value / next value), so gambling never changes the payout.
// Config: { kind: 'ladder', entry: [{ value: step, weight }], steps: [20, 40, ...] }
// steps may be left out to use the machine's config.ladder.steps.
// Phase 'ladder': actions collect, gamble.
const steps = m => m.ladderSteps;

function collect(m, arg, events) {
  m.pay(m.ladderValue(), m.ladderFeature, events);
  m.afterFeature(events);
}

export default {
  init(m) {
    m.ladderStep = 0;
    m.ladderSteps = m.config.ladder?.steps || [];
    m.ladderValue = (step = m.ladderStep) => steps(m)[step];
  },
  start(m, f, id, events) {
    m.ladderSteps = f.steps || m.config.ladder.steps;
    m.ladderFeature = id;
    m.ladderStep = m.rng.weighted(f.entry);
    m.phase = 'ladder';
    events.push({ type: 'ladder', step: m.ladderStep, value: m.ladderValue(), feature: id });
  },
  phases: {
    ladder: {
      blocking: true,
      actions: {
        collect,
        gamble(m, arg, events) {
          const s = steps(m);
          if (m.rng.chance(s[m.ladderStep] / s[m.ladderStep + 1])) {
            m.ladderStep++;
            events.push({ type: 'gambleWon', step: m.ladderStep, value: m.ladderValue() });
            if (m.ladderStep === s.length - 1) collect(m, arg, events);
          } else {
            events.push({ type: 'gambleLost' });
            m.afterFeature(events);
          }
        },
      },
      // simulator: gamble below p.gambleBelow (pence)
      bot: (m, p) => (m.ladderValue() < (p.gambleBelow ?? 100) ? 'gamble' : 'collect'),
    },
  },
};
