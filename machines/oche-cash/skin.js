// Oche Cash top glass: the dartboard with the 12-rung Checkout trail round it, the Feature Held
// lamp and the cash ladder. Board-stop features run a lamp round the dartboard's segments.
const RING = { cx: 135, cy: 112, r: 78, lamp: 11, board: 52 };
const LADDER = { x: 8, y: 208, w: 31, h: 20 };
const HELD = { x: 8, y: 184 };

const ringPoint = (i, n, r) => { const a = -Math.PI / 2 + i * (2 * Math.PI / n); return [Math.round(RING.cx + r * Math.cos(a)), Math.round(RING.cy + r * Math.sin(a))]; };

export default {
  drawTop(g) {
    const { ctx, C, config, machine, disp, images, text, disc, blink } = g;
    if (images.pub) { ctx.globalAlpha = 0.55; ctx.drawImage(images.pub, 7, 6, 256, 224); ctx.globalAlpha = 1; }
    if (images.dartboard) ctx.drawImage(images.dartboard, RING.cx - 64, RING.cy - 64);
    else { disc(RING.cx, RING.cy, 60, '#101010'); disc(RING.cx, RING.cy, 44, '#e8dcc0'); disc(RING.cx, RING.cy, 6, C.red); }

    text('OCHE CASH', g.W / 2 + 1, 9, '#400810', { scale: 2, align: 'center' });
    text('OCHE CASH', g.W / 2, 8, C.gold, { scale: 2, align: 'center' });

    // the Checkout trail: 12 lamps round the board, rung 1 just right of the top
    const n = config.trail.length, lamp = disp.lamp;
    for (let i = 1; i <= n; i++) {
      const [x, y] = ringPoint(i, n, RING.r);
      let on = i <= disp.trail;
      if (disp.ringFlash === i) on = blink(4);
      if (lamp && lamp.kind === 'trail') on = Math.round(lamp.pos) % lamp.n === i - 1;
      if (g.idle) on = Math.floor(g.frame / 6) % n === i - 1;
      const feature = i >= config.trail.featureFrom;
      const offered = machine.phase === 'offer' && i === machine.trail && !g.busy;
      disc(x, y, RING.lamp + 1, '#000');
      disc(x, y, RING.lamp, on ? (offered && blink(6) ? '#fff' : i === n ? C.ladderOn : C.lampOn) : feature ? '#4a2a38' : C.lampOff);
      text(String(i), x + 1, y - 3, on ? '#200808' : feature ? C.ink : C.dim, { align: 'center' });
    }

    // a lamp running round the board segments (Round the Board / Treble Top)
    if (lamp && lamp.kind === 'board') {
      const at = Math.round(lamp.pos) % lamp.n, seg = lamp.board[at];
      const [x, y] = ringPoint(at + 0.5, lamp.n, RING.board);
      disc(x, y, 6, '#000'); disc(x, y, 5, seg.pays ? C.lampOn : C.red);
      g.bannerBox(RING.cx, RING.cy, seg.label, seg.pays ? C.gold : C.red);
    }

    g.heldLamp(HELD.x, HELD.y);
    g.lampsLadder(LADDER.x, LADDER.y, LADDER.w, LADDER.h);

    if (!g.drawBanner(RING.cx, RING.cy) && g.idle) {
      const list = Object.entries(config.trail.rungs);
      const [rung, id] = list[Math.floor(g.frame / 90) % list.length];
      text(`${rung}: ${g.FEATURE_NAMES[id]}`, RING.cx + 1, RING.cy + 70, C.gold, { align: 'center' });
    }
  },

  message(m, g) {
    if (m.phase === 'ladder') return 'CHECKOUT: COLLECT OR GAMBLE';
    if (m.phase === 'stop' && !(g.disp.lamp && g.disp.lamp.skill)) return 'ROUND THE BOARD';
    if (m.phase === 'streak') return 'CASH POT: PRESS START';
    return undefined;
  },

  async onEvent(e, g) {
    if (e.type === 'mystery') { g.say('SHANGHAI: ' + g.FEATURE_NAMES[e.pick], 1600); g.sound.fanfare(); await g.wait(1200); return true; }
    if (e.type === 'streakEnd') return false;
    return false;
  },
};
