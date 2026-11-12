// Supermarket top glass: a supermarket aisle behind the lit letters of SUPERMARKET (the trail: each
// number on the reels lights the next letter, and they stay lit between games). Below them the till:
// eight features with pictures, and a lamp runs round them to pick one when all 11 letters are lit.
// Then the Loyalty Points meter (the cash pot) and the Trolley Dash level prizes.
// The Trolley Dash board takes over the screen when it starts (ui/loop-board.js).
// Art from machines/supermarket/art (see art.js).
import { boardOf } from '../../engine/features/loopBoard.js';
import { drawSegments } from '../../ui/segments.js';

const ICONS = {
  go: 'sq_go', cash: 'sq_cash', nudges: 'sq_nudge', level: 'sq_level', shots: 'sq_trip', miss: 'sq_trip',
  half: 'sq_half', end: 'sq_end', bust: 'sq_end', pot: 'sq_pot', double: 'sq_double',
  feature: { priceCheck: 'sq_scan', luckyBag: 'sq_lucky', bogof: 'sq_bogof', expressTill: 'sq_express', loyalty: 'sq_pot', nudgeBank: 'sq_nudge',
    dash4: 'sq_trip', dash5: 'sq_trip', dash8: 'sq_trip' },
};

// The SUPERMARKET letters: lit up to the trail; the next letter flickers while the machine waits.
function drawLetters(g) {
  const { config, disp, text, frameBox, blink, C } = g, word = config.trailLetters, n = word.length, lamp = disp.lamp;
  const w = 22, gap = 1, x0 = Math.round((g.W - (n * (w + gap) - gap)) / 2), y = 6;
  for (let i = 0; i < n; i++) {
    let on = i < disp.trail;
    if (disp.ringFlash === i + 1) on = blink(4);
    if (lamp && lamp.kind === 'trail') on = i < Math.round(lamp.pos) % lamp.n + 1;
    if (g.idle && !on) on = Math.floor(g.frame / 5) % (n * 2) === i;
    const x = x0 + i * (w + gap);
    frameBox(x, y, w, 28, on ? '#ffd040' : '#3a1418', '#000');
    if (on) g.rect(x + 2, y + 2, w - 4, 3, '#fff0b0');
    text(word[i], x + w / 2 + 1, y + 8, on ? '#6a1a10' : '#7a3a3a', { scale: 2, align: 'center' });
  }
}

// The till: each feature it can pick, as a picture; a lamp runs round them when the letters are complete.
function drawTill(g) {
  const { config, disp, frameBox, text, C, images, ctx } = g, segs = config.features.till.board, lamp = disp.lamp;
  const at = lamp && lamp.kind === 'board' ? Math.round(lamp.pos) % lamp.n : -1;
  const cols = 4, w = 60, h = 44, gx = Math.round((g.W - cols * (w + 2)) / 2), gy = 42;
  segs.forEach((s, i) => {
    const x = gx + (i % cols) * (w + 2), y = gy + Math.floor(i / cols) * (h + 2), lit = i === at;
    frameBox(x, y, w, h, lit ? '#ffd040' : '#1a2a4acc', '#000');
    const im = images[ICONS.feature[s.feature]];
    if (im) ctx.drawImage(im, x + w / 2 - 14, y + 3, 28, 28);
    text(s.label.replace('EXPRESS TILL', 'EXPRESS').replace('PRICE CHECK', 'PRICE'), x + w / 2 + 1, y + h - 10, lit ? '#201008' : C.ink, { align: 'center' });
  });
}

function drawPot(g) {
  const { frameBox, text, disp, C } = g, x = 8, y = 140, w = g.W - 16;
  const flash = disp.potFlash && g.blink(3);
  frameBox(x, y, w, 26, flash ? '#ffd040' : '#101a30', '#000');
  const icon = g.images.sq_pot;
  if (icon) g.ctx.drawImage(icon, x + 4, y + 1, 24, 24);
  text('LOYALTY POINTS', x + 34, y + 9, flash ? '#201008' : C.gold);
  frameBox(x + w - 76, y + 3, 72, 20, '#100303', '#000');
  drawSegments(g.ctx, g.money(disp.cashPot), x + w - 72, y + 6, 6, { w: 9, h: 14, gap: 2, on: '#ff4030', off: '#240808', align: 'right' });
}

function drawLevels(g) {
  const lv = boardOf(g.config, g.config.features.dash4).levels || [];
  const w = Math.floor((g.W - 16) / lv.length), y = 186;
  g.text('TROLLEY DASH LEVELS', g.W / 2 + 1, y - 10, g.C.gold, { align: 'center' });
  lv.forEach((p, i) => {
    const x = 8 + i * w, top = i === lv.length - 1;
    g.frameBox(x, y, w - 2, 40, top ? '#6a5010' : '#1a2a4a', '#000');
    g.text(String(i + 1), x + 4, y + 3, g.C.dim);
    const im = p.feature && g.images[ICONS.feature[p.feature]];
    if (im) g.ctx.drawImage(im, x + (w - 2) / 2 - 13, y + 6, 26, 26);
    else g.text(p.label, x + (w - 2) / 2 + 1, y + 16, top ? g.C.gold : g.C.ink, { align: 'center' });
  });
}

export default {
  loopIcons: ICONS,
  featureIcons: { luckyBag: 'sq_lucky' },
  display: { on: '#40c8ff', off: '#061a24', bg: '#020c12' },     // blue display, like a shop till
  loopTheme: {
    ground: '#0a1020', cash: '#1a5a2a', feature: '#1a4a8a', nudges: '#126a6a', shots: '#5a3a1a',
    level: '#8a6a10', risk: '#5a0a18', go: '#f4ead8', pot: '#2a4aa0', double: '#c8a010',
  },

  drawTop(g) {
    const { ctx, images } = g;
    if (images.aisle) { ctx.globalAlpha = 0.5; ctx.drawImage(images.aisle, 7, 6, 256, 224); ctx.globalAlpha = 1; }
    drawLetters(g);
    drawTill(g);
    drawPot(g);
    drawLevels(g);
    g.drawBanner(g.W / 2, 90);
  },
};
