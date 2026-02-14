#!/usr/bin/env node
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, "..", "docs");
const BASE = "http://localhost:3000";
const VIEWPORT = { width: 1280, height: 800 };

async function screenshot(page, url, filename, { fullPage = true, setup } = {}) {
  console.log(`  Capturing ${filename}...`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  // Let animations and charts settle
  await page.waitForTimeout(2000);
  if (setup) await setup(page);
  await page.screenshot({
    path: path.join(DOCS_DIR, filename),
    fullPage,
  });
  console.log(`  OK: ${filename}`);
}

(async () => {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await context.newPage();

  try {
    // 1. Dashboard
    await screenshot(page, `${BASE}/`, "dashboard.png");

    // 2. Market table
    await screenshot(page, `${BASE}/market`, "market.png");

    // 3. Analytics - Correlation tab (default)
    await screenshot(page, `${BASE}/analytics`, "analytics-correlation.png");

    // 4. Analytics - Risk & Return tab
    await screenshot(page, `${BASE}/analytics`, "analytics-risk-return.png", {
      setup: async (p) => {
        const tab = p.getByRole("tab", { name: /risk/i });
        if (await tab.isVisible()) {
          await tab.click();
          await p.waitForTimeout(2500);
        }
      },
    });

    // 5. Coin detail - Candlestick (default)
    await screenshot(page, `${BASE}/coins/2`, "coin-detail-candle.png");

    // 6. Coin detail - Line chart
    await screenshot(page, `${BASE}/coins/2`, "coin-detail-line.png", {
      setup: async (p) => {
        const lineBtn = p.getByRole("button", { name: /line/i });
        if (await lineBtn.isVisible()) {
          await lineBtn.click();
          await p.waitForTimeout(1500);
        }
      },
    });

    // 7. Pipeline monitor
    await screenshot(page, `${BASE}/pipeline`, "pipeline.png");

    // 8. Data quality
    await screenshot(page, `${BASE}/quality`, "quality.png");

    console.log("\nAll screenshots captured successfully.");
  } catch (err) {
    console.error("Screenshot error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
