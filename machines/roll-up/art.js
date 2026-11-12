// Art pack: image key -> file (relative to the project folder). Inlined by build.mjs.
// Roll Up's funfair set (Pixellab, prompts in art/prompts/log.jsonl). The symbol codes stay classic.
const A = 'machines/roll-up/art/';
export default {
  sym_CH: A + 'duck.png', sym_LE: A + 'toffee.png', sym_OR: A + 'candy.png', sym_PL: A + 'icecream.png',
  sym_ME: A + 'coconut.png', sym_BE: A + 'goldfish.png', sym_BA: A + 'ticket.png', sym_SE: A + 'wheel.png', sym_QM: A + 'qm.png',
  fair: A + 'fair-bg.png',
  // board square pictures
  ...Object.fromEntries(['go', 'cash', 'nudge', 'level', 'token', 'half', 'end', 'duck', 'striker', 'coconut', 'dodgem', 'horse']
    .map(k => [`sq_${k}`, `${A}board/sq-${k}.png`])),
};
