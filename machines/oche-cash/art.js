// Art pack: image key -> file (relative to the project folder). Inlined by build.mjs.
// Keys named sym_XX replace the code-drawn placeholder for reel symbol XX.
export default {
  ...Object.fromEntries(['CH', 'LE', 'OR', 'PL', 'ME', 'BE', 'BA', 'SE'].map(s => [`sym_${s}`, `art/symbols/${s}.png`])),
  sym_QM: 'machines/oche-cash/art/qm.png',
  dartboard: 'machines/oche-cash/art/dartboard-clean.png',
  pub: 'machines/oche-cash/art/pub-bg-clean.png',
};
