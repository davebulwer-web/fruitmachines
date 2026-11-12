// The dedicated screen for a dice board (snakes and ladders). While the board runs it covers the top
// glass and the paytable (y 3 to 290). Squares wind up the screen from the bottom left, row by row.
// Header: the board's name, the die, the prize you would collect now and the rolls left.
// A skin can restyle it with skin.diceTheme = { ground, cash, go, ladder, snake, lose, feature, last, ink }
// and give squares pictures with skin.diceIcons = { counter, ladder, snake, lose, go, last, feature: { id: key } }.

const DEFAULT_THEME = {
  ground: '#0c1410', cash: '#1f4a2a', go: '#e8e0d0', ladder: '#1f7a3a', snake: '#8a2a10', lose: '#5a0a14',
  feature: '#1f4a7a', last: '#a07010', ink: '#f4ead8', dim: '#a0b0a0', ladderLine: '#80ff90', snakeLine: '#ff6050',
};
const AREA = { x: 3, y: 3, w: 264, h: 287 }, HEAD = 52;

function cellOf(i, cols, rows) {
  const r = Math.floor(i / cols), c = r % 2 === 0 ? i % cols : cols - 1 - (i % cols);
  return [c, rows - 1 - r];
}

function drawDie(g, x, y, s, face) {
  g.frameBox(x, y, s, s, '#f8f0e0', '#000');
  if (!face) return;
  const a = Math.round(s * 0.27), m = Math.round(s / 2), b = s - a, r = Math.max(2, Math.round(s / 9));
  const pips = { 1: [[m, m]], 2: [[a, a], [b, b]], 3: [[a, a], [m, m], [b, b]], 4: [[a, a], [b, a], [a, b], [b, b]],
    5: [[a, a], [b, a], [m, m], [a, b], [b, b]], 6: [[a, a], [b, a], [a, m], [b, m], [a, b], [b, b]] };
  for (const [px, py] of pips[face]) g.rect(x + px - Math.floor(r / 2), y + py - Math.floor(r / 2), r, r, g.C.red);
}

export function drawDiceBoard(g, theme = {}, icons = {}) {
  const T = { ...DEFAULT_THEME, ...theme }, D = g.disp.dice, { text, rect, frameBox, ctx, C, images } = g;
  const sq = D.squares, n = sq.length, cols = 5, rows = Math.ceil(n / cols), last = n - 1;
  frameBox(AREA.x, AREA.y, AREA.w, AREA.h, T.ground, C.cabinetEdge);

  // header
  text(D.title || 'DICE BOARD', AREA.x + 8, AREA.y + 6, C.gold, { scale: 2 });
  drawDie(g, AREA.x + 8, AREA.y + 22, 26, D.face);
  const prize = D.feature ? (g.config.features[D.feature]?.name || D.feature).toUpperCase() : g.money(D.prize);
  text('PRIZE', AREA.x + 44, AREA.y + 24, T.dim);
  text(prize, AREA.x + 44, AREA.y + 34, C.gold, { scale: D.feature ? 1 : 2 });
  if (D.maxRolls) {
    text('ROLLS', AREA.x + AREA.w - 52, AREA.y + 24, T.dim);
    text(String(Math.max(0, D.maxRolls - D.rolls)), AREA.x + AREA.w - 52, AREA.y + 34, C.ink, { scale: 2 });
  }

  // squares
  const gx = AREA.x + 3, gy = AREA.y + HEAD, cw = Math.floor((AREA.w - 6) / cols), ch = Math.floor((AREA.h - HEAD - 3) / rows);
  const at = i => { const [c, r] = cellOf(i, cols, rows); return [gx + c * cw, gy + r * ch]; };
  sq.forEach((s, i) => {
    const [x, y] = at(i);
    const type = i === last ? 'last' : s.type;
    rect(x, y, cw, ch, '#000');
    rect(x + 1, y + 1, cw - 2, ch - 2, T[type] || T.cash);
    const key = type === 'feature' ? icons.feature?.[s.feature] : icons[type];
    const im = key && images[key];
    const label = s.type === 'cash' || s.type === 'go' ? g.money(s.cash) : '';
    if (im) {
      const size = label ? 20 : 26;
      ctx.drawImage(im, x + Math.floor((cw - size) / 2), y + (label ? 2 : Math.floor((ch - size) / 2)), size, size);
    }
    if (label) text(label, x + cw / 2 + 1, y + (im ? ch - 10 : Math.floor(ch / 2) - 3), s.type === 'go' ? '#201008' : i === last ? '#201008' : T.ink, { align: 'center' });
    else if (!im) {
      const t = { ladder: '^' + (s.to + 1), snake: 'v' + (s.to + 1), lose: 'X', feature: (g.config.features[s.feature]?.short || s.feature).split('|')[0] }[s.type] || '';
      text(t, x + cw / 2 + 1, y + Math.floor(ch / 2) - 3, T.ink, { align: 'center' });
    }
    text(String(i + 1), x + 3, y + 2, '#00000090');
  });

  // ladder and snake lines from square to square
  ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
  sq.forEach((s, i) => {
    if (s.type !== 'ladder' && s.type !== 'snake') return;
    const [x1, y1] = at(i), [x2, y2] = at(s.to);
    ctx.strokeStyle = s.type === 'ladder' ? T.ladderLine : T.snakeLine;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x1 + cw / 2, y1 + ch / 2); ctx.lineTo(x2 + cw / 2, y2 + ch / 2); ctx.stroke();
    ctx.setLineDash([]);
  });
  ctx.globalAlpha = 1;

  // the counter (fractional while sliding)
  const p = Math.max(0, Math.min(last, D.pos)), i0 = Math.floor(p), f = p - i0, i1 = Math.min(last, i0 + 1);
  const [ax, ay] = at(i0), [bx, by] = at(i1);
  const cx = ax + (bx - ax) * f + cw / 2, cy = ay + (by - ay) * f + ch / 2;
  const counter = icons.counter && images[icons.counter];
  const bob = D.rolling ? 0 : Math.round(Math.sin(g.frame / 8) * 1.5);
  if (counter) ctx.drawImage(counter, Math.round(cx - 10), Math.round(cy - 10 + bob), 20, 20);
  else { g.disc(Math.round(cx), Math.round(cy + bob), 7, '#000'); g.disc(Math.round(cx), Math.round(cy + bob), 6, C.red); }

  g.drawBanner(AREA.x + AREA.w / 2, AREA.y + HEAD + 100);
}
