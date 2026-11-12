// Hi-Lo number gamble ("rise or fall"): a number from 1 to 12 shows; call HI or LO for the next one
// to climb a cash ladder, or COLLECT. A wrong call (or the same number) ends it with nothing.
// Config: { kind: 'hiLo', steps: [20, 40, 80, 150, 250, 400], low: 1, high: 12 }
// Phase 'hilo': actions hi, lo, collect.
function next(m) { const f = m.config.features[m.hilo.feature]; return (f.low ?? 1) + m.rng.int((f.high ?? 12) - (f.low ?? 1) + 1); }

function collect(m, arg, events) {
  const h = m.hilo, f = m.config.features[h.feature];
  m.hilo = null;
  const won = h.step > 0 ? f.steps[h.step - 1] : 0;
  events.push({ type: 'hiloEnd', amount: won });
  if (won) m.pay(won, h.feature, events);
  m.afterFeature(events);
}

function call(dir) {
  return (m, arg, events) => {
    const h = m.hilo, f = m.config.features[h.feature];
    const n = next(m);
    const ok = dir === 'hi' ? n > h.number : n < h.number;
    events.push({ type: 'hiloCall', call: dir, from: h.number, number: n, ok });
    h.number = n;
    if (!ok) { h.step = 0; return collect(m, arg, events); }
    h.step++;
    events.push({ type: 'hiloStep', step: h.step, value: f.steps[h.step - 1] });
    if (h.step === f.steps.length) collect(m, arg, events);
  };
}

export default {
  init(m) { m.hilo = null; },
  start(m, f, id, events) {
    m.hilo = { feature: id, step: 0, number: 0 };
    m.hilo.number = next(m);
    m.phase = 'hilo';
    events.push({ type: 'hiloStart', feature: id, number: m.hilo.number, steps: f.steps });
  },
  phases: {
    hilo: {
      blocking: true,
      actions: { hi: call('hi'), lo: call('lo'), collect },
      // simulator: call the likelier side; collect at p.hiloCollectAt (pence) or when the odds are poor
      bot(m, p) {
        const h = m.hilo, f = m.config.features[h.feature], lo = f.low ?? 1, hi = f.high ?? 12;
        const value = h.step > 0 ? f.steps[h.step - 1] : 0;
        const pHi = (hi - h.number) / (hi - lo + 1), pLo = (h.number - lo) / (hi - lo + 1);
        const best = Math.max(pHi, pLo);
        if (h.step > 0 && (value >= (p.hiloCollectAt ?? 150) || best * f.steps[h.step] < value)) return 'collect';
        return pHi >= pLo ? 'hi' : 'lo';
      },
    },
  },
};
