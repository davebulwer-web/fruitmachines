// Art pack: image key -> file (relative to the project folder). Inlined by build.mjs.
// Night Cab's late-night set (Pixellab, prompts in art/prompts/log.jsonl). The symbol codes stay classic.
const A = 'machines/night-cab/art/';
export default {
  sym_CH: A + 'dice.png', sym_LE: A + 'cone.png', sym_OR: A + 'lights.png', sym_PL: A + 'moon.png',
  sym_ME: A + 'keys.png', sym_BE: A + 'meter.png', sym_BA: A + 'clock.png', sym_SE: A + 'cab.png', sym_QM: A + 'qm.png',
  city: A + 'city-bg.png',
  // board square pictures
  ...Object.fromEntries(['go', 'cash', 'nudge', 'level', 'fare', 'half', 'end', 'taxi', 'pot', 'light', 'hilo', 'lost', 'rush', 'bus']
    .map(k => [`sq_${k}`, `${A}board/sq-${k}.png`])),
};
