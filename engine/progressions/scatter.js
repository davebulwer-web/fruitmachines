// Bonus symbols ("scatters"): after the reels settle (spin and nudges), count the bonus symbol in all
// nine visible squares, not just the win line. Enough of them start a feature straight away, and
// more bonus symbols in view start a better one. Nothing carries over between games.
//
// Config:
//   scatter: { symbol: 'BN', min: 3, rungs: { 3: featureId, 4: featureId, 5: featureId } }
//   (a count above the highest rung uses the highest rung)
// m.trail holds the count in view, so the screen's trail meter shows it.

const scatter = {
  init(m) { m.trail = 0; },
  beforePlay(m) { m.trail = 0; m.scatterCounted = false; },

  afterReels(m, events) {
    if (m.scatterCounted) return;
    m.scatterCounted = true;
    const cfg = m.config, sc = cfg.scatter;
    let count = 0;
    const where = [];
    cfg._strips.forEach((strip, i) => {
      for (const k of [-1, 0, 1]) {
        if (strip[(m.positions[i] + k + strip.length) % strip.length].sym === sc.symbol) { count++; where.push([i, k]); }
      }
    });
    m.trail = count;
    events.push({ type: 'trail', value: count, why: 'bonus', where });
  },

  settle(m, events) {
    const sc = m.config.scatter;
    if (m.trail < sc.min) return false;
    const rungs = Object.keys(sc.rungs).map(Number).sort((a, b) => a - b);
    const rung = rungs.filter(r => r <= m.trail).pop();
    const id = sc.rungs[rung];
    events.push({ type: 'featureStart', rung: m.trail, feature: id });
    m.trail = 0;
    m.runFeature(id, events);
    return true;
  },
};
export default scatter;
