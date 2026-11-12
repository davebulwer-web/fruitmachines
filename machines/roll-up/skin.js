// Roll Up top glass: a funfair at night behind a striped awning, a small map of the Fairground board on the left (the feature game itself takes over
// the screen when it starts, see ui/loop-board.js), the 10-step trail on the right, the Feature Held
// lamp and the level prizes. Art from machines/roll-up/art (see art.js).
import { loopCell } from '../../ui/loop-board.js';
import { boardOf } from '../../engine/features/loopBoard.js';

const BOARD = { x: 8, y: 32, cell: 26, cols: 5 };
const TRAIL = { x: 146, y: 32, w: 116, h: 12, gap: 1 };
const HELD = { x: 8, y: 166 };
const WHEEL = { x: 8, y: 188, w: 20, h: 16 };

const compact = p => (p < 100 ? `${p}p` : `£${String(p / 100).replace(/^0/, '')}`);

// Board square pictures (art.js keys), used on the big board screen and the small map.
const ICONS = {
  go: 'sq_go', cash: 'sq_cash', nudges: 'sq_nudge', level: 'sq_level', shots: 'sq_token', miss: 'sq_token',
  half: 'sq_half', end: 'sq_end', bust: 'sq_end',
  feature: { winSpin: 'sq_duck', hiLo: 'sq_striker', pick: 'sq_coconut', doubleUp: 'sq_dodgem', freeHolds: 'sq_horse', nudgeBank: 'sq_nudge' },
};
const iconKey = s => (s.type === 'feature' ? ICONS.feature[s.feature] : ICONS[s.type]);

const MAP_FILL = { go: '#e8e0d0', cash: '#1f5a2a', feature: '#1f4a7a', nudges: '#16606a', shots: '#5a2a7a', level: '#7a5a10', half: '#7a1420', end: '#7a1420', bust: '#7a1420' };

// The Prom Board in miniature, so players can see what the trail leads to.
function drawMap(g) {
  const b = boardOf(g.config, g.config.features.board2), sq = b._squares, cols = b.cols || 6, rows = b.rows || 6;
  const cw = Math.floor(BOARD.cell * 5 / cols), ch = Math.floor(BOARD.cell * 5 / rows);
  const lit = g.idle ? Math.floor(g.frame / 8) % sq.length : -1;
  sq.forEach((s, i) => {
    const [c, r] = loopCell(i, cols, rows), x = BOARD.x + c * cw, y = BOARD.y + r * ch;
    g.rect(x, y, cw, ch, '#000');
    g.rect(x + 1, y + 1, cw - 2, ch - 2, i === lit ? g.C.lampOn : MAP_FILL[s.type] || '#333');
    const im = g.images[iconKey(s)];
    if (im) g.ctx.drawImage(im, x + Math.floor((cw - 16) / 2), y + Math.floor((ch - 16) / 2), 16, 16);
  });
  const cx = BOARD.x + (cw * cols) / 2;
  // a big die in the middle says "roll round this board"; the face changes while the machine waits
  const cy = BOARD.y + (ch * rows) / 2, s = 34, face = g.idle ? 1 + (Math.floor(g.frame / 40) % 6) : 6;
  g.frameBox(cx - s / 2, cy - s / 2, s, s, '#f8f0e0', '#000');
  const a = 9, mm = 17, z = 25, pips = { 1: [[mm, mm]], 2: [[a, a], [z, z]], 3: [[a, a], [mm, mm], [z, z]], 4: [[a, a], [z, a], [a, z], [z, z]],
    5: [[a, a], [z, a], [mm, mm], [a, z], [z, z]], 6: [[a, a], [z, a], [a, mm], [z, mm], [a, z], [z, z]] }[face];
  for (const [px, py] of pips) g.disc(cx - s / 2 + px, cy - s / 2 + py, 2, g.C.red);
}

// The level prizes along the bottom of the glass.
function drawLevels(g) {
  const lv = boardOf(g.config, g.config.features.board2).levels || [];
  const w = Math.floor((g.W - 16) / lv.length);
  g.text('LEVEL PRIZES', g.W / 2, 190, g.C.dim, { align: 'center' });
  lv.forEach((p, i) => {
    const x = 8 + i * w, top = i === lv.length - 1;
    g.frameBox(x, 200, w - 2, 28, top ? '#6a5010' : g.C.ladderOff, '#000');
    g.text(String(i + 1), x + 4, 203, g.C.dim);
    const im = p.feature && g.images[ICONS.feature[p.feature]];
    if (im) g.ctx.drawImage(im, x + (w - 2) / 2 - 10, 205, 20, 20);
    else g.text(p.label, x + (w - 2) / 2 + 1, 211, top ? g.C.gold : g.C.ink, { align: 'center' });
  });
}

export default {
  loopIcons: ICONS,
  featureIcons: { pick: 'sq_coconut' },
  display: { on: '#50ffb0', off: '#08201a', bg: '#03100a' },     // green fluorescent display
  // funfair colours for the big board screen (ui/loop-board.js)
  loopTheme: {
    ground: '#120a20', cash: '#9a1e3a', feature: '#1a5aa0', nudges: '#127068', shots: '#6a2a9a',
    level: '#a07010', risk: '#3a0a14', go: '#f4ead8',
  },

  drawTop(g) {
    const { C, config, machine, disp, text, blink, frameBox, ctx, images } = g;
    if (images.fair) { ctx.globalAlpha = 0.6; ctx.drawImage(images.fair, 7, 6, 256, 224); ctx.globalAlpha = 1; }
    // striped awning with scalloped edge under the title
    for (let x = 4; x < g.W - 4; x += 12) {
      g.rect(x, 4, 6, 18, '#d02838'); g.rect(x + 6, 4, 6, 18, '#f4ead8');
      g.disc(x + 3, 22, 3, '#d02838'); g.disc(x + 9, 22, 3, '#f4ead8');
    }
    g.rect(g.W / 2 - 50, 5, 100, 17, '#1a0a20');
    text('ROLL UP', g.W / 2 + 1, 8, '#400810', { scale: 2, align: 'center' });
    text('ROLL UP', g.W / 2, 7, C.gold, { scale: 2, align: 'center' });

    drawMap(g);

    // the trail, step 10 at the top
    const n = config.trail.length, lamp = disp.lamp;
    for (let i = n; i >= 1; i--) {
      const y = TRAIL.y + (n - i) * (TRAIL.h + TRAIL.gap);
      let on = i <= disp.trail;
      if (disp.ringFlash === i) on = blink(4);
      if (lamp && lamp.kind === 'trail') on = Math.round(lamp.pos) % lamp.n === i - 1;
      if (g.idle) on = Math.floor(g.frame / 6) % n === i - 1;
      const id = config.trail.rungs[i];
      const offered = machine.phase === 'offer' && i === machine.trail && !g.busy;
      const fill = on ? (offered && blink(6) ? '#fff' : i === n ? C.ladderOn : C.lampOn) : id ? '#4a2a38' : C.lampOff;
      frameBox(TRAIL.x, y, TRAIL.w, TRAIL.h, fill, '#000');
      const ink = on ? '#200808' : id ? C.ink : C.dim;
      text(String(i), TRAIL.x + 4, y + 3, ink);
      // each step shows how many tokens its board gives, as token pictures
      const tokens = id && config.features[id].shots, im = g.images.sq_token;
      if (tokens && im) for (let k = 0; k < tokens; k++) ctx.drawImage(im, TRAIL.x + 18 + k * 9, y + 1, 10, 10);
      else if (id) text(g.FEATURE_NAMES[id], TRAIL.x + 18, y + 3, ink);
    }

    g.heldLamp(HELD.x, HELD.y);

    // the prize wheel shows as a strip of lamps while it runs
    if (lamp && lamp.kind === 'board') {
      const at = Math.round(lamp.pos) % lamp.n;
      lamp.board.forEach((s, i) => {
        const x = WHEEL.x + i * (WHEEL.w + 1), lit = i === at;
        frameBox(x, WHEEL.y, WHEEL.w, WHEEL.h, lit ? (s.pays ? C.lampOn : C.red) : s.pays ? C.ladderOff : '#3a0a10', '#000');
        text(s.pays ? compact(s.pays).replace('£', '') : 'X', x + WHEEL.w / 2 + 1, WHEEL.y + 5, lit ? '#200808' : C.ink, { align: 'center' });
      });
    }

    drawLevels(g);
    g.drawBanner(BOARD.x + 65, BOARD.y + 65);
  },
};
