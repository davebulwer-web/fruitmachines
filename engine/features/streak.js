// Win streak: every free spin wins until the machine throws a loser.
// Config: { kind: 'streak', endChance: 0.45, wins: [{ value: { pattern, pays }, weight }] }
// Phase 'streak': play is free and decided here.
import { lineWin, lineSymbols } from '../reels.js';

export default {
  init(m) { m.streak = false; m.streakBank = 0; },
  start(m, f, id, events) {
    m.streak = true; m.streakBank = 0; m.streakFeature = id;
    m.phase = 'streak';
    events.push({ type: 'streakStart', feature: id });
  },
  phases: {
    streak: {
      play: 'free',
      blocking: true,
      spin(m, heldReels, events) {
        const cfg = m.config, rng = m.rng, f = cfg.features[m.streakFeature];
        if (rng.chance(f.endChance)) {
          m.streak = false;
          const roll = () => m.positions.map((p, i) => rng.int(cfg.reels[i].length));
          m.positions = roll();
          while (lineWin(cfg, lineSymbols(cfg, m.positions)) > 0) m.positions = roll();   // make sure it is a loser
          events.push({ type: 'spin', positions: [...m.positions], held: heldReels });
          events.push({ type: 'streakEnd', total: m.streakBank });
          m.phase = 'idle';
          m.settle(events);
          return events;
        }
        const entry = rng.weighted(f.wins);
        events.push({ type: 'spin', positions: m.forceWin(entry.pattern), held: heldReels });
        m.streakBank += entry.pays;
        m.pay(entry.pays, m.streakFeature, events);
        return events;                                 // stay in the streak
      },
    },
  },
};
