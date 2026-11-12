// Dice board (Snakes and Ladders style). You start on square 0 holding a small prize and either
// COLLECT what you are on or ROLL the die to move on. Cash squares set your prize (it can go
// down as well as up), ladders climb, snakes slide back, LOSE ends the board with nothing, a
// feature square swaps your prize for that feature, and the last square pays and ends it.
//
// Config: {
//   kind: 'diceBoard',
//   squares: 'GO:20 30 L7 40 LOSE 50 S2 60 F:superHolds ... 400',   // or an array of square objects
//   die: [{ value: 1, weight: 1 }, ...],    // optional, a fair 1-6 by default
//   maxRolls: 8,                            // optional, auto-collect after this many rolls
//   start: 0,                               // optional, the square you start on (a better start for higher trail steps)
//   board: 'id',                            // optional, share squares from config.boards[id] (with name, words)
// }
// Square tokens: number = cash prize in pence; GO:n = start square worth n; Ln / Sn = ladder / snake
// to square n; LOSE; F:id = feature square. Parsed to { type: 'cash'|'go'|'ladder'|'snake'|'lose'|'feature', ... }.
// Phase 'dice': actions roll, collect.

export function parseSquares(spec) {
  if (Array.isArray(spec)) return spec;
  return spec.trim().split(/\s+/).map(t => {
    let r;
    if ((r = /^GO:(\d+)$/.exec(t))) return { type: 'go', cash: Number(r[1]) };
    if ((r = /^L(\d+)$/.exec(t))) return { type: 'ladder', to: Number(r[1]) };
    if ((r = /^S(\d+)$/.exec(t))) return { type: 'snake', to: Number(r[1]) };
    if (t === 'LOSE') return { type: 'lose' };
    if ((r = /^F:(\w+)$/.exec(t))) return { type: 'feature', feature: r[1] };
    if (/^\d+$/.test(t)) return { type: 'cash', cash: Number(t) };
    throw new Error(`dice board: bad square "${t}"`);
  });
}

const spec = (m, f) => (typeof f.board === 'string' ? m.config.boards[f.board] : f);
const board = (m, f) => { const b = spec(m, f); return (b._squares ||= parseSquares(b.squares)); };

function collect(m, arg, events) {
  const d = m.dice, f = m.config.features[d.feature];
  m.dice = null;
  events.push({ type: 'diceCollect', prize: d.prize, feature: d.prizeFeature });
  if (d.prizeFeature) { m.runFeature(d.prizeFeature, events); return; }
  m.pay(d.prize, d.feature, events);
  m.afterFeature(events);
}

export default {
  init(m) { m.dice = null; },
  start(m, f, id, events) {
    const sq = board(m, f), b = spec(m, f), pos = f.start ?? 0, here = sq[pos];
    const prize = here.cash || sq[0].cash || 0;
    m.dice = { feature: id, pos, prize, prizeFeature: here.type === 'feature' ? here.feature : null, rolls: 0 };
    m.phase = 'dice';
    events.push({ type: 'diceStart', feature: id, title: b.name, words: b.words, squares: sq, pos, prize, maxRolls: f.maxRolls ?? b.maxRolls ?? null });
  },
  phases: {
    dice: {
      blocking: true,
      actions: {
        collect,
        roll(m, arg, events) {
          const d = m.dice, f = m.config.features[d.feature], sq = board(m, f), last = sq.length - 1;
          const roll = (f.die || spec(m, f).die) ? m.rng.weighted(f.die || spec(m, f).die) : 1 + m.rng.int(6);
          const from = d.pos;
          d.pos = Math.min(last, d.pos + roll);
          d.rolls++;
          events.push({ type: 'diceRoll', roll, from, to: d.pos, rolls: d.rolls });
          let s = sq[d.pos];
          if (s.type === 'ladder' || s.type === 'snake') {
            events.push({ type: 'diceSlide', kind: s.type, from: d.pos, to: s.to });
            d.pos = s.to;
            s = sq[d.pos];
          }
          if (s.type === 'lose') {
            events.push({ type: 'diceLose', pos: d.pos });
            m.dice = null;
            m.afterFeature(events);
            return;
          }
          if (s.type === 'cash' || s.type === 'go') { d.prize = s.cash; d.prizeFeature = null; }
          if (s.type === 'feature') d.prizeFeature = s.feature;
          events.push({ type: 'diceLand', pos: d.pos, prize: d.prize, feature: d.prizeFeature });
          const max = f.maxRolls ?? spec(m, f).maxRolls;
          if (d.pos === last || (max && d.rolls >= max)) collect(m, arg, events);
        },
      },
      // simulator: take a feature square, otherwise roll until the prize reaches p.diceCollectAt (pence)
      bot(m, p) {
        const d = m.dice;
        if (d.prizeFeature) return 'collect';
        return d.prize < (p.diceCollectAt ?? 100) ? 'roll' : 'collect';
      },
    },
  },
};
