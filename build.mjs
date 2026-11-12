// Builds self-contained pages (code and art inlined) that run offline:
//   dist/<machine>.html          one page per machine
//   dist/index.html              the arcade: a lobby listing every machine
//   dist/arcade-artifact.html    the arcade, for publishing as a claude.ai artifact
// Needs esbuild: `npm install` (or set ESBUILD_PATH to an esbuild package folder).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { machineIds } from './machines/index.js';
const esbuild = await import(process.env.ESBUILD_PATH ? pathToFileURL(process.env.ESBUILD_PATH + '/lib/main.js').href : 'esbuild');

const bundle = async entry => (await esbuild.build({ entryPoints: [entry], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020' })).outputFiles[0].text;
const uri = f => 'data:image/png;base64,' + readFileSync(f).toString('base64');
const artPack = async id => Object.fromEntries(Object.entries((await import(`./machines/${id}/art.js`)).default).map(([k, f]) => [k, uri(f)]));
const fill = (tpl, { title, art, js }) => readFileSync(tpl, 'utf8')
  .replace('<!--TITLE-->', title)
  .replace('<!--ART-->', () => `<script>${art}</script>`)
  .replace('<!--SCRIPT-->', () => `<script>${js}</script>`);

mkdirSync('dist', { recursive: true });
const arts = {};
for (const id of machineIds) {
  const config = (await import(`./machines/${id}/config.js`)).default;
  arts[id] = await artPack(id);
  writeFileSync(`dist/${id}.html`, fill('ui/index.html', { title: config.name, art: `window.MACHINE_ART=${JSON.stringify(arts[id])}`, js: await bundle(`machines/${id}/main.js`) }));
  console.log(`built dist/${id}.html`);
}
// lobby art: the arcade backdrop and each machine's preview (from previews.cjs, if it has been run)
const lobby = { backdrop: uri('art/arcade-bg.png'), previews: {} };
for (const id of machineIds) if (existsSync(`machines/${id}/preview.png`)) lobby.previews[id] = uri(`machines/${id}/preview.png`);
const arcade = { title: 'Fruit Machine Arcade', art: `window.MACHINE_ARTS=${JSON.stringify(arts)};window.ARCADE_ART=${JSON.stringify(lobby)}`, js: await bundle('ui/arcade.js') };
writeFileSync('dist/arcade-artifact.html', fill('ui/arcade.html', arcade));
writeFileSync('dist/index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n${fill('ui/arcade.html', arcade)}</head></html>`.replace('</style>', '</style></head><body>').replace('</head></html>', '</body></html>'));
console.log('built dist/index.html and dist/arcade-artifact.html');
