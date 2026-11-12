// Thrill Park top glass: a theme park at sunset. In the middle the Ride Wheel: eight rides in a ring
// round the castle; when tickets come in, a lamp races round them and you press STOP on the ride you
// want. Along the bottom, three ticket slots light for each golden ticket in view after a spin
// (three start the feature). The Rollercoaster's cash ladder shows there while it runs.
// Art from machines/thrill-park/art (see art.js).

const RIDE_ART = ['ride_coaster', 'ride_teacups', 'ride_flume', 'ride_ghost', 'ride_ship', 'ride_tower', 'ride_carousel', 'ride_splash'];
const WHEEL = { cx: 135, cy: 112, r: 62 };

function drawWheel(g) {
  const { config, disp, images, ctx, frameBox, text, C } = g, segs = config.features.rideWheel.board, lamp = disp.lamp;
  const running = lamp && lamp.kind === 'board';
  const at = running ? Math.round(lamp.pos) % lamp.n : g.idle ? Math.floor(g.frame / 10) % segs.length : -1;
  // track ring
  ctx.strokeStyle = '#ffffff30'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(WHEEL.cx, WHEEL.cy, WHEEL.r, 0, Math.PI * 2); ctx.stroke();
  segs.forEach((s, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / segs.length;
    const x = Math.round(WHEEL.cx + Math.cos(a) * WHEEL.r - 17), y = Math.round(WHEEL.cy + Math.sin(a) * WHEEL.r - 17);
    const lit = i === at;
    frameBox(x, y, 34, 34, lit ? '#ffd040' : '#2a1a40d0', '#000');
    const im = images[RIDE_ART[i]];
    if (im) ctx.drawImage(im, x + 1, y + 1, 32, 32);
  });
  // centre: castle, or the ride the lamp is on
  const cast = images.sym_SE;
  if (running) {
    const s = segs[at];
    text(s.label, WHEEL.cx + 1, WHEEL.cy - 4, C.gold, { align: 'center' });
    if (s.pays) text(g.money(s.pays), WHEEL.cx + 1, WHEEL.cy + 8, C.ink, { align: 'center' });
  } else if (cast) ctx.drawImage(cast, WHEEL.cx - 20, WHEEL.cy - 22, 40, 40);
}

// Ticket slots: one lights for each golden ticket in view after the last spin.
function drawTickets(g) {
  const { disp, images, frameBox, ctx, machine, C } = g, n = g.config.scatter.min, w = 64, gap = 8;
  if (machine.phase === 'ladder') { g.lampsLadder(8, 196, 30, 26); return; }
  const x0 = Math.round((g.W - (n * w + (n - 1) * gap)) / 2), y = 197;
  for (let i = 0; i < n; i++) {
    const on = i < disp.trail, x = x0 + i * (w + gap);
    frameBox(x, y, w, 30, on ? (disp.trail >= n && g.blink(4) ? '#fff' : '#ffd040') : '#2a1a40', '#000');
    const im = images.sym_BN;
    if (im) { if (!on) ctx.globalAlpha = 0.3; ctx.drawImage(im, x + w / 2 - 13, y + 2, 26, 26); ctx.globalAlpha = 1; }
  }
}

export default {
  featureIcons: { ghostTrain: 'ride_ghost' },
  display: { on: '#ff60e0', off: '#200820', bg: '#0c0410' },       // pink display
  drawTop(g) {
    const { ctx, images, text, C } = g;
    if (images.park) { ctx.globalAlpha = 0.6; ctx.drawImage(images.park, 7, 6, 256, 224); ctx.globalAlpha = 1; }
    g.frameBox(g.W / 2 - 72, 5, 144, 20, '#3a1050', '#ffd040');
    text('THRILL PARK', g.W / 2 + 1, 10, '#200820', { scale: 2, align: 'center' });
    text('THRILL PARK', g.W / 2, 9, '#ffd040', { scale: 2, align: 'center' });
    drawWheel(g);
    drawTickets(g);
    g.drawBanner(g.W / 2, 112);
  },
};
