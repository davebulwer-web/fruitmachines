// The shared cabinet screen. It owns the canvas, art loading, the bottom glass (paytable, reels,
// meters, buttons), sound, input, scaling and the playback of every engine event.
// A machine's skin (machines/<id>/skin.js) only draws the top glass from the display state below.
//
// Skin interface (all optional except drawTop):
//   drawTop(g)              draw the top glass, y 3 to 232, from g.disp and g.machine
//   onEvent(e, g)           async; return true to take over an event entirely
//   controls(m, g)          extra or replacement button map for a phase (see controlsFor)
//   message(m, g)           status line text for a phase, or undefined for the default
//   leds(g)                 four [label, value] meters under the reels' sides
//   display                 segment display colours { on, off, bg } (default red LEDs)
//   loopTheme, loopIcons    colours and square pictures for the big board screen (see ui/loop-board.js)
//   featureIcons            { featureId: imageKey } pictures used by feature panels (e.g. Pick)
//
// Display state g.disp (what the top glass should show right now, lagging the engine while animating):
//   credit, trail, held, lamp (running lamp: { kind, n, pos, board, skill }), ladderFlash, ringFlash,
//   banner ({ text, until }), dice ({ squares, pos, prize, feature, face, rolling } or null),
//   loop (looping board: { feature, squares, cols, rows, levels, pos, shots, level, bank, nudges, awards, face }),
//   hilo ({ feature, number, steps, step, last }), pick ({ feature, count, boxes, at })
// A looping board takes over the top glass and paytable with the shared board screen (ui/loop-board.js),
// restyled by skin.loopTheme or replaced by skin.drawLoop(g). Hi-Lo and Pick show as panels over the top glass.

import { Machine } from '../engine/machine.js';
import { createRng } from '../engine/rng.js';
import { prepareReels } from '../engine/reels.js';
import { drawText, money } from './font.js';
import { placeholderSymbols } from './placeholder-art.js';
import { sound } from './sound.js';
import { drawLoopBoard } from './loop-board.js';
import { drawDiceBoard } from './dice-board.js';
import { drawSegments, scrollWindow } from './segments.js';

export const W = 270, H = 480, SYM = 32;
export const C = {
  cabinet: '#1a1020', cabinetEdge: '#3a2840', glass: '#0c0814', ink: '#f4ead8', dim: '#6a5a70',
  gold: '#f0c040', red: '#e02838', ledBg: '#200608', led: '#ff3a2a', lampOff: '#3a2a30', lampOn: '#ffd040',
  ladderOff: '#2a1830', ladderOn: '#ff4060', green: '#30d060', blue: '#30a0f0', badge: '#f0c040', badgeInk: '#201000',
};
const SYMBOL_NAMES = { SE: '777', BA: 'BAR', BE: 'BELL', ME: 'MELON', PL: 'PLUM', OR: 'ORANGE', LE: 'LEMON', CH: 'CHERRY' };
const QM_TEXT = { held: 'FEATURE HELD', numbersInView: 'NUMBERS IN VIEW', boost: 'TRAIL BOOST', skillStop: 'SKILL STOP', addAgain: 'ADD AGAIN', nudges: 'NUDGES' };

const wait = ms => new Promise(r => setTimeout(r, ms));
const easeOut = t => 1 - (1 - t) ** 3;

// Start a machine on a canvas. Returns { machine, stop() }.
export function startMachine(config, skin, { canvas = document.getElementById('screen'), art = window.MACHINE_ART || {}, seed } = {}) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const strips = prepareReels(config);
  const nReels = config.reels.length;
  const reelLen = config.reels.map(r => r.length);
  const params = new URLSearchParams(location.search);
  const machine = new Machine(config, createRng(seed ?? (Number(params.get('seed')) || Date.now())));
  const FEATURE_NAMES = Object.fromEntries(Object.entries(config.features || {}).map(([k, f]) => [k, f.name.toUpperCase()]));

  // ---------- art ----------
  const placeholders = placeholderSymbols();
  const images = {};
  const loadImage = (key, src) => new Promise(res => { const im = new Image(); im.onload = () => { images[key] = im; res(); }; im.onerror = res; im.src = src; });
  const artReady = Promise.all(Object.entries(art).map(([k, src]) => loadImage(k, src)));
  const sym = k => images['sym_' + k] || placeholders[k];

  // ---------- layout ----------
  const reelX = Array.from({ length: nReels }, (_, i) => Math.round((W - (nReels * 46 - 6)) / 2) + i * 46);
  const REELS = { x: reelX, y: 296, w: 40 };
  const MID_Y = REELS.y + SYM;
  const BTN = {
    hold: reelX.map(x => ({ x, y: 420, w: 40, h: 18 })),
    collect: { x: 8, y: 446, w: 80, h: 22 },
    gamble: { x: 95, y: 446, w: 80, h: 22 },
    start: { x: 182, y: 446, w: 80, h: 22 },
  };

  // ---------- state ----------
  const shown = machine.positions.map(p => p);
  const disp = { credit: machine.credit, trail: 0, held: false, lamp: null, ladderFlash: null, ringFlash: null, banner: null, dice: null, loop: null, hilo: null, pick: null, penalty: null, cashPot: machine.cashPot, potFlash: false, repeat: null };
  let held = config.reels.map(() => false);
  let busy = false, message = 'PRESS START', winFlash = 0, frame = 0, lastInput = performance.now();
  let pendingRandomStop = false, running = true, shownMessage = '', messageSince = 0;
  const SEG = { on: '#ff4030', off: '#240808', bg: '#100303', ...(skin.display || {}) };

  // ---------- drawing helpers (also handed to the skin) ----------
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const frameBox = (x, y, w, h, fill, edge) => { rect(x, y, w, h, edge); rect(x + 1, y + 1, w - 2, h - 2, fill); };
  const disc = (cx, cy, r, c) => {
    ctx.fillStyle = c;
    for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
  };
  const blink = (rate = 16) => Math.floor(frame / rate) % 2 === 0;
  const text = (s, x, y, c, o) => drawText(ctx, s, x, y, c, o);
  const say = (t, ms = 1500) => { disp.banner = { text: t, until: performance.now() + ms }; };
  // A big message box; it shrinks to small text if it would not fit, and never leaves the glass.
  const bannerBox = (cx, cy, t, colour = C.gold) => {
    const scale = t.length * 12 + 16 <= W - 12 ? 2 : 1;
    const w = t.length * 6 * scale + 16, h = 10 + 7 * scale;
    cx = Math.max(6 + w / 2, Math.min(W - 6 - w / 2, cx));
    frameBox(Math.round(cx - w / 2), cy - Math.round(h / 2), w, h, '#000c', colour);
    text(t, Math.round(cx) + 1, cy - Math.round(h / 2) + 5, colour, { scale, align: 'center' });
  };
  // Draw the current banner (if any) centred at cx, cy. Returns true if one was drawn.
  const drawBanner = (cx, cy) => {
    if (!disp.banner || performance.now() >= disp.banner.until) return false;
    bannerBox(cx, cy, disp.banner.text); return true;
  };
  const lampsLadder = (x, y, w, h) => {                        // the shared cash ladder strip
    const steps = machine.ladderSteps?.length ? machine.ladderSteps : config.ladder?.steps || [];
    steps.forEach((v, i) => {
      const bx = x + i * (w + 1);
      let on = machine.phase === 'ladder' && i <= machine.ladderStep;
      if (machine.phase === 'ladder' && i === machine.ladderStep) on = blink(8);
      if (disp.ladderFlash !== null && (i === disp.ladderFlash || i === disp.ladderFlash + 1)) on = Math.floor(frame / 4) % 2 === (i - disp.ladderFlash);
      const top = i === steps.length - 1;
      frameBox(bx, y, w, h, on ? (top ? C.gold : C.ladderOn) : C.ladderOff, '#000');
      text(money(v), bx + w / 2 + 1, y + Math.floor(h / 2) - 3, on ? '#200808' : top ? C.gold : C.ink, { align: 'center' });
    });
  };
  const heldLamp = (x, y, w = 70, h = 18) => {
    frameBox(x, y, w, h, disp.held ? C.green : '#1a2a1a', '#000');
    const ty = y + Math.round((h - 18) / 2);
    text('FEATURE', x + w / 2 + 1, ty + 2, disp.held ? '#042' : C.dim, { align: 'center' });
    text('HELD', x + w / 2 + 1, ty + 10, disp.held ? '#042' : C.dim, { align: 'center' });
  };

  const g = {
    ctx, W, H, C, config, machine, images, sym, disp, FEATURE_NAMES, money,
    rect, frameBox, disc, blink, text, say, bannerBox, drawBanner, lampsLadder, heldLamp, wait, sound,
    get frame() { return frame; }, get busy() { return busy; },
    get idle() { return machine.phase === 'idle' && !busy && performance.now() - lastInput > 8000; },
  };

  // ---------- bottom glass ----------
  function payLabel(e) {
    const p = e.pattern, k = p.filter(s => s !== '*').length;
    if (p[0] === 'SE' && k === p.length && !config.symbolNames?.SE) return p.map(() => '7').join(' ');
    return `${(config.symbolNames || SYMBOL_NAMES)[p[0]] || p[0]} x${k}`;
  }

  function drawSymbol(stop, x, y) {
    const im = sym(stop.sym);
    if (im) ctx.drawImage(im, x, y);
    if (stop.num) {
      disc(x + 26, y + 26, 5, '#000');
      disc(x + 26, y + 26, 4, C.badge);
      text(String(stop.num), x + 24, y + 23, C.badgeInk);
    }
  }

  function led(x, y, w, label, value) {
    text(label, x + w / 2, y, C.dim, { align: 'center' });
    frameBox(x, y + 9, w, 15, SEG.bg, '#000');
    drawSegments(ctx, value, x + 4, y + 12, 6, { w: 6, h: 9, gap: 2, on: SEG.on, off: SEG.off, align: 'right' });
  }

  // The 16-character message display. When the machine is idle it cycles house information.
  function drawDisplay() {
    const now = performance.now();
    let msg = message;
    if (g.idle && message === 'PRESS START') {
      const info = [config.name, `${money(config.stake)} PER PLAY`, `CREDIT ${money(disp.credit)}`, `JACKPOT ${money(config.jackpot)}`];
      if (machine.nudgeBank) info.push(`${machine.nudgeBank} NUDGES BANKED`);
      if (config.cashPot) info.push(`CASH POT ${money(disp.cashPot)}`);
      msg = info[Math.floor(now / 2200) % info.length];
    }
    if (msg !== shownMessage) { shownMessage = msg; messageSince = now; }
    const count = 16, cw = 11, gap = 2, width = count * (cw + gap) - gap, x = Math.round((W - width) / 2);
    frameBox(x - 5, 395, width + 10, 21, SEG.bg, '#000');
    drawSegments(ctx, scrollWindow(msg, count, now - messageSince), x, 398, count, { w: cw, h: 15, gap, on: SEG.on, off: SEG.off, align: 'center' });
  }

  function button(b, label, lit, colour) {
    frameBox(b.x, b.y, b.w, b.h, lit ? colour : '#2a2230', '#000');
    rect(b.x + 1, b.y + 1, b.w - 2, 1, lit ? '#ffffff80' : '#ffffff20');
    text(label, b.x + b.w / 2, b.y + Math.floor(b.h / 2) - 3, lit ? '#101010' : '#a090a8', { align: 'center' });
  }

  function drawBottomGlass() {
    frameBox(3, 236, W - 6, 241, '#140c18', C.cabinetEdge);
    const rows = Math.ceil(config.paytable.length / 2);
    config.paytable.forEach((e, i) => {
      const col = Math.floor(i / rows), row = i % rows;
      const x = 10 + col * 130, y = 242 + row * 9;
      text(payLabel(e), x, y, e.pays === config.jackpot ? C.gold : C.ink);
      text(money(e.pays), x + 120, y, C.gold, { align: 'right' });
    });

    for (let i = 0; i < nReels; i++) {
      const x = REELS.x[i];
      frameBox(x - 2, REELS.y - 2, REELS.w + 4, SYM * 3 + 4, '#f8f0e0', '#000');
      ctx.save();
      ctx.beginPath(); ctx.rect(x, REELS.y, REELS.w, SYM * 3); ctx.clip();
      const p = shown[i], base = Math.floor(p), f = p - base;
      for (let k = -2; k <= 2; k++) {
        const idx = ((base - k) % reelLen[i] + reelLen[i]) % reelLen[i];
        drawSymbol(strips[i][idx], x + 4, Math.round(MID_Y + k * SYM + f * SYM));
      }
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x, REELS.y, REELS.w, SYM); ctx.fillRect(x, REELS.y + 2 * SYM, REELS.w, SYM);
      ctx.restore();
    }
    const lineCol = winFlash > 0 && blink(4) ? C.gold : C.red;
    const right = REELS.x[nReels - 1] + REELS.w;
    rect(REELS.x[0] - 8, MID_Y + 15, 6, 2, lineCol);
    rect(right + 2, MID_Y + 15, 6, 2, lineCol);
    if (winFlash > 0) { ctx.strokeStyle = lineCol; ctx.lineWidth = 1; ctx.strokeRect(REELS.x[0] - 2.5, MID_Y - 0.5, right - REELS.x[0] + 5, SYM + 1); }

    const m = machine;
    const leds = skin.leds?.(g) || [
      ['CREDIT', money(disp.credit)],
      m.phase !== 'nudge' && m.nudgeBank > 0 ? ['BANKED', String(m.nudgeBank)] : ['NUDGES', String(m.nudges)],
      config.scatter ? ['BONUS', `${disp.trail}/${config.scatter.min}`] : m.trail !== undefined ? ['TRAIL', `${disp.trail}/${config.trail.length}`] : ['WON', money(m.meters.out)],
      m.phase === 'free' ? ['FREE', String(m.freeSpins)] : ['PLAYS', String(m.meters.plays)],
    ];
    led(8, 300, 54, ...leds[0]); led(208, 300, 54, ...leds[1]);
    led(8, 344, 54, ...leds[2]); led(208, 344, 54, ...leds[3]);

    drawDisplay();

    const ctl = busy ? {} : controlsFor(m);
    BTN.hold.forEach((b, i) => {
      if (ctl.reel === 'nudge') button(b, 'NUDGE', blink(10), C.green);
      else if (ctl.reel === 'pick') button(b, 'PICK', blink(8), C.gold);
      else button(b, held[i] ? 'HELD' : 'HOLD', ctl.reel === 'hold' ? held[i] || blink(16) : false, '#f0a020');
    });
    const fast = ['stop', 'dice', 'loop', 'hilo'].includes(m.phase) ? 4 : 12;
    const lbl = (k, dflt) => ctl[k]?.[0] || dflt;
    button(BTN.collect, lbl('collect', 'COLLECT'), !!ctl.collect && blink(12), C.blue);
    button(BTN.gamble, lbl('gamble', 'GAMBLE'), !!ctl.gamble && !blink(fast), C.red);
    button(BTN.start, lbl('start', 'START'), !!ctl.start && blink(m.phase === 'stop' ? 4 : 20), C.green);
  }

  // ---------- what the buttons do in each phase ----------
  // { reel: 'hold'|'nudge'|undefined, collect|gamble|start: [label, action, arg?] }
  function controlsFor(m) {
    const fromSkin = skin.controls?.(m, g);
    if (fromSkin) return fromSkin;
    const holds = m.holdsOffered ? 'hold' : undefined;
    switch (m.phase) {
      case 'nudge': return { reel: 'nudge', start: ['START', 'skip'] };
      case 'offer':
        return config.trail?.offer === 'gamble'
          ? { collect: ['TAKE', 'take'], gamble: ['GAMBLE', 'gamble'] }
          : { reel: holds, collect: ['TAKE', 'take'], start: ['SPIN ON', 'play'] };
      case 'ladder': return { collect: ['COLLECT', 'collect'], gamble: ['GAMBLE', 'gamble'] };
      case 'stop': { const b = disp.lamp?.button || 'STOP'; return disp.lamp?.skill ? { gamble: [b, 'stop'], start: [b, 'stop'] } : {}; }
      case 'penalty': return { collect: ['LEFT', 'shoot', 0], gamble: ['MIDDLE', 'shoot', 1], start: ['RIGHT', 'shoot', 2] };
      case 'free': return { reel: m.holdsOffered ? 'hold' : undefined, start: ['START', 'play'] };
      case 'loop': return { collect: ['COLLECT', 'collect'], gamble: ['ROLL', 'roll'], start: ['ROLL', 'roll'] };
      case 'hilo': return { collect: ['COLLECT', 'collect'], gamble: ['LO', 'lo'], start: ['HI', 'hi'] };
      case 'pick': return { reel: 'pick', start: ['PICK', 'pick'] };
      case 'streak': return { start: ['START', 'play'] };
      case 'dice': return { collect: ['COLLECT', 'collect'], gamble: ['ROLL', 'roll'], start: ['ROLL', 'roll'] };
      case 'idle': return { reel: holds, start: ['START', 'play'] };
      default: return {};
    }
  }

  function phaseMessage(m) {
    const own = skin.message?.(m, g);
    if (own !== undefined) return own;
    switch (m.phase) {
      case 'nudge': return `NUDGE: ${m.nudges} LEFT`;
      case 'ladder': return 'COLLECT OR GAMBLE';
      case 'offer': return `${FEATURE_NAMES[config.trail.rungs[m.trail]]}: ${config.trail.offer === 'gamble' ? 'TAKE OR GAMBLE' : 'TAKE OR SPIN ON'}`;
      case 'penalty': return 'PICK YOUR CORNER';
      case 'stop': return disp.lamp?.kind === 'stepper' ? `${(disp.lamp.button || 'STOP')} ON A WIN` : disp.lamp?.kind === 'loop' ? 'TAXI: PRESS STOP' : disp.lamp?.skill ? 'PRESS STOP!' : FEATURE_NAMES[disp.lamp?.feature] || 'GOOD LUCK';
      case 'free': return `FREE SPIN: ${m.freeSpins} LEFT`;
      case 'streak': return `${FEATURE_NAMES[m.streakFeature]}: PRESS START`;
      case 'loop': { const w = disp.loop?.shotName || 'SHOT'; return `${m.loop.shots} ${m.loop.shots === 1 ? w : w + 'S'} LEFT: ROLL`; }
      case 'hilo': return m.hilo.step ? `${money(config.features[m.hilo.feature].steps[m.hilo.step - 1])}: HI LO OR COLLECT` : 'HI OR LO?';
      case 'pick': return 'PICK A PRIZE: 1 2 OR 3';
      case 'dice': return m.dice?.prizeFeature ? `${FEATURE_NAMES[m.dice.prizeFeature]}: COLLECT OR ROLL` : `${money(m.dice.prize)}: COLLECT OR ROLL`;
    }
    return undefined;
  }

  // ---------- feature panels over the top glass ----------
  function panel(title) {
    const x = 24, y = 36, w = W - 48, h = 160;
    frameBox(x, y, w, h, '#100a18', C.gold);
    text(title, W / 2 + 1, y + 6, C.gold, { align: 'center' });
    return { x, y, w, h };
  }

  function drawHiLo() {
    const H = disp.hilo, P = panel(FEATURE_NAMES[H.feature] || 'HI LO');
    frameBox(W / 2 - 26, P.y + 20, 52, 44, SEG.bg, '#000');
    drawSegments(ctx, String(H.number), W / 2 - 18, P.y + 28, 2, { w: 16, h: 28, gap: 4, on: SEG.on, off: SEG.off, align: 'right' });
    text('1 TO 12', W / 2 + 1, P.y + 68, C.dim, { align: 'center' });
    if (H.last) text(H.last, W / 2 + 1, P.y + 80, H.lastOk ? C.green : C.red, { align: 'center' });
    const n = H.steps.length, bw = Math.floor((P.w - 16) / n);
    H.steps.forEach((v, i) => {
      const on = i < H.step, cur = i === H.step - 1;
      frameBox(P.x + 8 + i * bw, P.y + 100, bw - 2, 20, on ? (cur && blink(8) ? '#fff' : C.ladderOn) : C.ladderOff, '#000');
      text(money(v), P.x + 8 + i * bw + (bw - 2) / 2 + 1, P.y + 107, on ? '#200808' : C.ink, { align: 'center' });
    });
    text('START: HI   GAMBLE: LO', W / 2 + 1, P.y + 132, C.dim, { align: 'center' });
  }

  // Penalty: a goal with a keeper; the ball flies to the chosen side and the keeper dives.
  function drawPenalty() {
    const P = disp.penalty, x = 12, y = 30, w = W - 24, h = 196;
    for (let k = 0; k < 7; k++) rect(x, y + k * 28, w, 28, k % 2 ? '#2a7a32' : '#33883a');
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    text(`SCORE TO WIN ${money(P.amount)} AGAIN`, W / 2 + 1, y + 6, '#fff', { align: 'center' });
    // the goal and net
    const gx = x + 25, gy = y + 26, gw = w - 50, gh = 80;
    rect(gx, gy, gw, gh, '#1a4a22');
    ctx.strokeStyle = '#ffffff40';
    for (let k = 6; k < gw; k += 8) { ctx.beginPath(); ctx.moveTo(gx + k + 0.5, gy); ctx.lineTo(gx + k + 0.5, gy + gh); ctx.stroke(); }
    for (let k = 6; k < gh; k += 8) { ctx.beginPath(); ctx.moveTo(gx, gy + k + 0.5); ctx.lineTo(gx + gw, gy + k + 0.5); ctx.stroke(); }
    rect(gx - 4, gy - 4, gw + 8, 4, '#f4f4f4'); rect(gx - 4, gy, 4, gh, '#f4f4f4'); rect(gx + gw, gy, 4, gh, '#f4f4f4');
    rect(x + 4, gy + gh, w - 8, 2, '#e8f0e8');
    const side = d => gx + gw * [0.18, 0.5, 0.82][d];
    // keeper: dives towards his side as the ball flies
    const kp = images.keeper, t = P.dir === null ? 0 : P.t;
    const kx = P.dive === null ? W / 2 : W / 2 + (side(P.dive) - W / 2) * t;
    const sway = P.dir === null ? Math.sin(frame / 10) * 6 : 0;
    if (kp) ctx.drawImage(kp, Math.round(kx + sway - 24), gy + gh - 52, 48, 48);
    else rect(Math.round(kx + sway - 8), gy + gh - 40, 16, 40, '#e0c020');
    // the ball from the spot
    const bx0 = W / 2, by0 = y + h - 34, tx = P.dir === null ? bx0 : side(P.dir), ty = gy + 30;
    const bx = bx0 + (tx - bx0) * t, by = by0 + (ty - by0) * t - Math.sin(t * Math.PI) * 20, br = Math.round(7 - 3 * t);
    const ball = images.ball;
    if (ball) ctx.drawImage(ball, Math.round(bx - br * 1.4), Math.round(by - br * 1.4), Math.round(br * 2.8), Math.round(br * 2.8));
    else { disc(Math.round(bx), Math.round(by), br + 1, '#000'); disc(Math.round(bx), Math.round(by), br, '#fff'); }
    if (P.dir === null) {
      ['LEFT', 'MIDDLE', 'RIGHT'].forEach((l, d) => text(l, side(d) + 1, gy + gh + 8, blink(12) ? '#fff' : '#cfe8cf', { align: 'center' }));
    }
    if (P.goal !== null) bannerBox(W / 2, gy + gh / 2, P.goal ? 'GOAL!' : 'SAVED!', P.goal ? C.gold : C.red);
  }

  function drawPick() {
    const K = disp.pick, P = panel(FEATURE_NAMES[K.feature] || 'PICK A PRIZE');
    const n = K.count, bw = 56, gap = 10, x0 = W / 2 - (n * bw + (n - 1) * gap) / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (bw + gap), y = P.y + 30, chosen = K.at === i;
      const shown = K.boxes ? K.boxes[i] : null;
      frameBox(x, y, bw, 64, shown ? (chosen ? C.gold : '#3a2a40') : (blink(12 + i * 3) ? '#5a2a7a' : '#4a2068'), '#000');
      if (shown) {
        const words = shown.label.split(' ');
        words.forEach((w, k) => text(w, x + bw / 2 + 1, y + 26 + (k - (words.length - 1) / 2) * 10, chosen ? '#201008' : C.dim, { align: 'center' }));
      } else if (images[skin.featureIcons?.[K.feature]]) ctx.drawImage(images[skin.featureIcons[K.feature]], x + bw / 2 - 16, y + 16);
      else text('?', x + bw / 2 + 1, y + 22, C.gold, { scale: 3, align: 'center' });
      text(String(i + 1), x + bw / 2 + 1, y + 70, C.dim, { align: 'center' });
    }
  }

  // ---------- jackpot / big win celebration ----------
  function startParty(kind, amount, ms) {
    const now = performance.now(), n = kind === 'jackpot' ? 70 : 25;
    const coins = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: -10 - Math.random() * H * (kind === 'jackpot' ? 1.2 : 0.5),
      vy: 1.2 + Math.random() * 2.2, vx: (Math.random() - 0.5) * 0.6, spin: Math.random() * 6,
    }));
    disp.party = { kind, amount, t0: now, until: now + ms, coins };
  }

  const PARTY_COLOURS = ['#ff3050', '#ffd040', '#40e0ff', '#60ff80', '#ff60e0'];
  function drawParty() {
    const P = disp.party;
    if (!P) return;
    const t = performance.now() - P.t0, jp = P.kind === 'jackpot';
    // Early full-screen flashes.
    if (jp && t < 900 && Math.floor(t / 110) % 2 === 0) rect(0, 0, W, H, '#ffffff30');
    // Chasing bulbs round the whole cabinet edge.
    const step = 10, per = 2 * (W + H), count = Math.floor(per / step), shift = Math.floor(t / (jp ? 60 : 90));
    for (let i = 0; i < count; i++) {
      let d = i * step, x, y;
      if (d < W) { x = d; y = 1; } else if ((d -= W) < H) { x = W - 3; y = d; } else if ((d -= H) < W) { x = W - d; y = H - 3; } else { d -= W; x = 1; y = H - d; }
      const lit = (i + shift) % 3 === 0;
      const c = lit ? PARTY_COLOURS[Math.floor((i + shift) / 3) % PARTY_COLOURS.length] : '#3a2a20';
      rect(Math.round(x), Math.round(y), 3, 3, c);
    }
    // Falling coins.
    for (const c of P.coins) {
      c.y += c.vy; c.x += c.vx; c.spin += 0.2;
      if (c.y > H + 8) { c.y = -8; c.x = Math.random() * W; }
      const w = Math.max(1, Math.round(Math.abs(Math.cos(c.spin)) * 4));
      rect(Math.round(c.x - w), Math.round(c.y - 4), w * 2 + 1, 9, '#7a4a00');
      rect(Math.round(c.x - w + 1), Math.round(c.y - 3), Math.max(1, w * 2 - 1), 7, Math.cos(c.spin) > 0 ? '#ffd040' : '#e0a020');
    }
    // Big flashing title over the top glass.
    const word = jp ? 'JACKPOT' : 'BIG WIN';
    const scale = jp ? 5 : 4, bw = word.length * 6 * scale + 20, bh = 7 * scale + 34;
    const bx = Math.round((W - bw) / 2), by = jp ? 70 : 90;
    const col = PARTY_COLOURS[Math.floor(t / 120) % PARTY_COLOURS.length];
    const pop = Math.min(1, t / 250);
    if (pop >= 1) {
      frameBox(bx, by, bw, bh, '#000000d0', col);
      rect(bx + 2, by + 2, bw - 4, 1, col); rect(bx + 2, by + bh - 3, bw - 4, 1, col);
      text(word, W / 2 + 2, by + 8 + 2, '#000', { scale, align: 'center' });
      text(word, W / 2, by + 8, col, { scale, align: 'center' });
      text(money(P.amount), W / 2 + 1, by + 12 + 7 * scale, C.gold, { scale: 2, align: 'center' });
    } else {
      const s = Math.max(1, Math.round(scale * pop));
      text(word, W / 2, by + 8, col, { scale: s, align: 'center' });
    }
  }

  // ---------- render loop ----------
  function render() {
    if (!running) return;
    frame++;
    if (winFlash > 0) winFlash--;
    const lamp = disp.lamp;
    if (lamp) {
      lamp.pos += lamp.speed;
      if (lamp.stopping) {
        lamp.speed = Math.max(0.04, lamp.speed * 0.955);
        if (lamp.speed <= 0.05 && Math.round(lamp.pos) % lamp.n === lamp.target) lamp.done = true;
      }
      if (lamp.kind === 'stepper') {                                  // steppers: the reels follow the lamp
        const k = Math.round(lamp.pos) % lamp.n;
        lamp.seq[k].forEach((p, i) => (shown[i] = p));
        if (lamp.wins[k] > 0) winFlash = Math.max(winFlash, 2);
        if (k !== lamp.lastStep) { lamp.lastStep = k; sound.nudge(); }
      }
    }
    rect(0, 0, W, H, C.cabinet);
    frameBox(3, 3, W - 6, 229, C.glass, C.cabinetEdge);
    skin.drawTop(g);
    if (disp.hilo) drawHiLo();
    if (disp.pick) drawPick();
    if (disp.penalty) drawPenalty();
    drawBottomGlass();
    if (disp.loop) (skin.drawLoop || drawLoopBoard)(g, skin.loopTheme, skin.loopIcons);
    if (disp.dice) (skin.drawDice || drawDiceBoard)(g, skin.diceTheme, skin.diceIcons);
    drawParty();
    requestAnimationFrame(render);
  }

  // ---------- playback ----------
  const anim = (ms, step) => new Promise(res => {
    const t0 = performance.now();
    const tick = now => { const t = Math.min(1, (now - t0) / ms); step(t); t < 1 ? requestAnimationFrame(tick) : res(); };
    requestAnimationFrame(tick);
  });

  async function spinTo(positions, heldMask, forced) {
    const starts = shown.map(p => Math.round(p));
    const dist = positions.map((t, i) => heldMask[i] ? 0 : ((t - starts[i]) % reelLen[i] + reelLen[i]) % reelLen[i] + reelLen[i] * (2 + i));
    const durs = positions.map((_, i) => (forced ? 500 : 700) + 350 * i);
    const last = durs[durs.length - 1];
    const stopped = positions.map(() => false);
    sound.spin(last);
    await anim(last, t => {
      for (let i = 0; i < positions.length; i++) {
        const ti = Math.min(1, (t * last) / durs[i]);
        shown[i] = starts[i] + dist[i] * easeOut(ti);
        if (ti >= 1 && !stopped[i]) { stopped[i] = true; if (!heldMask[i]) sound.stop(); }
      }
    });
    positions.forEach((p, i) => (shown[i] = p));
  }

  async function countUp(amount) {
    const target = disp.credit + amount;
    const step = Math.max(1, Math.round(amount / 20));
    while (disp.credit < target) { disp.credit = Math.min(target, disp.credit + step); sound.tick(); await wait(30); }
  }

  async function runTrailTo(value) {
    if (value < disp.trail) { disp.trail = value; return; }
    while (disp.trail < value) { disp.trail++; sound.lamp(); await wait(130); }
  }

  async function playEvent(e) {
    if (skin.onEvent && (await skin.onEvent(e, g))) return;
    switch (e.type) {
      case 'spin': await spinTo(e.positions, e.held, e.forced); break;
      case 'nudged': {
        const from = shown[e.reel];
        sound.nudge();
        await anim(160, t => (shown[e.reel] = from + easeOut(t)));
        shown[e.reel] = e.positions[e.reel];
        break;
      }
      case 'win': {
        message = `WIN ${money(e.amount)}`;
        if (['line', 'held', 'nudge'].includes(e.source) || config.features?.[e.source]?.kind === 'winSpin' || config.features?.[e.source]?.kind === 'streak') winFlash = 60;
        const jackpot = e.amount >= config.jackpot, big = !jackpot && e.amount >= config.jackpot / 4;
        if (jackpot || big) {
          // Celebration: chasing cabinet lights, falling coins, flashing banner and a tune.
          const ms = jackpot ? 5200 : 2200;
          if (jackpot) { message = `JACKPOT ${money(e.amount)}   JACKPOT ${money(e.amount)}`; sound.jackpot(); } else { message = `BIG WIN ${money(e.amount)}`; sound.fanfare(); }
          winFlash = Math.round(ms / 16);
          startParty(jackpot ? 'jackpot' : 'big', e.amount, ms);
          await Promise.all([countUp(e.amount), wait(ms)]);
          disp.party = null;
          message = `WIN ${money(e.amount)}`;
        } else {
          sound.win(e.amount);
          await countUp(e.amount);
        }
        await wait(250);
        break;
      }
      case 'trail':
        if (e.why === 'boost') say('TRAIL BOOST');
        if (e.why === 'threeNumbers') { say('THREE NUMBERS!'); sound.fanfare(); }
        if (e.why === 'threeQ') { say('TOP OF THE TRAIL!'); sound.fanfare(); }
        await runTrailTo(e.value);
        break;
      case 'series': say(`${e.times} RIDE${e.times === 1 ? '' : 'S'}`, 1200); sound.fanfare(); await wait(800); break;
      case 'trailLost':
        if (disp.trail > 0) { message = 'TRAIL LOST'; sound.lose(); disp.ringFlash = disp.trail; await wait(500); disp.ringFlash = null; disp.trail = 0; disp.held = false; await wait(200); }
        break;
      case 'trailGamble':
        if (e.won) { sound.fanfare(); say('UP A STEP!', 900); await runTrailTo(e.value); }
        else { say('GAMBLE LOST', 900); }
        await wait(400);
        break;
      case 'featureHeld':
        disp.held = e.lit;
        if (e.lit) { sound.award(); await wait(300); }
        break;
      case 'question': say('? ' + (QM_TEXT[e.option] || FEATURE_NAMES[e.option] || e.option.toUpperCase()), 1400); sound.award(); await wait(900); break;
      case 'offer':
        message = `${e.rung}: ${FEATURE_NAMES[e.feature]}`;
        say(FEATURE_NAMES[e.feature], 1200); sound.fanfare(); await wait(600);
        break;
      case 'featureStart':
        say(FEATURE_NAMES[e.feature], 1500); sound.fanfare(); disp.trail = 0; disp.held = false; await wait(900);
        break;
      case 'ladder': message = 'COLLECT OR GAMBLE'; await wait(300); break;
      case 'nudges': message = `${e.count} NUDGES`; sound.award(); await wait(400); break;
      case 'holdsOffered': sound.award(); await wait(200); break;
      case 'gambleWon': sound.fanfare(); break;
      case 'gambleLost': message = 'BUST'; sound.lose(); await wait(600); break;
      case 'stopStart': {
        const taxi = e.kind === 'loop', step = e.kind === 'stepper';   // a taxi ride round the loop board, or steppers
        disp.lamp = { kind: e.kind, n: e.segments, pos: taxi ? disp.loop.pos : 0, board: e.board, skill: e.skill, feature: e.feature,
          speed: step ? 0.03 : taxi ? 0.1 : e.skill ? 0.22 : 0.3, stopping: false, seq: e.seq, wins: e.wins, button: e.button };
        if (step) { say(FEATURE_NAMES[e.feature], 1200); sound.fanfare(); }
        message = phaseMessage(machine) ?? 'PRESS STOP!';
        if (!e.skill) pendingRandomStop = true;
        break;
      }
      case 'stopped': {
        const lamp = disp.lamp;
        if (lamp) {
          if (lamp.skill) { lamp.speed = 0; lamp.pos = e.at; sound.stop(); await wait(700); }   // a skill stop stops dead where you pressed
          else {
            lamp.stopping = true; lamp.target = e.at; sound.gamble();
            const t0 = performance.now();
            while (!lamp.done && performance.now() - t0 < 4000) await wait(30);
            lamp.pos = e.at; await wait(500);
          }
          if (lamp.kind === 'loop' && disp.loop) disp.loop.pos = e.at;
          disp.lamp = null;
        }
        if (e.kind === 'trail') say('STOPPED ON ' + (e.at + 1));
        break;
      }
      case 'board':
        message = e.segment.pays ? `HIT ${e.segment.label}` : `${e.segment.label}!`;
        if (e.segment.feature) sound.fanfare(); else if (!e.segment.pays) sound.lose();
        await wait(500);
        break;
      case 'freeSpins': message = e.multiplier > 1 ? `${e.spins} SPINS AT X${e.multiplier}` : `${e.spins} FREE SPINS${e.holds ? ' WITH HOLDS' : ''}`; await wait(400); break;
      case 'freeSpin': if (e.left > 0) message = `FREE SPIN: ${e.left} LEFT`; break;
      case 'mystery': say(FEATURE_NAMES[e.pick], 1600); sound.fanfare(); await wait(1200); break;
      case 'repeat': say('REPEAT!', 1200); sound.fanfare(); await wait(800); break;
      case 'streakStart': say(FEATURE_NAMES[e.feature] || 'WIN STREAK', 1200); await wait(600); break;
      case 'streakEnd': message = `STREAK PAID ${money(e.total)}`; await wait(800); break;
      // nudge bank
      case 'nudgeBank':
        message = e.returned ? `${e.bank} NUDGES KEPT IN THE BANK` : `NUDGE BANK: ${e.bank}`;
        if (!e.returned) { say(`${e.bank} BANKED NUDGES`, 1200); sound.award(); await wait(700); }
        break;
      case 'nudgeBankUsed': message = `NUDGE: ${e.count} LEFT`; sound.award(); await wait(300); break;
      // looping board
      case 'loopStart':
        disp.loop = { feature: e.feature, title: e.title, shotName: e.shotName, squares: e.squares, cols: e.cols, rows: e.rows, levels: e.levels, pos: 0,
          shots: e.shots, level: e.level, bank: 0, nudges: 0, awards: [], face: null, flash: false };
        say(FEATURE_NAMES[e.feature] || 'BOARD', 1400); sound.fanfare(); await wait(1000);
        break;
      case 'loopRoll': {
        const L = disp.loop, n = L.squares.length;
        L.shots = e.shots; sound.gamble();
        for (let i = 0; i < 9; i++) { L.face = 1 + Math.floor(Math.random() * 6); await wait(60 + i * 12); }
        L.face = e.roll; sound.stop(); await wait(250);
        for (let k = 1; k <= e.steps; k++) { L.pos = (e.from + k) % n; sound.lamp(); await wait(150); }
        break;
      }
      case 'stepperStop':
        e.positions.forEach((p, i) => (shown[i] = p));
        if (!e.win) { message = 'MISSED'; sound.lose(); await wait(600); }
        break;
      case 'penaltyStart':
        disp.penalty = { feature: e.feature, amount: e.amount, dir: null, dive: null, goal: null, t: 0 };
        say(FEATURE_NAMES[e.feature] || 'PENALTY', 1200); sound.fanfare(); await wait(900);
        break;
      case 'penalty': {
        const P = disp.penalty;
        Object.assign(P, { dir: e.dir, dive: e.dive, goal: null }); sound.gamble();
        await anim(800, t => (P.t = t));
        P.goal = e.goal;
        if (e.goal) { say('GOAL!', 1200); sound.fanfare(); } else { say('SAVED!', 1200); sound.lose(); message = 'SAVED'; }
        await wait(1300);
        disp.penalty = null;
        break;
      }
      case 'loopTaxi': if (disp.loop) disp.loop.pos = e.to; break;
      case 'cashPot': disp.cashPot = e.pot; sound.tick(); break;
      case 'cashPotWon':
        disp.potFlash = true; say('CASH POT!', 1400); sound.fanfare(); await wait(1100);
        disp.potFlash = false; disp.cashPot = e.pot;
        break;
      case 'repeatTry':
        disp.repeat = 'try'; message = 'REPEAT?'; sound.gamble(); await wait(1300);
        if (e.won) { disp.repeat = 'won'; say('REPEAT!', 1000); sound.fanfare(); await wait(600); }
        else { message = 'NO REPEAT'; sound.lose(); await wait(500); }
        disp.repeat = null;
        break;
      case 'loopLand': {
        const L = disp.loop, sq = e.square, before = { bank: L.bank, level: L.level, shots: L.shots };
        Object.assign(L, { bank: e.bank, shots: e.shots, level: e.level, nudges: e.nudges, awards: e.awards, flash: true });
        const f = sq.feature && config.features[sq.feature];
        const words = {
          cash: `+${money(sq.cash)}`, feature: (f?.name || '').toUpperCase(), nudges: `+${sq.count} NUDGES`,
          shots: `+${sq.count} ${sq.count === 1 ? L.shotName : L.shotName + 'S'}`, level: e.level > before.level ? 'LEVEL UP!' : 'TOP LEVEL',
          half: 'BANK HALVED', miss: `LOSE A ${L.shotName}`, end: 'END!', bust: 'BUST!', go: 'GO', taxi: 'TAXI!', double: 'BANK DOUBLED!', pot: 'CASH POT!',
        }[sq.type];
        if (words) say(words, 900);
        if (['half', 'miss', 'end', 'bust'].includes(sq.type)) sound.lose(); else if (sq.type !== 'go') sound.award();
        await wait(800);
        L.flash = false;
        break;
      }
      case 'loopEnd':
        message = e.why === 'collect' ? 'COLLECTED' : e.why === 'shots' ? 'OUT OF SHOTS' : e.why === 'bust' ? 'BUST' : 'BOARD OVER';
        await wait(700);
        disp.loop = null;
        if (e.levelPrize) { say(`LEVEL ${e.level}: ${e.levelPrize.label}`, 1200); await wait(900); }
        break;
      // hi-lo
      case 'hiloStart':
        disp.hilo = { feature: e.feature, number: e.number, steps: e.steps, step: 0, last: '' };
        say(FEATURE_NAMES[e.feature], 1000); sound.fanfare(); await wait(700);
        break;
      case 'hiloCall': {
        const H = disp.hilo;
        sound.gamble();
        for (let i = 0; i < 8; i++) { H.number = 1 + Math.floor(Math.random() * 12); await wait(70); }
        H.number = e.number; H.last = `${e.call === 'hi' ? 'HI' : 'LO'}: ${e.from} TO ${e.number}`; H.lastOk = e.ok;
        e.ok ? sound.award() : sound.lose();
        await wait(500);
        break;
      }
      case 'hiloStep': disp.hilo.step = e.step; break;
      case 'hiloEnd': await wait(500); disp.hilo = null; if (!e.amount) message = 'BAD LUCK'; break;
      // pick a prize
      case 'pickStart': disp.pick = { feature: e.feature, count: e.count, boxes: null, at: null }; say(FEATURE_NAMES[e.feature], 1000); sound.fanfare(); await wait(600); break;
      case 'picked':
        disp.pick.at = e.at; sound.gamble(); await wait(400);
        disp.pick.boxes = e.boxes.map(b => b); sound.award(); await wait(1400);
        disp.pick = null;
        break;
      // dice board
      case 'diceStart':
        disp.dice = { title: e.title, words: e.words, squares: e.squares, pos: e.pos, prize: e.prize, feature: null, face: null, rolling: false, rolls: 0, maxRolls: e.maxRolls };
        say(FEATURE_NAMES[e.feature], 1500); sound.fanfare(); await wait(1000);
        break;
      case 'diceRoll': {
        const d = disp.dice;
        d.rolling = true; sound.gamble();
        for (let i = 0; i < 9; i++) { d.face = 1 + Math.floor(Math.random() * 6); await wait(70 + i * 12); }
        d.face = e.roll; d.rolling = false; sound.stop();
        await wait(300);
        d.rolls = e.rolls;
        for (let p = e.from + 1; p <= e.to; p++) { d.pos = p; sound.lamp(); await wait(170); }
        break;
      }
      case 'diceSlide': {
        const d = disp.dice;
        say(disp.dice.words?.[e.kind] || (e.kind === 'ladder' ? 'LADDER!' : 'SNAKE!'), 1000);
        e.kind === 'ladder' ? sound.fanfare() : sound.lose();
        await wait(500);
        const from = d.pos;
        await anim(500, t => (d.pos = from + (e.to - from) * easeOut(t)));
        d.pos = e.to;
        break;
      }
      case 'diceLand': disp.dice.prize = e.prize; disp.dice.feature = e.feature; await wait(200); break;
      case 'diceLose': say(disp.dice.words?.lose || 'LOSE!', 1200); sound.lose(); await wait(1200); disp.dice = null; message = 'BAD LUCK'; break;
      case 'diceCollect': await wait(300); disp.dice = null; break;
    }
  }

  async function playEvents(events) {
    for (const e of events) await playEvent(e);
    disp.credit = machine.credit;
    if (machine.trail !== undefined) { disp.trail = machine.trail; disp.held = machine.held; }
    const m = machine, pm = phaseMessage(m);
    if (pm !== undefined) message = pm;
    else if (m.holdsOffered) message = 'HOLDS AVAILABLE';
    else if (m.credit < config.stake) message = `START FOR ${money(config.startCredit)} CREDIT`;
    else if (!/^(WIN|TRAIL|HIT|STREAK PAID|BAD LUCK|BUST)/.test(message)) message = 'PRESS START';
  }

  async function act(fn) {
    if (busy) return;
    busy = true;
    try {
      await playEvents(fn());
      while (pendingRandomStop && machine.phase === 'stop') {      // a random stop runs on its own
        pendingRandomStop = false;
        await wait(900 + Math.random() * 800);
        await playEvents(machine.stop());
      }
    } finally { busy = false; }
  }

  // ---------- input ----------
  function press(name, i) {
    lastInput = performance.now();
    sound.unlock();
    if (busy) return;
    const m = machine, ctl = controlsFor(m);
    if (name === 'hold') {
      if (ctl.reel === 'nudge') return act(() => m.nudge(i));
      if (ctl.reel === 'pick') return act(() => m.act('pick', i));
      if (ctl.reel === 'hold') { held[i] = !held[i]; sound.tick(); }
      return;
    }
    const c = ctl[name];
    if (!c) return;
    const [, action, arg] = c;
    if (action === 'play') {
      if (!m.canPlay()) {
        if (m.credit < config.stake) { m.credit += config.startCredit; disp.credit = m.credit; message = 'PRESS START'; sound.award(); }
        return;
      }
      const h = held; held = config.reels.map(() => false);
      const free = m.playMode() === 'free';
      message = free ? 'FREE SPIN' : 'GOOD LUCK';
      if (!free) disp.credit -= config.stake;
      return act(() => m.play(h));
    }
    if (action === 'stop') return act(() => m.stop(Math.round(disp.lamp.pos) % disp.lamp.n));
    if (action === 'gamble' && m.phase === 'ladder') {
      busy = true; disp.ladderFlash = m.ladderStep; sound.gamble();
      return wait(1100).then(() => { disp.ladderFlash = null; busy = false; return act(() => m.act('gamble')); });
    }
    return act(() => m.act(action, arg));
  }

  const hit = (b, x, y) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
  const onPointer = ev => {
    const r = canvas.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W, y = ((ev.clientY - r.top) / r.height) * H;
    BTN.hold.forEach((b, i) => hit(b, x, y) && press('hold', i));
    for (const k of ['collect', 'gamble', 'start']) if (hit(BTN[k], x, y)) press(k);
  };
  const onKey = ev => {
    const k = ev.key.toLowerCase();
    if (/^[1-9]$/.test(k) && Number(k) <= nReels) press('hold', Number(k) - 1);
    else if (k === ' ' || k === 'enter') { ev.preventDefault(); press('start'); }
    else if (k === 'c' || k === 't') press('collect');
    else if (k === 'g' || k === 'r') press('gamble');
    else if (k === 'm') sound.toggle();
  };
  canvas.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);

  // ---------- scaling ----------
  function fit() {
    const box = canvas.parentElement;
    const s = Math.min(box.clientWidth / W, box.clientHeight / H);
    const scale = s >= 2 ? Math.floor(s) : s;
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
  }
  window.addEventListener('resize', fit);
  fit();

  artReady.then(() => running && requestAnimationFrame(render));
  const handle = {
    machine, g,
    act,                                   // play back whatever a function of the machine returns (testing)
    press,
    playEvents,                            // debugging: replay engine events, e.g. a jackpot win
    stop() {
      running = false;
      canvas.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', fit);
    },
  };
  window.fruitMachine = handle;            // handy for debugging in the console
  return handle;
}
