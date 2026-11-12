// Reel maths. A reel stop is written as a string: symbol code plus an optional dart number,
// e.g. 'CH' (cherry), 'LE2' (lemon carrying a 2), 'QM' (question mark).

export const parseStop = s => {
  const m = /^([A-Z]+)(\d)?$/.exec(s);
  return { sym: m[1], num: m[2] ? Number(m[2]) : 0 };
};

// Turn config.reels (strings) into [{sym, num}] strips, once.
export function prepareReels(config) {
  if (config._strips) return config._strips;
  config._strips = config.reels.map(strip => strip.map(parseStop));
  // Where each symbol appears on each reel, for forced wins.
  config._where = config._strips.map(strip => {
    const idx = {};
    strip.forEach((st, i) => { (idx[st.sym] ||= []).push(i); });
    return idx;
  });
  return config._strips;
}

export const stopsAt = (config, positions) => prepareReels(config).map((strip, i) => strip[positions[i]]);
export const lineSymbols = (config, positions) => stopsAt(config, positions).map(s => s.sym);

// Paytable entries: { pattern: ['SE','SE','SE'], pays: 400 }, '*' matches anything. First match pays.
export function lineWin(config, symbols) {
  for (const entry of config.paytable) {
    if (entry.pattern.every((p, i) => p === '*' || p === symbols[i])) return entry.pays;
  }
  return 0;
}

export const countSymbol = (symbols, sym) => symbols.reduce((n, s) => n + (s === sym ? 1 : 0), 0);

// Positions that show a given paytable pattern on the win line.
export function positionsFor(config, pattern, rng) {
  prepareReels(config);
  return pattern.map((p, i) => {
    const pool = p === '*' ? null : config._where[i][p];
    if (!pool || pool.length === 0) return rng.int(config._strips[i].length);
    return pool[rng.int(pool.length)];
  });
}
