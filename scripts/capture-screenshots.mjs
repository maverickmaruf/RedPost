import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let file = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const filePath = path.join(process.cwd(), 'dist', file);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(process.cwd(), 'dist', 'index.html')).pipe(res);
  }
});

const outDir = path.join(process.cwd(), 'docs', 'screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Screen Capture] Server running at ${baseUrl}`);

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=2']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    // 1. Title Screen
    console.log('[1/9] Capturing Title Screen...');
    await page.goto(baseUrl);
    await page.waitForSelector('.title-screen');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, '01_title_screen.png'), fullPage: false });

    // 2. Flight Briefing Deck
    console.log('[2/9] Capturing Flight Briefing Deck...');
    const briefingBtn = page.getByRole('button', { name: /Briefing|ফ্লাইট ব্রিফিং/i });
    if (await briefingBtn.isVisible()) {
      await briefingBtn.click();
      await page.waitForSelector('dialog.briefing-modal', { state: 'visible' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, '02_briefing_deck.png'), fullPage: false });
      const closeBriefing = page.locator('dialog.briefing-modal .btn.primary');
      if (await closeBriefing.isVisible()) await closeBriefing.click();
      await page.waitForTimeout(300);
    }

    // 3. Mission Setup Screen (Radar & Landing Altimeter)
    console.log('[3/9] Capturing Mission Setup Screen...');
    await page.goto(baseUrl);
    await page.getByRole('button', { name: /Choose site|জায়গা/i }).click();
    await page.waitForSelector('.screen.setup, canvas.slope-map');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, '03_mission_setup.png'), fullPage: false });

    // 4. Earth-Mars Telemetry Relay Modal
    console.log('[4/9] Capturing Earth-Mars Relay Telemetry...');
    await page.goto(baseUrl);
    await page.waitForSelector('.hero-highlights');
    const relayPill = page.locator('.hl-pill').last();
    await relayPill.click();
    await page.waitForSelector('dialog.feature-modal', { state: 'visible' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, '04_earth_mars_relay.png'), fullPage: false });
    const closeRelay = page.locator('dialog.feature-modal .btn.primary');
    if (await closeRelay.isVisible()) await closeRelay.click();
    await page.waitForTimeout(300);

    // 5. Sol Command Dashboard
    console.log('[5/9] Capturing Sol Command Dashboard...');
    await page.goto(`${baseUrl}/?judge=1`);
    await page.waitForSelector('.screen.sol');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, '05_sol_command.png'), fullPage: false });

    // 6. Commander's Critical Decision Modal
    console.log('[6/9] Capturing Critical Decision Alert Modal...');
    await page.evaluate(() => {
      const dlg = document.createElement('dialog');
      dlg.className = 'sheet feature-modal decision-modal';
      dlg.setAttribute('aria-labelledby', 'dec-title');
      dlg.innerHTML = `
        <div class="sheet-grip" aria-hidden="true"></div>
        <div class="dialog-head">
          <div class="card-head">
            <span class="icon lg" style="display:inline-flex;color:var(--c-dose)"><svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-4.5a1 1 0 0 1-2 0V7a1 1 0 0 1 2 0z"/></svg></span>
            <h2 id="dec-title">Commander's Critical Decision</h2>
          </div>
        </div>
        <p class="prose" style="margin: 12px 0 20px; line-height: 1.6; color: var(--text-2);">
          NASA DONKI space weather telemetry confirms an extreme solar CME is impacting Mars today! Sending the crew outside on an EVA walk exposes astronauts to dangerous radiation doses (exceeding 25 mSv). Do you want to shelter the crew or risk the walk for science?
        </p>
        <div class="btn-row">
          <button class="btn primary lg block" type="button">Order Into Shelter (Recommended)</button>
          <button class="btn block" type="button">Risk EVA Walk Outside</button>
        </div>
      `;
      document.body.append(dlg);
      dlg.showModal();
    });

    await page.waitForSelector('dialog.decision-modal', { state: 'visible' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, '06_critical_decision.png'), fullPage: false });

    // Close decision modal
    await page.evaluate(() => {
      const dlg = document.querySelector('dialog.decision-modal');
      if (dlg) { dlg.close(); dlg.remove(); }
    });
    await page.waitForTimeout(300);

    // 7. Advance remaining sols to reach Review screen
    console.log('[7/9] Navigating to Flight Director Review Screen...');
    while (await page.locator('.endsol').isVisible().catch(() => false)) {
      await page.locator('.endsol').click();
      await page.waitForTimeout(250);
      const btn = page.getByRole('dialog').getByRole('button').first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(250);
      }
    }

    await page.waitForSelector('main.review');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, '07_review_charts.png'), fullPage: false });

    // 8. Official Printable Flight Certificate
    console.log('[8/9] Capturing Official Flight Certificate...');
    const nameInput = page.locator('#cert-name-input');
    if (await nameInput.isVisible()) {
      await nameInput.fill('MARUF MAV (COMMANDER)');
      await page.waitForTimeout(200);
    }
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);
    const certElement = page.locator('.print-certificate');
    await certElement.screenshot({ path: path.join(outDir, '08_flight_certificate.png') });
    await page.emulateMedia({ media: 'screen' });

    // 9. Mobile Responsive Viewport
    console.log('[9/9] Capturing Mobile Command Viewport...');
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await mobilePage.goto(`${baseUrl}/?judge=1`);
    await mobilePage.waitForSelector('.screen.sol');
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({ path: path.join(outDir, '09_mobile_command.png'), fullPage: false });
    await mobilePage.close();

    console.log('🎉 All 9 screenshots captured successfully in docs/screenshots/!');
    await browser.close();
  } catch (err) {
    console.error('❌ Error capturing screenshots:', err);
  } finally {
    server.close();
  }
});
