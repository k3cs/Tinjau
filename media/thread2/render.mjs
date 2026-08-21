// Renders each card HTML to a 1600x900 PNG at 2x for X.
// Run from the repo root:  node media/thread2/render.mjs
import { chromium } from '../../apps/web/node_modules/playwright/index.mjs';
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => f.endsWith('.html')).sort();

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 2,
});

for (const file of files) {
  await page.goto(pathToFileURL(join(here, file)).href, { waitUntil: 'networkidle' });
  // Webfonts must be resolved before the screenshot or the metrics shift.
  await page.evaluate(() => document.fonts.ready);
  const out = join(here, file.replace(/\.html$/, '.png'));
  await page.screenshot({ path: out });
  console.log('rendered', file.replace(/\.html$/, '.png'));
}

await browser.close();
