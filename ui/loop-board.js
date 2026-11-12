// The dedicated board screen for a looping board feature. While the board runs it takes over the
// whole top glass and the paytable (y 3 to 290) so the squares are big enough to read.
// A skin can restyle it with skin.loopTheme = { ground, edge, cash, feature, nudges, shots, level, risk, go }
// and give squares pictures with skin.loopIcons = { go, cash, nudges, level, shots, miss, half, end, bust, taxi, pot,
// feature: { featureId: imageKey } } (image keys from the machine's art pack). A square with a picture
// shows only a small number where one is needed (cash amount, how many nudges or shots).

const DEFAULT_THEME = {
  ground: '#0c0814', edge: '#3a2840', go: '#e8e0d0', cash: '#1f5a2a', feature: '#1f4a7a', nudges: '#16606a',
  shots: '#5a2a7a', level: '#7a5a10', risk: '#7a1420', ink: '#f4ead8', dim: '#a090a8', taxi: '#c8a010', pot: '#8a6a10',
};
export const LOOP_AREA = { x: 3, y: 3, w: 264, h: 287 };

// Grid cell of square i, clockwise from the top left corner.
export function loopCell(i, cols, rows) {
  if (i < cols) return [i, 0];
  i -= cols;
  if (i < rows - 2) return [cols - 1, i + 1];
  i -= rows - 2;
  if (i < cols) return [cols - 1 - i, rows - 1];
  i -= cols;
  return [0, rows - 2 - i];
}

function squareText(s, g, shot) {
  const f = s.feature && g.config.features[s.feature];
  switch (s.type) {
    case 'go': return ['GO', ''];
    case 'cash': return [g.money(s.cash), ''];
    case 'feature': { const t = (f?.short || f?.name || s.feature).toUpperCase().split('|'); return [t[0], t[1] || '']; }
    case 'nudges': return ['NUDGE', `+${s.count}`];
    case 'shots': return [`+${s.count}`, s.count === 1 ? shot : shot + 'S'];
    case 'level': return ['LEVEL', 'UP'];
    case 'half': return ['HALF', 'BANK'];
    case 'end': return ['END', ''];
    case 'miss': return ['LOSE', 'A ' + shot];
    case 'bust': return ['BUST', ''];
    case 'taxi': return ['TAXI', ''];
    case 'pot': return ['CASH', 'POT'];
  }
  return ['', ''];
}

function squareFill(s, T) {
  return { go: T.go, cash: T.cash, feature: T.feature, nudges: T.nudges, shots: T.shots, level: T.level, half: T.risk, miss: T.risk, end: T.risk, bust: T.risk, taxi: T.taxi, pot: T.pot }[s.type] || T.edge;
}

function drawDie(g, x, y, size, face, lit) {
  const { rect, frameBox, C } = g;
  frameBox(x, y, size, size, lit ? '#f8f0e0' : '#2a2230', '#000');
  if (!face) return;
  const a = Math.round(size * 0.27), m = Math.round(size / 2), b = size - a, r = Math.max(2, Math.round(size / 9));
  const pips = { 1: [[m, m]], 2: [[a, a], [b, b]], 3: [[a, a], [m, m], [b, b]], 4: [[a, a], [b, a], [a, b], [b, b]],
    5: [[a, a], [b, a], [m, m], [a, b], [b, b]], 6: [[a, a], [b, a], [a, m], [b, m], [a, b], [b, b]] };
  for (const [px, py] of pips[face]) rect(x + px - Math.floor(r / 2), y + py - Math.floor(r / 2), r, r, C.red);
}

// The small number shown under a picture, if the square needs one.
function squareNumber(s, g) {
  if (s.type === 'cash') return g.money(s.cash);
  if (s.type === 'nudges' || s.type === 'shots') return `+${s.count}`;
  if (s.type === 'miss') return '-1';
  if (s.type === 'pot') return g.money(g.disp.cashPot);
  return '';
}

function iconFor(s, icons, g) {
  const key = s.type === 'feature' ? icons.feature?.[s.feature] : icons[s.type];
  return key ? g.images[key] : null;
}

export function drawLoopBoard(g, theme = {}, icons = {}) {
  const T = { ...DEFAULT_THEME, ...theme }, L = g.disp.loop, { text, rect, frameBox, blink, C } = g;
  const { cols, rows, squares } = L;
  const A = LOOP_AREA;
  frameBox(A.x, A.y, A.w, A.h, T.ground, C.cabinetEdge);
  const cw = Math.floor((A.w - 6) / cols), ch = Math.floor((A.h - 6) / rows);
  const ox = A.x + Math.floor((A.w - cw * cols) / 2), oy = A.y + Math.floor((A.h - ch * rows) / 2);
  const lamp = g.disp.lamp, taxi = lamp?.kind === 'loop';     // a taxi lamp racing round the board
  const at = Math.round(taxi ? lamp.pos : L.pos) % squares.length;

  squares.forEach((s, i) => {
    const [c, r] = loopCell(i, cols, rows), x = ox + c * cw, y = oy + r * ch;
    const here = i === at;
    rect(x, y, cw, ch, '#000');
    rect(x + 1, y + 1, cw - 2, ch - 2, squareFill(s, T));
    if (here) {
      const lit = L.flash || taxi ? blink(3) : blink(10);
      g.ctx.strokeStyle = lit ? C.gold : '#fff'; g.ctx.lineWidth = 2;
      g.ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4);
    }
    const ink = s.type === 'go' ? '#201008' : T.ink;
    const icon = iconFor(s, icons, g);
    if (icon) {
      const num = squareNumber(s, g), iy = num ? y + 3 : y + Math.floor((ch - 32) / 2);
      g.ctx.drawImage(icon, x + Math.floor((cw - 32) / 2), iy);
      if (s.type === 'miss') {                                    // a red cross over the token
        g.ctx.strokeStyle = '#e02020'; g.ctx.lineWidth = 3;
        g.ctx.beginPath(); g.ctx.moveTo(x + cw / 2 - 11, iy + 6); g.ctx.lineTo(x + cw / 2 + 11, iy + 28);
        g.ctx.moveTo(x + cw / 2 + 11, iy + 6); g.ctx.lineTo(x + cw / 2 - 11, iy + 28); g.ctx.stroke();
      }
      if (s.type === 'half') {                                    // a crack down the piggy bank
        g.ctx.strokeStyle = '#201008'; g.ctx.lineWidth = 1;
        g.ctx.beginPath(); g.ctx.moveTo(x + cw / 2, iy + 6);
        for (let k = 1; k <= 5; k++) g.ctx.lineTo(x + cw / 2 + (k % 2 ? 3 : -2), iy + 6 + k * 4);
        g.ctx.stroke();
      }
      if (num) { text(num, x + cw / 2 + 2, y + ch - 9, '#000', { align: 'center' }); text(num, x + cw / 2 + 1, y + ch - 10, s.type === 'cash' ? C.gold : ink, { align: 'center' }); }
    } else {
      const [a, b] = squareText(s, g, L.shotName || 'SHOT');
      const ya = b ? y + Math.floor(ch / 2) - 8 : y + Math.floor(ch / 2) - 3;
      text(a, x + cw / 2 + 1, ya, ink, { align: 'center' });
      if (b) text(b, x + cw / 2 + 1, ya + 9, ink, { align: 'center' });
    }
    if (here) { g.disc(x + cw - 8, y + ch - 8, 4, '#000'); g.disc(x + cw - 8, y + ch - 8, 3, C.red); }
  });

  // the centre panel
  const ix = ox + cw + 4, iy = oy + ch + 4, iw = cw * (cols - 2) - 8, ih = ch * (rows - 2) - 8;
  frameBox(ix, iy, iw, ih, '#140c18', C.cabinetEdge);
  const cx = ix + iw / 2;
  text(L.title || g.FEATURE_NAMES[L.feature] || 'BOARD', cx + 1, iy + 5, C.gold, { align: 'center' });

  drawDie(g, ix + 8, iy + 18, 30, L.face, true);
  text((L.shotName || 'SHOT') + 'S', ix + 50, iy + 19, T.dim);
  text(String(L.shots), ix + 50, iy + 29, L.shots <= 1 ? C.red : C.ink, { scale: 2 });
  text('BANK', ix + 96, iy + 19, T.dim);
  text(g.money(L.bank), ix + 96, iy + 29, C.gold, { scale: 2 });

  // level ladder, top level first
  const lv = L.levels, rowH = 11, top = iy + 56;
  text('LEVEL PRIZE', ix + 8, top - 2, T.dim);
  lv.slice().reverse().forEach((p, k) => {
    const n = lv.length - k, y = top + 8 + k * rowH, on = n <= L.level, cur = n === L.level;
    frameBox(ix + 8, y, iw - 16, rowH - 1, on ? (cur && blink(16) ? '#fff' : T.level) : '#2a1830', '#000');
    text(`${n} ${p.label}`, ix + 12, y + 2, on ? '#201008' : T.dim);
  });

  // what has been won so far
  const wy = top + 12 + lv.length * rowH;
  const won = [...L.awards.map(id => (g.config.features[id]?.name || id).toUpperCase()), ...(L.nudges ? [`${L.nudges} NUDGES`] : [])];
  text(won.length ? 'WON:' : '', ix + 8, wy, T.dim);
  let line = '', ly = wy + 9;
  for (const w of won) {
    const next = line ? `${line} / ${w}` : w;
    if (next.length * 6 > iw - 16) { text(line + ' /', ix + 8, ly, C.ink); ly += 9; line = w; } else line = next;
  }
  if (line) text(line, ix + 8, ly, C.ink);

  g.drawBanner(A.x + A.w / 2, iy + ih - 20);
}
