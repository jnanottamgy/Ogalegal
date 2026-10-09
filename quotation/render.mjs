// Renders quotation.html to an A4 PDF (and optional PNG previews) with headless Chromium.
// Usage: node quotation/render.mjs [--png <dir>]
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// createRequire honours NODE_PATH, so a globally installed Playwright works too.
const { chromium } = createRequire(import.meta.url)('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const src = pathToFileURL(path.join(here, 'quotation.html')).href;
const out = path.join(here, 'Quotation-Ogha-Legal-JTACS.pdf');
const pngIdx = process.argv.indexOf('--png');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(src, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
console.log('PDF:', out);

if (pngIdx !== -1) {
  const dir = process.argv[pngIdx + 1];
  await page.setViewportSize({ width: 794, height: 1123 });
  const pages = await page.$$('section.page');
  for (let i = 0; i < pages.length; i++) {
    const file = path.join(dir, `page-${i + 1}.png`);
    await pages[i].screenshot({ path: file });
    const overflow = await pages[i].evaluate((el) => {
      const inner = el.querySelector('.inner');
      const foot = el.querySelector('.foot');
      return Math.round(inner.getBoundingClientRect().bottom - foot.getBoundingClientRect().top);
    });
    console.log(`page ${i + 1}: ${file} (content bottom vs footer top: ${overflow}px)`);
  }
}
await browser.close();
