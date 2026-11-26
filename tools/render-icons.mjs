// Renders the PNG icons from the SVGs in deploy/public/icons (needs Playwright).
// Usage: node tools/render-icons.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'deploy', 'public', 'icons');
const jobs = [
  ['icon.svg', 'icon-192.png', 192], ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512], ['icon-maskable.svg', 'icon-maskable-192.png', 192],
  ['icon-maskable.svg', 'apple-touch-icon.png', 180], ['favicon.svg', 'favicon-32.png', 32],
];
const browser = await chromium.launch();
for (const [src, out, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const svg = readFileSync(join(DIR, src), 'utf8');
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: join(DIR, out), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('wrote icons/' + out);
}
await browser.close();
