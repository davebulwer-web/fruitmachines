// Art pack: image key -> file (relative to the project folder). Inlined by build.mjs.
// Supermarket's shopping set (Pixellab, prompts in art/prompts/log.jsonl). The symbol codes stay classic.
const A = 'machines/supermarket/art/';
export default {
  sym_CH: A + 'carrot.png', sym_LE: A + 'milk.png', sym_OR: A + 'bread.png', sym_PL: A + 'cheese.png',
  sym_ME: A + 'beans.png', sym_BE: A + 'basket.png', sym_BA: A + 'till.png', sym_SE: A + 'trolley.png', sym_QM: A + 'qm.png',
  aisle: A + 'aisle-bg.png',
  ...Object.fromEntries(['go', 'cash', 'nudge', 'level', 'trip', 'half', 'end', 'double', 'pot', 'scan', 'lucky', 'bogof', 'express']
    .map(k => [`sq_${k}`, `${A}board/sq-${k}.png`])),
};
