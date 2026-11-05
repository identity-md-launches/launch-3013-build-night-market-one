import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve('src/assets/share.svg')).href);
  await page.screenshot({ path: 'public/share.png', type: 'png' });
  console.log('Rendered the local vector share artwork to public/share.png (1200 × 630).');
} finally { await browser.close(); }
