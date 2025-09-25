import { chromium, devices } from 'playwright';

const PREVIEW_URL = process.env.PREVIEW_URL;
const STORE_PASSWORD = process.env.STORE_PASSWORD;
const COLLECTION_URL = process.env.COLLECTION_URL || '';
const PRODUCT_URL = process.env.PRODUCT_URL || '';
const ABOUT_URL = process.env.ABOUT_URL || '/pages/about';

if (!PREVIEW_URL || !STORE_PASSWORD) {
  console.error('Missing PREVIEW_URL or STORE_PASSWORD');
  process.exit(1);
}

const toAbs = (p) => p && p.startsWith('http') ? p : (PREVIEW_URL.replace(/\/$/, '') + (p || ''));

const targets = [
  { name: 'home', url: PREVIEW_URL },
  { name: 'collection', url: COLLECTION_URL ? toAbs(COLLECTION_URL) : null },
  { name: 'product', url: PRODUCT_URL ? toAbs(PRODUCT_URL) : null },
  { name: 'about', url: ABOUT_URL ? toAbs(ABOUT_URL) : null }
].filter(t => t && t.url);

const viewports = [
  { name: 'desktop', viewport: { width: 1366, height: 900 } },
  { name: 'mobile',  viewport: devices['iPhone 12'].viewport, userAgent: devices['iPhone 12'].userAgent }
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const goWithPassword = async (url) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const pw = page.locator('input[type="password"], input[name="password"]').first();
    if (await pw.isVisible().catch(()=>false)) {
      await pw.fill(STORE_PASSWORD);
      const submit = page.locator('button[type="submit"], input[type="submit"], [name="commit"]').first();
      if (await submit.isVisible().catch(()=>false)) { await submit.click(); }
      await page.waitForLoadState('domcontentloaded');
    }
    await page.waitForTimeout(1200);
  };

  for (const t of targets) {
    for (const v of viewports) {
      await page.setViewportSize(v.viewport);
      const url = t.url.endsWith('/') ? t.url : t.url + '/';
      await goWithPassword(url);
      await page.screenshot({ path: `preview_${t.name}_${v.name}.png`, fullPage: true });
    }
  }

  await browser.close();
  console.log('Screenshots saved: preview_*_(desktop|mobile).png');
})();
