// Night Cab top glass: a rainy high street at night behind a taxi-roof title sign. The City Round board in
// miniature on the left (the board itself takes over the screen when it starts, see ui/loop-board.js),
// the Cash Pot fare meter, REPEAT lamp and Feature Held lamp on the right, the 8-stop cab route across
// the middle and the level prizes along the bottom. Art from machines/night-cab/art (see art.js).
import { loopCell } from '../../ui/loop-board.js';
import { boardOf } from '../../engine/features/loopBoard.js';
import { drawSegments } from '../../ui/segments.js';

const MAP = { x: 8, y: 30, size: 120 };
const SIDE = { x: 136, w: 126 };
const ROUTE = { y: 160, h: 22 };

const ICONS = {
  go: 'sq_go', cash: 'sq_cash', nudges: 'sq_nudge', level: 'sq_level', shots: 'sq_fare', miss: 'sq_fare',
  half: 'sq_half', end: 'sq_end', bust: 'sq_end', taxi: 'sq_taxi', pot: 'sq_pot',
  feature: { greenLight: 'sq_light', hiLo: 'sq_hilo', lostProperty: 'sq_lost', rushHour: 'sq_rush', nightBus: 'sq_bus', nudgeBank: 'sq_nudge', pot: 'sq_pot' },
};
const iconKey = s => (s.type === 'feature' ? ICONS.feature[s.feature] : ICONS[s.type]);
const MAP_FILL = { go: '#e8e0d0', cash: '#5a1a6a', feature: '#1a4a8a', nudges: '#126a6a', shots: '#3a2a7a', level: '#8a6a10',
  half: '#6a1020', end: '#6a1020', bust: '#6a1020', miss: '#6a1020', taxi: '#c8a010', pot: '#8a6a10' };

// The City Round in miniature; while the machine waits a taxi lamp runs round it.
function drawMap(g) {
  const b = boardOf(g.config, g.config.features.board2), sq = b._squares, cols = b.cols, rows = b.rows;
  const c = Math.floor(MAP.size / cols);
  const lit = g.idle ? Math.floor(g.frame / 7) % sq.length : -1;
  sq.forEach((s, i) => {
    const [cx, cy] = loopCell(i, cols, rows), x = MAP.x + cx * c, y = MAP.y + cy * c;
    g.rect(x, y, c, c, '#000');
    g.rect(x + 1, y + 1, c - 2, c - 2, i === lit ? g.C.lampOn : MAP_FILL[s.type] || '#333');
    const im = g.images[iconKey(s)];
    if (im) g.ctx.drawImage(im, x + 1, y + 1, c - 2, c - 2);
  });
  // the cab in the middle of the ring
  const cab = g.images.sym_SE;
  if (cab) g.ctx.drawImage(cab, MAP.x + MAP.size / 2 - 24, MAP.y + MAP.size / 2 - 24, 48, 48);
}

// The Cash Pot, shown as a taxi fare meter with a segment readout.
function drawPot(g) {
  const { frameBox, text, disp, C } = g, x = SIDE.x, y = 32, w = SIDE.w;
  const flash = disp.potFlash && g.blink(3);
  frameBox(x, y, w, 46, flash ? '#ffd040' : '#1a1a22', '#000');
  g.rect(x + 2, y + 2, w - 4, 1, '#ffffff30');
  const icon = g.images.sq_pot;
  if (icon) g.ctx.drawImage(icon, x + 4, y + 7, 32, 32);
  text('CASH POT', x + 40, y + 6, flash ? '#201008' : C.gold);
  frameBox(x + 40, y + 17, w - 46, 21, '#100303', '#000');
  drawSegments(g.ctx, g.money(disp.cashPot), x + 44, y + 20, 6, { w: 10, h: 15, gap: 3, on: '#ff4030', off: '#240808', align: 'right' });
}

// REPEAT lamp: flashes while a repeat chance runs, stays lit when it pays again.
function drawRepeat(g) {
  const { frameBox, text, disp } = g, x = SIDE.x, y = 84, w = SIDE.w;
  const on = disp.repeat === 'won' || (disp.repeat === 'try' && g.blink(4));
  frameBox(x, y, w, 18, on ? '#ff60e0' : '#2a1a2a', '#000');
  text('REPEAT', x + w / 2 + 1, y + 6, on ? '#200820' : g.C.dim, { align: 'center' });
}

// The cab route: stops 1 to 8 left to right; stops with a board show how many fares it gives.
function drawRoute(g) {
  const { config, disp, machine, frameBox, text, blink, C } = g, n = config.trail.length, lamp = disp.lamp;
  const w = Math.floor((g.W - 16) / n);
  g.rect(8, ROUTE.y + ROUTE.h + 2, w * n - 1, 2, '#f0c040');
  for (let i = 1; i <= n; i++) {
    const x = 8 + (i - 1) * w, id = config.trail.rungs[i];
    let on = i <= disp.trail;
    if (disp.ringFlash === i) on = blink(4);
    if (lamp && lamp.kind === 'trail') on = Math.round(lamp.pos) % lamp.n === i - 1;
    if (g.idle) on = Math.floor(g.frame / 6) % n === i - 1;
    const offered = machine.phase === 'offer' && i === machine.trail && !g.busy;
    frameBox(x, ROUTE.y, w - 2, ROUTE.h, on ? (offered && blink(6) ? '#fff' : C.lampOn) : id ? '#3a2a48' : C.lampOff, '#000');
    const ink = on ? '#200808' : id ? C.ink : C.dim;
    if (id) {
      const fares = config.features[id].shots, im = g.images.sq_fare;
      text(String(fares), x + 4, ROUTE.y + 8, ink);
      if (im) g.ctx.drawImage(im, x + 12, ROUTE.y + 2, 18, 18);
    } else text(String(i), x + (w - 2) / 2 + 1, ROUTE.y + 8, ink, { align: 'center' });
  }
}

function drawLevels(g) {
  const lv = boardOf(g.config, g.config.features.board2).levels || [];
  const w = Math.floor((g.W - 16) / lv.length), y = 196;
  lv.forEach((p, i) => {
    const x = 8 + i * w, top = i === lv.length - 1;
    g.frameBox(x, y, w - 2, 30, top ? '#6a5010' : '#241a34', '#000');
    g.text(String(i + 1), x + 4, y + 3, g.C.dim);
    const im = p.feature && g.images[ICONS.feature[p.feature]];
    if (im) g.ctx.drawImage(im, x + (w - 2) / 2 - 11, y + 4, 22, 22);
    else g.text(p.label, x + (w - 2) / 2 + 1, y + 12, top ? g.C.gold : g.C.ink, { align: 'center' });
  });
}

export default {
  loopIcons: ICONS,
  featureIcons: { lostProperty: 'sq_lost' },
  display: { on: '#ffb020', off: '#241404', bg: '#100800' },       // amber display, like a taxi meter
  loopTheme: {
    ground: '#0c0a1a', cash: '#5a1a6a', feature: '#1a4a8a', nudges: '#126a6a', shots: '#3a2a7a',
    level: '#8a6a10', risk: '#4a0a18', go: '#f4ead8', taxi: '#c8a010', pot: '#8a6a10',
  },

  drawTop(g) {
    const { C, text, ctx, images } = g;
    if (images.city) { ctx.globalAlpha = 0.55; ctx.drawImage(images.city, 7, 6, 256, 224); ctx.globalAlpha = 1; }
    // the title on a glowing taxi roof sign
    g.frameBox(g.W / 2 - 58, 5, 116, 20, '#ffc828', '#000');
    g.rect(g.W / 2 - 56, 7, 112, 2, '#fff0a0');
    text('NIGHT CAB', g.W / 2 + 1, 10, '#6a4a00', { scale: 2, align: 'center' });
    text('NIGHT CAB', g.W / 2, 9, '#201008', { scale: 2, align: 'center' });

    drawMap(g);
    drawPot(g);
    drawRepeat(g);
    g.heldLamp(SIDE.x, 108, SIDE.w, 18);
    drawRoute(g);
    drawLevels(g);
    g.drawBanner(MAP.x + MAP.size / 2, MAP.y + MAP.size / 2);
  },
};
