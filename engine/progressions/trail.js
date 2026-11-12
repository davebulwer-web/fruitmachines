// Number trail (as on Oche Cash's Checkout trail). Some reel stops carry a number (e.g. 'LE2').
// After the reels settle, the numbers on the win line add to the trail. A number on every reel
// jumps to at least the first feature rung; a question mark on every reel goes to the top.
// From config.trail.featureFrom a feature is offered: take it, or spin on to climb.
// The trail is lost between spins unless the Feature Held lamp lights; an offer spun on that
// gains nothing is also lost unless held. One or two question marks give a random helper.
//
// Config:
//   questionSymbol: 'QM'
//   trail: { length, featureFrom, heldChance, heldPerRung, skillStopMax, rungs: { rung: featureId } }
//   questionOptions: [{ value: 'held'|'numbersInView'|'boost'|'skillStop'|'addAgain'|'nudges', weight }]
//   trail.offer: 'spinOn' (default): an offer can be taken, or spun on (paid) to climb, at the risk above.
//                'gamble': an offer can be taken or gambled; losing loses the trail. No spinning on.
//                          trail.gamble = { to: 'next', chance: 0.5 } gambles up one rung at a time;
//                          { to: 'top', chance: { 4: 0.1, 5: 0.2, ... } } gambles straight for the top
//                          rung's feature with a chance per rung. Reaching the top takes it.
// Phase 'offer': take, plus play (spinOn) or gamble (gamble).

const trail = {
  init(m) { m.trail = 0; m.held = false; },

  beforePlay(m, events) {
    const wasOffer = m.phase === 'offer';
    if (!wasOffer && m.trail > 0 && !m.held) { m.trail = 0; events.push({ type: 'trailLost' }); }
    m.held = false;
    m.addedThisGame = 0;
    m.trailCounted = false;
    m.wasOffer = wasOffer;
  },

  // Read the numbers on the win line, once per game.
  afterReels(m, events) {
    if (m.trailCounted) return;
    m.trailCounted = true;
    const cfg = m.config;
    const stops = m.stops();
    const nums = stops.map(s => s.num);
    const qms = stops.filter(s => s.sym === cfg.questionSymbol).length;
    const sum = nums.reduce((a, b) => a + b, 0);
    const top = cfg.trail.length;
    const all = stops.length;

    if (qms === all) set(m, top, events, 'threeQ');
    else if (nums.every(n => n > 0)) set(m, Math.max(cfg.trail.featureFrom, Math.min(top, m.trail + sum)), events, 'threeNumbers');
    else if (sum > 0) set(m, Math.min(top, m.trail + sum), events, 'numbers');
    if (qms > 0 && qms < all) question(m, sum, events);
  },

  // Offer a feature, or decide whether the trail is held. Returns true if it set the phase.
  settle(m, events) {
    const cfg = m.config, rng = m.rng;
    if (m.trail >= cfg.trail.featureFrom) {
      if (m.wasOffer && m.addedThisGame === 0 && !m.held) {
        m.trail = 0; events.push({ type: 'trailLost' }); m.phase = 'idle'; return true;
      }
      m.phase = 'offer';
      if (!m.held) m.held = rng.chance(cfg.trail.heldChance + cfg.trail.heldPerRung * m.trail);
      events.push({ type: 'featureHeld', lit: m.held });
      events.push({ type: 'offer', rung: m.trail, feature: cfg.trail.rungs[m.trail] });
      return true;
    }
    if (m.trail > 0) {
      if (!m.held) m.held = rng.chance(cfg.trail.heldChance + cfg.trail.heldPerRung * m.trail);
      events.push({ type: 'featureHeld', lit: m.held });
    } else if (m.held) {                          // nothing on the trail, so nothing to hold
      m.held = false;
      events.push({ type: 'featureHeld', lit: false });
    }
    return false;
  },

  // A skill stop round the lower trail.
  onStop(m, ctx, at, events) {
    set(m, Math.max(m.trail, at + 1), events, 'skillStop');
    m.settle(events);
  },

  phases: {
    offer: {
      play: m => (m.config.trail.offer === 'gamble' ? false : 'paid'),
      actions: {
        take(m, arg, events) {
          const rung = m.trail, id = m.config.trail.rungs[rung];
          m.trail = 0; m.held = false;
          events.push({ type: 'featureStart', rung, feature: id });
          m.runFeature(id, events);
        },
        gamble(m, arg, events) {
          const cfg = m.config, top = cfg.trail.length, gam = gambleRule(cfg);
          if (cfg.trail.offer !== 'gamble') throw new Error('this trail has no gamble');
          const p = typeof gam.chance === 'number' ? gam.chance : gam.chance[m.trail] ?? 0.5;
          if (m.rng.chance(p)) {
            m.trail = gam.to === 'top' ? top : m.trail + 1;
            events.push({ type: 'trailGamble', won: true, value: m.trail });
            if (m.trail === top) { trail.phases.offer.actions.take(m, arg, events); return; }
            events.push({ type: 'offer', rung: m.trail, feature: cfg.trail.rungs[m.trail] });
          } else {
            events.push({ type: 'trailGamble', won: false });
            m.trail = 0; m.held = false;
            events.push({ type: 'trailLost' });
            m.phase = 'idle';
          }
        },
      },
      // simulator: take at p.takeAt (or p.takeAtHeld when held); always take the top rung. Otherwise spin on (null) or gamble.
      bot(m, p) {
        const top = m.config.trail.length;
        const at = m.held ? (p.takeAtHeld ?? 8) : (p.takeAt ?? 6);
        if (m.trail >= at || m.trail === top) return 'take';
        return m.config.trail.offer === 'gamble' ? 'gamble' : null;
      },
    },
  },
};

// trail.gamble: { to: 'next' | 'top', chance: 0.5 or { rung: chance } }. Default: up one step at evens.
const gambleRule = cfg => ({ to: 'next', chance: 0.5, ...(cfg.trail.gamble || {}) });

function set(m, value, events, why) {
  const added = value - m.trail;
  m.trail = value;
  m.addedThisGame += Math.max(0, added);
  events.push({ type: 'trail', value: m.trail, added, why });
}

function question(m, sum, events) {
  const cfg = m.config, rng = m.rng, top = cfg.trail.length;
  // Feature Held needs something to hold: with an empty trail it is not one of the choices.
  const options = m.trail > 0 ? cfg.questionOptions : cfg.questionOptions.filter(o => o.value !== 'held');
  const opt = rng.weighted(options);
  events.push({ type: 'question', option: opt });
  switch (opt) {
    case 'held': m.held = true; events.push({ type: 'featureHeld', lit: true }); break;
    case 'numbersInView': {
      let total = 0;
      cfg._strips.forEach((strip, i) => {
        for (const k of [-1, 0, 1]) total += strip[(m.positions[i] + k + strip.length) % strip.length].num;
      });
      if (total > 0) set(m, Math.min(top, m.trail + total), events, 'inView');
      break;
    }
    case 'addAgain': if (sum > 0) set(m, Math.min(top, m.trail + sum), events, 'addAgain'); break;
    case 'nudges': m.awardNudges(rng.weighted(cfg.nudgeCounts), events); break;
    case 'boost': set(m, Math.min(top, m.trail + 1 + rng.int(6)), events, 'boost'); break;   // random stop 1..6 on
    case 'skillStop': {
      const n = cfg.trail.skillStopMax || top;
      m.startStop({ kind: 'trail', skill: true, segments: n, module: trail }, events);
      break;
    }
    default: if (cfg.features?.[opt]) m.queue.push(opt);              // any feature id: that feature plays next
  }
}

export default trail;
