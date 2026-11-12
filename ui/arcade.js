// The arcade: a lobby listing every machine, and the machine you pick. Used for the all-in-one page.
// To add a machine to it, import its config and skin here and add it to MACHINES.
import ocheCash from '../machines/oche-cash/config.js';
import ocheCashSkin from '../machines/oche-cash/skin.js';
import rollUp from '../machines/roll-up/config.js';
import rollUpSkin from '../machines/roll-up/skin.js';
import nightCab from '../machines/night-cab/config.js';
import nightCabSkin from '../machines/night-cab/skin.js';
import goldenGoal from '../machines/golden-goal/config.js';
import goldenGoalSkin from '../machines/golden-goal/skin.js';
import supermarket from '../machines/supermarket/config.js';
import supermarketSkin from '../machines/supermarket/skin.js';
import { startMachine } from './shell.js';
import { money } from './font.js';

const MACHINES = [
  { config: ocheCash, skin: ocheCashSkin },
  { config: rollUp, skin: rollUpSkin },
  { config: nightCab, skin: nightCabSkin },
  { config: goldenGoal, skin: goldenGoalSkin },
  { config: supermarket, skin: supermarketSkin },
];

const lobby = document.getElementById('lobby');
const stage = document.getElementById('stage');
const back = document.getElementById('back');
const arts = window.MACHINE_ARTS || {};
let current = null;

function showLobby() {
  current?.stop(); current = null;
  stage.hidden = true; back.hidden = true; lobby.hidden = false;
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

function play(id) {
  const m = MACHINES.find(x => x.config.id === id);
  if (!m) return showLobby();
  lobby.hidden = true; stage.hidden = false; back.hidden = false;
  // a fresh canvas for each machine so nothing carries over
  const old = document.getElementById('screen');
  const canvas = old.cloneNode(false);
  canvas.setAttribute('aria-label', `${m.config.name} fruit machine. Space to start, 1 to 3 to hold or nudge, C to collect or take, G to gamble or roll, M to mute.`);
  old.replaceWith(canvas);
  current = startMachine(m.config, m.skin, { canvas, art: arts[id] || {} });
  canvas.focus();
  history.replaceState(null, '', '#' + id);
}

// Lobby: one cabinet per machine with its preview picture (made by previews.cjs at build time).
const lobbyArt = window.ARCADE_ART || {};
if (lobbyArt.backdrop) document.getElementById('backdrop').style.backgroundImage = `url(${lobbyArt.backdrop})`;
const list = document.getElementById('machines');
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
for (const { config, skin } of MACHINES) {
  const li = el('li');
  const b = el('button', 'cabinet');
  b.style.setProperty('--accent', skin.display?.on || '#ff4030');
  b.setAttribute('aria-label', `Play ${config.name}`);
  const screen = el('div', 'screen');
  const preview = lobbyArt.previews?.[config.id];
  if (preview) { const img = el('img'); img.src = preview; img.alt = `${config.name} machine`; img.width = 270; img.height = 480; screen.append(img); }
  const plinth = el('div', 'plinth');
  plinth.append(el('span', 'tag', config.tagline || ''), el('span', 'meta', `${money(config.stake)} a go · ${money(config.jackpot)} jackpot`), el('span', 'play', 'PLAY'));
  b.append(el('span', 'marquee', config.name.toUpperCase()), screen, plinth);
  b.addEventListener('click', () => play(config.id));
  li.append(b);
  list.append(li);
}
// an empty cabinet for the machines still to come
{
  const li = el('li'), b = el('div', 'cabinet soon');
  const screen = el('div', 'screen'), inner = el('div', null, 'NEXT MACHINE COMING SOON');
  screen.append(inner);
  b.append(el('span', 'marquee', '? ? ?'), screen, el('div', 'plinth'));
  b.lastChild.append(el('span', 'tag', 'More themes and features on the way.'));
  b.style.setProperty('--accent', '#5a4870');
  li.append(b);
  list.append(li);
}
back.addEventListener('click', showLobby);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && current) showLobby(); });

const route = () => { const id = location.hash.slice(1); if (id && id !== current?.machine?.config?.id) play(id); else if (!id && current) showLobby(); };
window.addEventListener('hashchange', route);
const start = location.hash.slice(1);
start ? play(start) : showLobby();
