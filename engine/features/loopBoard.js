// Looping board: the feature game itself. A counter goes round and round a ring of squares.
// You start with a number of shots; each ROLL spends one, throws the die and moves the counter on.
// Where it lands: cash adds to the bank, a feature square wins that feature (played after the board),
// nudge squares add to the nudge bank, LEVEL UP moves up the level ladder (its prize is paid at the
// end), SHOT squares give extra shots, MISS loses a shot, HALF halves the bank and END finishes the board.
// You can COLLECT at any time; the board also ends when the shots run out.
//
// Config: a feature { kind: 'loopBoard', board: 'main', shots: 3, level: 0, name }
//   and the board itself in config.boards.main (or inline on the feature):
//   { name: 'PROM BOARD', shotName: 'SHOT', squares: 'GO 50 N2 100 UP F:winSpin S1 150 END ...', cols: 6, rows: 6,
//     levels: [{ label, cash } | { label, feature }, ...], die: [{ value, weight }] }
// Square tokens: GO start; a number = cash in pence; F:id feature; Nn nudges to the bank;
//   Sn extra shots; UP level up; MISS lose a shot; HALF halve the bank; END end the board; BUST lose the bank and end;
//   TAXI a lamp races round the board and the player stops it (skill stop) to ride to that square;
//   POT wins the machine's cash pot (config.cashPot) into the bank; DOUBLE doubles the bank.
// The ring is laid out clockwise from the top left on a cols x rows grid: squares = 2 x (cols + rows) - 4.
// Phase 'loop': actions roll, collect.

export function parseLoop(spec) {
  if (Array.isArray(spec)) return spec;
  return spec.trim().split(/\s+/).map(t => {
    let r;
    if (t === 'GO') return { type: 'go' };
    if (/^\d+$/.test(t)) return { type: 'cash', cash: Number(t) };
    if ((r = /^F:(\w+)$/.exec(t))) return { type: 'feature', feature: r[1] };
    if ((r = /^N(\d+)$/.exec(t))) return { type: 'nudges', count: Number(r[1]) };
    if ((r = /^S(\d+)$/.exec(t))) return { type: 'shots', count: Number(r[1]) };
    if (t === 'UP') return { type: 'level' };
    if (t === 'HALF') return { type: 'half' };
    if (t === 'MISS') return { type: 'miss' };
    if (t === 'END') return { type: 'end' };
    if (t === 'BUST') return { type: 'bust' };
    if (t === 'TAXI') return { type: 'taxi' };
    if (t === 'POT') return { type: 'pot' };
    if (t === 'DOUBLE') return { type: 'double' };
    throw new Error(`loop board: bad square "${t}"`);
  });
}

export const boardOf = (cfg, f) => {
  const b = typeof f.board === 'string' ? cfg.boards[f.board] : f.board || f;
  b._squares ||= parseLoop(b.squares);
  return b;
};

function finish(m, events, why) {
  const L = m.loop, cfg = m.config, f = cfg.features[L.feature], b = boardOf(cfg, f);
  const lv = L.level > 0 ? b.levels?.[L.level - 1] : null;
  m.loop = null;
  events.push({ type: 'loopEnd', why, bank: L.bank, level: L.level, levelPrize: lv, nudges: L.nudges, awards: [...L.awards] });
  if (L.bank > 0) m.pay(L.bank, L.feature, events);
  if (lv?.cash) m.pay(lv.cash, L.feature, events);
  if (L.nudges > 0) m.awardNudgeBank(L.nudges, events);
  // features won on the board (and a feature level prize) play now, one after another
  if (lv?.feature) m.queue.push(lv.feature);
  m.queue.push(...L.awards);
  m.afterFeature(events);
}

// Apply the square the counter is on, then end the board if it has to.
function landOn(m, events) {
  const L = m.loop, cfg = m.config, b = boardOf(cfg, cfg.features[L.feature]), s = b._squares[L.pos];
  let end = null;
  switch (s.type) {
    case 'cash': L.bank += s.cash; break;
    case 'feature': L.awards.push(s.feature); break;
    case 'nudges': L.nudges += s.count; break;
    case 'shots': L.shots += s.count; break;
    case 'level': if (L.level < (b.levels?.length || 0)) L.level++; break;
    case 'half': L.bank = Math.floor(L.bank / 20) * 10; break;     // halved, to the 10p below
    case 'miss': L.shots = Math.max(0, L.shots - 1); break;
    case 'end': end = 'end'; break;
    case 'bust': L.bank = 0; end = 'bust'; break;
    case 'pot': L.bank += m.takeCashPot(events); break;
    case 'double': L.bank *= 2; break;
  }
  events.push({ type: 'loopLand', pos: L.pos, square: s, bank: L.bank, shots: L.shots, level: L.level, nudges: L.nudges, awards: [...L.awards] });
  if (end) return finish(m, events, end);
  if (s.type === 'taxi' && !L.inTaxi) {                       // a taxi ride: stop the lamp on the square you want
    m.startStop({ kind: 'loop', skill: true, segments: b._squares.length, feature: L.feature, module: taxi }, events);
    return;
  }
  if (L.shots <= 0) return finish(m, events, 'shots');
}

// The taxi lamp has stopped: ride there and take that square (a taxi square there does nothing more).
const taxi = {
  onStop(m, ctx, at, events) {
    const L = m.loop;
    m.phase = 'loop';
    events.push({ type: 'loopTaxi', from: L.pos, to: at });
    L.pos = at;
    L.inTaxi = true;
    landOn(m, events);
    if (m.loop) m.loop.inTaxi = false;
  },
  // simulator: where a good player would aim
  aim(m, ctx) {
    const L = m.loop, b = boardOf(m.config, m.config.features[L.feature]);
    const worth = s => ({ cash: s.cash, feature: 120, pot: m.cashPot, double: L.bank, level: 80, shots: 40 * s.count, nudges: 20 * s.count, go: 0, taxi: 0, half: -L.bank / 2, miss: -40, end: -200, bust: -300 }[s.type] ?? 0);
    return b._squares.reduce((bi, s, i, a) => (worth(s) > worth(a[bi]) ? i : bi), 0);
  },
};

export default {
  init(m) { m.loop = null; },
  start(m, f, id, events) {
    const b = boardOf(m.config, f);
    m.loop = { feature: id, pos: 0, shots: f.shots ?? 3, level: f.level ?? 0, bank: 0, nudges: 0, awards: [] };
    m.phase = 'loop';
    const L = m.loop;
    events.push({ type: 'loopStart', feature: id, title: b.name, shotName: b.shotName || 'SHOT', squares: b._squares, cols: b.cols || 6, rows: b.rows || 6, levels: b.levels || [],
      pos: 0, shots: L.shots, level: L.level, bank: 0 });
  },
  phases: {
    loop: {
      blocking: true,
      actions: {
        collect: (m, arg, events) => finish(m, events, 'collect'),
        roll(m, arg, events) {
          const L = m.loop, cfg = m.config, f = cfg.features[L.feature], b = boardOf(cfg, f), sq = b._squares;
          if (L.shots <= 0) return finish(m, events, 'shots');
          L.shots--;
          const roll = b.die ? m.rng.weighted(b.die) : 1 + m.rng.int(6);
          const from = L.pos;
          L.pos = (L.pos + roll) % sq.length;
          events.push({ type: 'loopRoll', roll, from, to: L.pos, steps: roll, shots: L.shots });
          landOn(m, events);
        },
      },
      // simulator: keep rolling unless the bank has reached p.loopCollectAt (only matters with HALF or BUST squares)
      bot: (m, p) => (m.loop.bank >= (p.loopCollectAt ?? Infinity) ? 'collect' : 'roll'),
    },
  },
};
