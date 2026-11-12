// PLACEHOLDER reel symbols drawn in code, 32x32 each.
// These get replaced by the Pixellab symbol set; anything named in the art pack overrides them.

import { drawText } from './font.js';

const SIZE = 32;

function canvas() {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(SIZE, SIZE) : Object.assign(document.createElement('canvas'), { width: SIZE, height: SIZE });
  return [c, c.getContext('2d')];
}

// Pixel-filled circle (no anti-aliasing).
function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) ctx.fillRect(cx + x, cy + y, 1, 1);
}

function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.05) ctx.fillRect(cx + x, cy + y, 1, 1);
}

const draw = {
  CH: ctx => {
    ctx.fillStyle = '#3a8a2a';
    for (let i = 0; i < 10; i++) { ctx.fillRect(11 + Math.floor(i / 2), 5 + i, 1, 1); ctx.fillRect(21 - Math.floor(i / 2), 5 + i, 1, 1); }
    ctx.fillRect(13, 4, 7, 2);
    disc(ctx, 10, 21, 6, '#b0102a'); disc(ctx, 22, 21, 6, '#d01838');
    disc(ctx, 8, 19, 1, '#ff8090'); disc(ctx, 20, 19, 1, '#ff8090');
  },
  LE: ctx => { ellipse(ctx, 16, 16, 12, 8, '#e8d020'); ellipse(ctx, 13, 13, 4, 2, '#fff080'); ctx.fillStyle = '#c0a010'; ctx.fillRect(3, 15, 2, 2); ctx.fillRect(27, 15, 2, 2); },
  OR: ctx => { disc(ctx, 16, 17, 11, '#f08018'); disc(ctx, 12, 13, 3, '#ffc070'); ctx.fillStyle = '#3a8a2a'; ctx.fillRect(15, 4, 3, 3); ctx.fillRect(18, 3, 4, 2); },
  PL: ctx => { ellipse(ctx, 16, 17, 10, 12, '#7a2a9a'); ellipse(ctx, 12, 12, 2, 4, '#c080e0'); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(16, 2, 2, 4); },
  ME: ctx => {
    disc(ctx, 16, 16, 13, '#2a8a3a');
    ctx.fillStyle = '#7ad07a';
    for (const x of [8, 13, 19, 24]) for (let y = 5; y < 28; y++) if ((x - 16) ** 2 + (y - 16) ** 2 < 150) ctx.fillRect(x, y, 2, 1);
  },
  BE: ctx => {
    ctx.fillStyle = '#e0b020';
    for (let y = 5; y < 25; y++) { const w = y < 9 ? 4 + (y - 5) * 2 : 12 + Math.floor((y - 9) / 2); ctx.fillRect(16 - w / 2, y, w, 1); }
    ctx.fillStyle = '#fff090'; ctx.fillRect(11, 9, 2, 10);
    ctx.fillStyle = '#c08010'; ctx.fillRect(5, 24, 22, 2);
    disc(ctx, 16, 28, 2, '#a06010');
  },
  BA: ctx => { ctx.fillStyle = '#101010'; ctx.fillRect(2, 9, 28, 14); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(2, 9, 28, 1); ctx.fillRect(2, 22, 28, 1); drawText(ctx, 'BAR', 7, 13, '#f0f0f0'); },
  SE: ctx => { drawText(ctx, '7', 9, 3, '#600010', { scale: 4 }); drawText(ctx, '7', 8, 2, '#e01020', { scale: 4 }); },
  QM: ctx => {
    disc(ctx, 16, 16, 14, '#101018'); disc(ctx, 16, 16, 12, '#20a060'); disc(ctx, 16, 16, 9, '#d02030'); disc(ctx, 16, 16, 7, '#f0e8d0');
    drawText(ctx, '?', 14, 10, '#101018', { scale: 2 });
  },
  DT: ctx => {
    ctx.fillStyle = '#c8c8d0'; for (let i = 0; i < 14; i++) ctx.fillRect(4 + i, 27 - i, 2, 2);
    ctx.fillStyle = '#d02020'; for (let i = 0; i < 6; i++) ctx.fillRect(17 + i, 14 - i, 3, 3);
    ctx.fillStyle = '#20a0e0'; ctx.fillRect(22, 3, 7, 3); ctx.fillRect(26, 3, 3, 7); ctx.fillRect(23, 6, 3, 3);
  },
};

export function placeholderSymbols() {
  const out = {};
  for (const [k, f] of Object.entries(draw)) { const [c, ctx] = canvas(); f(ctx); out[k] = c; }
  return out;
}
