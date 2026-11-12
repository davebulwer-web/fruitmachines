// Art pack: image key -> file (relative to the project folder). Inlined by build.mjs.
// Golden Goal's football set (Pixellab, prompts in art/prompts/log.jsonl). The symbol codes stay classic.
const A = 'machines/golden-goal/art/';
export default {
  sym_CH: A + 'whistle.png', sym_LE: A + 'boot.png', sym_OR: A + 'scarf.png', sym_PL: A + 'shirt.png',
  sym_ME: A + 'ball.png', sym_BE: A + 'flag.png', sym_BA: A + 'medal.png', sym_SE: A + 'trophy.png', sym_QM: A + 'qm.png',
  stadium: A + 'stadium-bg.png',
  keeper: A + 'keeper.png',            // the Penalty panel's goalkeeper
  ball: A + 'ball.png',                // the Penalty ball and the Cup Run counter
  ...Object.fromEntries(['through', 'tackle', 'red', 'free', 'hat', 'go'].map(k => [`sq_${k}`, `${A}board/sq-${k}.png`])),
};
