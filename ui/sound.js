// Chip-style sound effects made with the Web Audio API (no audio files).
let ac = null, on = true;

function tone(freq, dur, { type = 'square', vol = 0.06, at = 0, slide = 0 } = {}) {
  if (!ac || !on) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sound = {
  unlock() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
  },
  toggle() { on = !on; },
  spin(ms) { for (let t = 0; t < ms / 1000; t += 0.045) tone(110 + (t * 37 % 40), 0.03, { at: t, vol: 0.025 }); },
  stop() { tone(90, 0.08, { type: 'triangle', vol: 0.2, slide: -40 }); },
  nudge() { tone(300, 0.05, { vol: 0.05 }); tone(200, 0.06, { at: 0.05, vol: 0.05 }); },
  tick() { tone(1400, 0.015, { vol: 0.03 }); },
  lamp() { tone(880, 0.05, { vol: 0.04 }); },
  award() { [660, 880, 1100].forEach((f, i) => tone(f, 0.07, { at: i * 0.06, vol: 0.05 })); },
  win(p) { const n = Math.min(8, 3 + Math.floor(p / 50)); for (let i = 0; i < n; i++) tone(520 + i * 90, 0.08, { at: i * 0.07, vol: 0.05 }); },
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.1, { at: i * 0.09, vol: 0.06 })); },
  jackpot() {
    // A short arcade victory tune over a twinkling bell, about five seconds long.
    const tune = [[523,1],[659,1],[784,1],[1047,2],[784,1],[1047,3],[0,1],[880,1],[988,1],[1047,1],[1175,2],[1047,1],[1319,4]];
    let at = 0;
    for (const [f, len] of tune) { if (f) { tone(f, len * 0.11, { at, vol: 0.07 }); tone(f / 2, len * 0.11, { at, vol: 0.04, type: 'triangle' }); } at += len * 0.12; }
    for (let i = 0; i < 40; i++) tone(1800 + (i % 5) * 220, 0.04, { at: at + i * 0.06, vol: 0.025 });
  },
  gamble() { for (let i = 0; i < 12; i++) tone(i % 2 ? 700 : 500, 0.05, { at: i * 0.09, vol: 0.04 }); },
  lose() { tone(400, 0.4, { type: 'sawtooth', vol: 0.05, slide: -300 }); },
};
