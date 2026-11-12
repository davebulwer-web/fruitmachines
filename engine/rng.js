// Seedable random numbers (sfc32). Same seed = same game, so any result can be replayed.
export function createRng(seed = Date.now()) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = seed >>> 0;
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return (r >>> 0) / 4294967296;
  };
  for (let i = 0; i < 15; i++) next(); // warm up
  return {
    float: next,
    int: n => Math.floor(next() * n),          // 0..n-1
    chance: p => next() < p,
    weighted: table => {                        // [{value, weight}]
      const total = table.reduce((s, e) => s + e.weight, 0);
      let x = next() * total;
      for (const e of table) { if ((x -= e.weight) < 0) return e.value; }
      return table[table.length - 1].value;
    },
  };
}
