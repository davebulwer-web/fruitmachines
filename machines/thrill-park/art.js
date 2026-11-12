// Art pack: image key -> file (relative to the project folder). Inlined by build.mjs.
// Thrill Park's theme park set (Pixellab, prompts in art/prompts/log.jsonl). BN is the ride ticket bonus symbol.
const A = 'machines/thrill-park/art/';
export default {
  sym_CH: A + 'balloon.png', sym_LE: A + 'hotdog.png', sym_OR: A + 'popcorn.png', sym_PL: A + 'soda.png',
  sym_ME: A + 'map.png', sym_BE: A + 'mascot.png', sym_BA: A + 'coastercar.png', sym_SE: A + 'castle.png', sym_BN: A + 'ticket.png',
  park: A + 'park-bg.png',
  ...Object.fromEntries(['coaster', 'teacups', 'flume', 'ghost', 'ship', 'tower', 'carousel', 'splash'].map(k => [`ride_${k}`, `${A}rides/${k}.png`])),
};
