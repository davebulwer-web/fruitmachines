// Captures a preview picture of each machine (its screen at 270 x 480) for the arcade lobby.
// Run after a build, then build again so the lobby includes them:
//   node build.mjs && node previews.cjs && node build.mjs
// Needs Playwright with Chromium. Pictures go to machines/<id>/preview.png.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const ids = fs.readFileSync(path.join(__dirname, 'machines/index.js'), 'utf8').match(/'([a-z0-9-]+)'/g).map(s => s.slice(1, -1));
  const browser = await chromium.launch();
  for (const id of ids) {
    const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
    await page.goto('file://' + path.join(__dirname, 'dist', `${id}.html`) + '?seed=8');
    await page.waitForTimeout(800);
    // one spin so the reels and display look like a machine in play
    await page.keyboard.press('Space');
    await page.waitForTimeout(3500);
    const data = await page.evaluate(() => document.getElementById('screen').toDataURL('image/png'));
    fs.writeFileSync(path.join(__dirname, 'machines', id, 'preview.png'), Buffer.from(data.split(',')[1], 'base64'));
    console.log('preview', id);
    await page.close();
  }
  await browser.close();
})();
