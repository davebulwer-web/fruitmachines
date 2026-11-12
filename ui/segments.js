// Alphanumeric segment display, like the 16-character readouts on 80s and 90s fruit machines.
// Each character is a 16-segment "starburst": two top bars, two bottom bars, four sides, two middle
// bars, a centre vertical (upper and lower) and four diagonals. Unlit segments show faintly.
// A full stop lights the decimal point of the character before it, as on the real thing.

const FONT = {
  '0': 'a1 a2 b c d1 d2 e f j k', '1': 'b c j', '2': 'a1 a2 b g1 g2 e d1 d2', '3': 'a1 a2 b g2 c d1 d2',
  '4': 'f g1 g2 b c', '5': 'a1 a2 f g1 g2 c d1 d2', '6': 'a1 a2 f e d1 d2 c g1 g2', '7': 'a1 a2 b c',
  '8': 'a1 a2 b c d1 d2 e f g1 g2', '9': 'a1 a2 b c d1 d2 f g1 g2',
  A: 'a1 a2 b c e f g1 g2', B: 'a1 a2 b c d1 d2 g2 i l', C: 'a1 a2 f e d1 d2', D: 'a1 a2 b c d1 d2 i l',
  E: 'a1 a2 f e d1 d2 g1', F: 'a1 a2 f e g1', G: 'a1 a2 f e d1 d2 c g2', H: 'f e b c g1 g2',
  I: 'a1 a2 i l d1 d2', J: 'b c d1 d2 e', K: 'f e g1 j m', L: 'f e d1 d2', M: 'f e b c h j', N: 'f e b c h m',
  O: 'a1 a2 b c d1 d2 e f', P: 'a1 a2 b f e g1 g2', Q: 'a1 a2 b c d1 d2 e f m', R: 'a1 a2 b f e g1 g2 m',
  S: 'a1 a2 f g1 g2 c d1 d2', T: 'a1 a2 i l', U: 'f e d1 d2 c b', V: 'f e k j', W: 'f e b c k m',
  X: 'h j k m', Y: 'h j l', Z: 'a1 a2 j k d1 d2',
  '-': 'g1 g2', '+': 'g1 g2 i l', '/': 'j k', '*': 'g1 g2 h i j k l m', '£': 'a2 i l g1 g2 d1 d2',
  '?': 'a1 a2 b g2 l', '!': 'i', "'": 'i', '=': 'g1 g2 d1 d2', '<': 'j m', '>': 'h k', '_': 'd1 d2', ' ': '',
};
const ALL = 'a1 a2 b c d1 d2 e f g1 g2 h i j k l m'.split(' ');

// Segment end points on a w x h cell (inclusive), shortened by a pixel so the segments look separate.
function segments(w, h) {
  const r = w - 1, b = h - 1, m = Math.floor(r / 2), v = Math.floor(b / 2);
  return {
    a1: [1, 0, m - 1, 0], a2: [m + 1, 0, r - 1, 0], d1: [1, b, m - 1, b], d2: [m + 1, b, r - 1, b],
    f: [0, 1, 0, v - 1], e: [0, v + 1, 0, b - 1], b: [r, 1, r, v - 1], c: [r, v + 1, r, b - 1],
    g1: [1, v, m - 1, v], g2: [m + 1, v, r - 1, v], i: [m, 1, m, v - 1], l: [m, v + 1, m, b - 1],
    h: [1, 1, m - 1, v - 1], j: [r - 1, 1, m + 1, v - 1], k: [m - 1, v + 1, 1, b - 1], m: [m + 1, v + 1, r - 1, b - 1],
  };
}

function line(ctx, x0, y0, x1, y1, t) {                // pixel line (Bresenham), t pixels thick
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, t, t);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

const cache = new Map();
// Draw one character's segments. lit: set of segment names; colours { on, off }.
function drawChar(ctx, ch, x, y, w, h, colours, dp) {
  const segs = cache.get(w + 'x' + h) || segments(w, h);
  cache.set(w + 'x' + h, segs);
  const lit = new Set((FONT[ch] ?? FONT[ch.toUpperCase()] ?? '').split(' ').filter(Boolean));
  for (const name of ALL) {
    const [x0, y0, x1, y1] = segs[name];
    ctx.fillStyle = lit.has(name) ? colours.on : colours.off;
    line(ctx, x + x0, y + y0, x + x1, y + y1, 1);
  }
  ctx.fillStyle = dp ? colours.on : colours.off;
  ctx.fillRect(x + w, y + h - 1, 1, 1);
}

// Split text into display cells: a '.' after a character becomes that character's decimal point.
export function cells(text) {
  const out = [];
  for (const c of String(text).toUpperCase()) {
    if ((c === '.' || c === ',') && out.length && !out[out.length - 1].dp) out[out.length - 1].dp = true;
    else out.push({ ch: c === ':' ? ' ' : c, src: c, dp: false, colon: c === ':' });
  }
  return out;
}

// Draw a row of `count` characters. text is placed left, right or centre; extra text is cut
// (use scrollWindow for long messages). opts: { w, h, gap, on, off, align }
export function drawSegments(ctx, text, x, y, count, opts = {}) {
  const { w = 11, h = 15, gap = 2, on = '#ff4030', off = '#2c0a0a', align = 'left' } = opts;
  let cs = cells(text).slice(0, count);
  const pad = count - cs.length;
  const blank = () => ({ ch: ' ', src: ' ', dp: false });
  if (align === 'right') cs = [...Array(pad)].map(blank).concat(cs);
  else if (align === 'center') cs = [...Array(Math.floor(pad / 2))].map(blank).concat(cs, [...Array(pad - Math.floor(pad / 2))].map(blank));
  else cs = cs.concat([...Array(pad)].map(blank));
  cs.forEach((c, i) => {
    const cx = x + i * (w + gap);
    drawChar(ctx, c.ch, cx, y, w, h, { on, off }, c.dp);
    if (c.colon) { ctx.fillStyle = on; ctx.fillRect(cx + Math.floor(w / 2), y + Math.floor(h / 3), 1, 1); ctx.fillRect(cx + Math.floor(w / 2), y + Math.floor((2 * h) / 3), 1, 1); }
  });
  return count * (w + gap) - gap;
}

// The part of a long message to show now: it pauses, scrolls one character at a time, then repeats.
export function scrollWindow(text, count, ms, { step = 170, pause = 1200 } = {}) {
  const cs = cells(text);
  if (cs.length <= count) return text;
  const travel = cs.length - count, cycle = pause * 2 + travel * step;
  const t = ms % cycle;
  const off = t < pause ? 0 : t < pause + travel * step ? Math.floor((t - pause) / step) : travel;
  return cs.slice(off, off + count).map(c => c.src + (c.dp ? '.' : '')).join('');
}
