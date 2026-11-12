// Golden Goal top glass: a floodlit stadium behind a scoreboard title. The league table (the trail) on
// the left with each place's feature as a picture, the Trophy jackpot, Penalty lamp and Feature Held
// lamp on the right, and the Cup Run in miniature along the bottom. The Cup Run itself takes over the
// screen when it starts (ui/dice-board.js); Penalty and Free Kick play on the shared screen.
// Art from machines/golden-goal/art (see art.js).
import { parseSquares } from '../../engine/features/diceBoard.js';

const TABLE = { x: 8, y: 30, w: 132, h: 13, gap: 1 };
const SIDE = { x: 146, w: 116 };

// Pictures for each league place's feature, and an extra mark.
const RUNG_ART = {
  freeKick: ['sq_free', ''], bigFreeKick: ['sq_free', 'X2'], cupRun: ['sq_through', ''], cupRunPlus: ['sq_through', '+'],
  hatTrick: ['sq_hat', ''], trophy: ['sym_SE', '£4'],
};

const DICE_ICONS = { counter: 'ball', ladder: 'sq_through', snake: 'sq_tackle', lose: 'sq_red', go: 'sq_go', last: 'sym_SE',
  feature: { freeKick: 'sq_free', hatTrick: 'sq_hat' } };
const STRIP_FILL = { go: '#e8e0d0', cash: '#1f4a2a', ladder: '#2aa04a', snake: '#c03a1a', lose: '#7a0a14', feature: '#2a5aa0' };

function drawTable(g) {
  const { config, disp, machine, frameBox, text, blink, C, images, ctx } = g, n = config.trail.length, lamp = disp.lamp;
  for (let i = n; i >= 1; i--) {
    const y = TABLE.y + (n - i) * (TABLE.h + TABLE.gap), id = config.trail.rungs[i];
    let on = i <= disp.trail;
    if (disp.ringFlash === i) on = blink(4);
    if (lamp && lamp.kind === 'trail') on = Math.round(lamp.pos) % lamp.n === i - 1;
    if (g.idle) on = Math.floor(g.frame / 6) % n === i - 1;
    const offered = machine.phase === 'offer' && i === machine.trail && !g.busy;
    const fill = on ? (offered && blink(6) ? '#fff' : i === n ? C.gold : '#7ad07a') : id ? '#1a3a24' : '#14261a';
    frameBox(TABLE.x, y, TABLE.w, TABLE.h, fill, '#000');
    const ink = on ? '#082008' : id ? C.ink : C.dim;
    text(String(n + 1 - i), TABLE.x + 4, y + 3, ink);                     // league position: top of the table is 1st
    if (id) {
      const [key, mark] = RUNG_ART[id] || [];
      if (images[key]) ctx.drawImage(images[key], TABLE.x + 22, y + 1, 11, 11);
      text((g.FEATURE_NAMES[id] || '').replace('BIG ', ''), TABLE.x + 36, y + 3, ink);
      if (mark) text(mark, TABLE.x + TABLE.w - 4, y + 3, on ? '#082008' : C.gold, { align: 'right' });
    }
  }
}

// The Cup Run in miniature: one tiny square per board square, final square gold.
function drawStrip(g) {
  const b = g.config.boards.cup, sq = (b._squares ||= parseSquares(b.squares));
  const w = Math.floor((g.W - 16) / sq.length), x0 = Math.round((g.W - w * sq.length) / 2), y = 206;
  g.text(b.name, g.W / 2 + 1, y - 10, g.C.gold, { align: 'center' });
  const lit = g.idle ? Math.floor(g.frame / 5) % sq.length : -1;
  sq.forEach((s, i) => {
    const last = i === sq.length - 1;
    g.rect(x0 + i * w, y, w - 1, 14, i === lit ? '#fff' : last ? g.C.gold : STRIP_FILL[s.type] || '#333');
  });
  const ball = g.images.ball;
  if (ball) g.ctx.drawImage(ball, x0 - 2, y + 14, 10, 10);
  const cup = g.images.sym_SE;
  if (cup) g.ctx.drawImage(cup, x0 + w * sq.length - 10, y + 14, 12, 12);
}

export default {
  featureIcons: {},
  diceIcons: DICE_ICONS,
  diceTheme: { ground: '#0a1a10', cash: '#1f4a2a', ladder: '#1f7a3a', snake: '#8a2a10', lose: '#5a0a14', feature: '#1f4a7a', last: '#c09020' },
  display: { on: '#ff4030', off: '#240808', bg: '#100303' },       // classic red display

  drawTop(g) {
    const { C, text, ctx, images, disp } = g;
    if (images.stadium) { ctx.globalAlpha = 0.6; ctx.drawImage(images.stadium, 7, 6, 256, 224); ctx.globalAlpha = 1; }
    // scoreboard title
    g.frameBox(g.W / 2 - 66, 5, 132, 20, '#101010', '#000');
    g.rect(g.W / 2 - 64, 7, 128, 16, '#1a1a10');
    text('GOLDEN GOAL', g.W / 2 + 1, 10, '#402800', { scale: 2, align: 'center' });
    text('GOLDEN GOAL', g.W / 2, 9, C.gold, { scale: 2, align: 'center' });

    drawTable(g);

    // the trophy jackpot
    g.frameBox(SIDE.x, 30, SIDE.w, 74, '#0c1a10cc', '#000');
    const cup = images.sym_SE;
    if (cup) ctx.drawImage(cup, SIDE.x + SIDE.w / 2 - 24, 33, 48, 48);
    text(`TROPHY ${g.money(g.config.jackpot)}`, SIDE.x + SIDE.w / 2 + 1, 88, C.gold, { align: 'center' });

    // penalty lamp: lit while a penalty is on
    const pen = !!disp.penalty;
    g.frameBox(SIDE.x, 110, SIDE.w, 18, pen && g.blink(6) ? '#fff' : pen ? '#7ad07a' : '#14261a', '#000');
    text('PENALTY', SIDE.x + SIDE.w / 2 + 1, 116, pen ? '#082008' : C.dim, { align: 'center' });
    g.heldLamp(SIDE.x, 134, SIDE.w, 18);

    drawStrip(g);
    g.drawBanner(g.W / 2, 100);
  },
};
