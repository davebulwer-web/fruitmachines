// The core game engine. It decides every outcome and returns a list of events;
// the screen only plays those events back, and the simulator ignores them.
// No drawing or sound code belongs in the engine.
//
// The core knows about reels, stakes, holds, nudges, pays, running lamps (stops) and
// a queue of features. Everything else is a plug-in:
//   - a progression (config.progression.type), e.g. the number trail that offers features
//   - feature kinds (config.features[id].kind), e.g. ladder, boardStop, diceBoard
// Plug-ins live in engine/progressions and engine/features and are listed in engine/registry.js.
//
// Core phases:  idle (waiting for a play), nudge (nudges in the bank), stop (a lamp is running).
// Plug-ins add their own phases (offer, ladder, free, streak, dice, ...). A phase definition says
// whether a paid or free play is allowed in it and which named actions it accepts:
//   { play: 'paid' | 'free' | false | (m => mode), holdsEveryPlay, blocking, actions: { name(m, arg, events) }, ... }
// Use m.actions() to list what is allowed now, and m.act(name, arg) to do it.

import { prepareReels, stopsAt, lineSymbols, lineWin, positionsFor } from './reels.js';
import { featureKinds, progressions } from './registry.js';

const CORE_PHASES = {
  idle: { play: 'paid' },
  nudge: { actions: { nudge: (m, reel) => m.nudge(reel), skip: m => m.skipNudges() } },
  stop: { blocking: true, actions: { stop: (m, at) => m.stop(at) } },
};

export class Machine {
  constructor(config, rng, { credit = config.startCredit } = {}) {
    this.config = config;
    this.rng = rng;
    prepareReels(config);
    this.credit = credit;            // pence
    this.positions = config.reels.map(() => 0);
    this.phase = 'idle';
    this.holdsOffered = false;
    this.nudges = 0;
    this.nudgeBank = 0;              // banked nudges: kept between spins until used (see awardNudgeBank)
    this.fromBank = 0;               // how many of the current nudges came from the bank
    this.stopCtx = null;             // what a running lamp is for: { kind, skill, segments, module, ... }
    this.cashPot = config.cashPot?.start ?? 0;   // grows on losing plays; won by a POT square or a cashPot feature
    this.queue = [];                 // features waiting to run (a mystery feature can queue several)
    this.meters = { in: 0, out: 0, plays: 0, features: {} };

    // Phase table: core phases plus those of the progression and every feature kind in use.
    this.phases = { ...CORE_PHASES };
    const type = config.progression?.type;
    this.progression = type ? progressions[type] : null;
    if (type && !this.progression) throw new Error(`unknown progression "${type}"`);
    if (this.progression) Object.assign(this.phases, this.progression.phases || {});
    for (const [id, f] of Object.entries(config.features || {})) {
      const kind = featureKinds[f.kind];
      if (!kind) throw new Error(`feature "${id}" has unknown kind "${f.kind}"`);
      Object.assign(this.phases, kind.phases || {});
    }
    this.progression?.init?.(this);
    for (const kind of new Set(Object.values(config.features || {}).map(f => featureKinds[f.kind]))) kind.init?.(this);
  }

  phaseDef(phase = this.phase) { return this.phases[phase] || {}; }

  // ---------- generic actions ----------
  // Names of what the player may do now ('play' plus the phase's own actions).
  actions() {
    const list = this.canPlay() ? ['play'] : [];
    return list.concat(Object.keys(this.phaseDef().actions || {}));
  }

  act(name, arg) {
    if (name === 'play') return this.play(arg);
    const fn = this.phaseDef().actions?.[name];
    if (!fn) throw new Error(`no action "${name}" in phase ${this.phase}`);
    const events = [];
    const out = fn(this, arg, events);
    return Array.isArray(out) ? out : events;
  }

  // ---------- money ----------
  // 'paid', 'free' or false; a phase may decide per machine with play: m => ...
  playMode() { const p = this.phaseDef().play; return typeof p === 'function' ? p(this) : p; }

  canPlay() {
    const mode = this.playMode();
    if (mode === 'free') return true;
    return mode === 'paid' && this.credit >= this.config.stake;
  }

  pay(amount, source, events) {
    amount = Math.min(amount, this.config.jackpot);     // no single pay above the jackpot
    if (amount <= 0) return;
    this.credit += amount;
    this.meters.out += amount;
    events.push({ type: 'win', amount, source });
    // Repeat chance: a big reel win may pay again (config.repeat = { from, chance, sources }, or { from, feature }).
    const rep = this.config.repeat;
    if (rep && amount >= rep.from && (rep.sources || ['line', 'held', 'nudge']).includes(source)) {
      if (rep.feature) { this.repeatAmount = amount; this.queue.push(rep.feature); }   // played as a feature (e.g. a penalty)
      else {
        const won = this.rng.chance(rep.chance);
        events.push({ type: 'repeatTry', won, amount });
        if (won) this.pay(amount, 'repeat', events);
      }
    }
  }

  // ---------- cash pot ----------
  // config.cashPot = { start, add, addChance, max }: after a losing play the pot may grow by 'add'.
  growCashPot(events) {
    const cp = this.config.cashPot;
    if (!cp || this.cashPot >= cp.max || !this.rng.chance(cp.addChance)) return;
    this.cashPot = Math.min(cp.max, this.cashPot + cp.add);
    events.push({ type: 'cashPot', pot: this.cashPot });
  }
  // Empty the pot (it restarts at its start value) and return what was in it.
  takeCashPot(events) {
    const won = this.cashPot;
    this.cashPot = this.config.cashPot?.start ?? 0;
    events.push({ type: 'cashPotWon', amount: won, pot: this.cashPot });
    return won;
  }

  // ---------- the spin ----------
  play(holds = []) {
    if (!this.canPlay()) throw new Error(`cannot play in phase ${this.phase}`);
    const cfg = this.config, rng = this.rng, events = [];
    const def = this.phaseDef();
    if (this.playMode() !== 'free') { this.credit -= cfg.stake; this.meters.in += cfg.stake; this.meters.plays++; }

    this.progression?.beforePlay?.(this, events);

    const every = typeof def.holdsEveryPlay === 'function' ? def.holdsEveryPlay(this) : def.holdsEveryPlay;
    const usedHolds = (this.holdsOffered || every) && holds.some(Boolean);
    const heldReels = cfg.reels.map((_, i) => usedHolds && !!holds[i]);
    this.holdsOffered = false;

    if (def.spin) return def.spin(this, heldReels, events);     // a phase that decides the spin itself

    this.positions = this.positions.map((p, i) => (heldReels[i] ? p : rng.int(cfg.reels[i].length)));
    events.push({ type: 'spin', positions: [...this.positions], held: heldReels });

    const win = lineWin(cfg, lineSymbols(cfg, this.positions));
    this.pay(win, usedHolds ? 'held' : 'line', events);

    if (def.afterSpin && def.afterSpin(this, events, win)) return events;

    // Assists only after a losing play.
    if (win === 0) {
      this.growCashPot(events);
      if (!usedHolds && rng.chance(cfg.holdChance)) { this.holdsOffered = true; events.push({ type: 'holdsOffered' }); }
      if (rng.chance(cfg.nudgeChance)) this.awardNudges(rng.weighted(cfg.nudgeCounts), events);
      if (this.nudgeBank > 0) {                                     // banked nudges join in; unused ones go back
        this.fromBank = this.nudgeBank; this.nudges += this.nudgeBank; this.nudgeBank = 0;
        events.push({ type: 'nudgeBankUsed', count: this.nudges });
      }
    }

    if (this.nudges > 0) { this.phase = 'nudge'; return events; }   // the reels are read after the nudges
    this.reelsSettled(events);
    this.settle(events);
    return events;
  }

  // The reels have stopped for good (spin and nudges done): let the progression read them.
  reelsSettled(events) { this.progression?.afterReels?.(this, events); }

  // After a spin, nudges, a stop or a feature: decide what happens next.
  settle(events) {
    if (this.phaseDef().blocking) return;                     // waiting for the player
    if (this.nudges > 0) { this.phase = 'nudge'; return; }
    if (this.queue.length) { this.runFeature(this.queue.shift(), events); return; }
    if (this.progression?.settle?.(this, events)) return;
    this.phase = 'idle';
  }

  // ---------- nudges ----------
  awardNudges(count, events) { this.nudges += count; events.push({ type: 'nudges', count: this.nudges }); }

  // Banked nudges stay with the player and come up after any losing spin until they are used.
  awardNudgeBank(count, events) {
    this.nudgeBank += Math.max(1, count);
    events.push({ type: 'nudgeBank', bank: this.nudgeBank });
  }

  // Nudging is over: unused banked nudges go back in the bank.
  endNudges(events) {
    const back = Math.min(this.nudges, this.fromBank);
    this.nudges = 0; this.fromBank = 0;
    if (back > 0) { this.nudgeBank += back; events.push({ type: 'nudgeBank', bank: this.nudgeBank, returned: back }); }
  }

  nudge(reel) {
    if (this.phase !== 'nudge') throw new Error('no nudges');
    const events = [], cfg = this.config;
    this.positions[reel] = (this.positions[reel] + 1) % cfg.reels[reel].length;
    this.nudges--;
    events.push({ type: 'nudged', reel, positions: [...this.positions], left: this.nudges });
    const win = lineWin(cfg, lineSymbols(cfg, this.positions));
    if (win > 0) { this.pay(win, 'nudge', events); this.endNudges(events); }
    if (this.nudges === 0) { this.fromBank = 0; this.phase = 'idle'; this.reelsSettled(events); this.settle(events); }
    return events;
  }

  skipNudges() {
    if (this.phase !== 'nudge') throw new Error('no nudges');
    const events = [];
    this.endNudges(events);
    this.phase = 'idle';
    this.reelsSettled(events);
    this.settle(events);
    return events;
  }

  // ---------- running lamps (random or skill stops) ----------
  // ctx: { kind, skill, segments, module, ...anything the module needs }. module.onStop(m, ctx, at, events) ends it.
  startStop(ctx, events) {
    this.stopCtx = ctx;
    this.phase = 'stop';
    const { module, ...shown } = ctx;
    events.push({ type: 'stopStart', ...shown });
  }

  // index: where the player stopped the lamp (skill). For a random stop the engine picks.
  stop(index) {
    if (this.phase !== 'stop') throw new Error('nothing to stop');
    const ctx = this.stopCtx, rng = this.rng, events = [];
    const n = ctx.segments;
    const at = ctx.skill && Number.isInteger(index) ? ((index % n) + n) % n : rng.int(n);
    this.stopCtx = null;
    this.phase = 'idle';
    events.push({ type: 'stopped', kind: ctx.kind, at });
    ctx.module.onStop(this, ctx, at, events);
    return events;
  }

  // ---------- features ----------
  runFeature(id, events) {
    const f = this.config.features[id];
    if (!f) throw new Error(`no feature "${id}"`);
    this.meters.features[id] = (this.meters.features[id] || 0) + 1;
    this.currentFeature = id;
    this.phase = 'idle';
    featureKinds[f.kind].start(this, f, id, events);
  }

  // A feature has finished: run the next queued one, if any.
  afterFeature(events) {
    this.phase = 'idle';
    if (this.queue.length) this.runFeature(this.queue.shift(), events);
  }

  // Helpers for feature modules.
  forceWin(pattern) { this.positions = positionsFor(this.config, pattern, this.rng); return [...this.positions]; }
  isWin() { return lineWin(this.config, lineSymbols(this.config, this.positions)) > 0; }
  stops() { return stopsAt(this.config, this.positions); }

  // ---------- named shortcuts (older callers) ----------
  takeFeature() { return this.act('take'); }
  ladderGamble() { return this.act('gamble'); }
  ladderCollect() { return this.act('collect'); }
}
