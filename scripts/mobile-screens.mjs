// Ad-hoc screenshot script used for Phase 9's before/after mobile pass.
// NOT wired into package.json/npm scripts and NOT part of the app build
// — this is a one-off verification tool, kept here for a future phase
// to reuse rather than re-invent, not a maintained project script.
//
// Requires `playwright-core` (NOT a project dependency — deliberately
// not added to package.json, same no-new-dependency reasoning Phases 6
// and 8 applied elsewhere) and a Chromium/headless_shell binary. This
// session found both askew of a normal `npm install`:
//   - `playwright-core` was installed into a throwaway sibling dir
//     (/home/claude/project/pwscratch) and the script was copied there
//     to run, since Node's ESM resolution doesn't honor NODE_PATH.
//   - Playwright's own `npx playwright install` could NOT reach its
//     CDN from this container (see Phase 8's HANDOFF.md) — a prebuilt
//     Chromium was already present at $PLAYWRIGHT_BROWSERS_PATH
//     (/opt/pw-browsers). Its `chrome` binary refused to launch
///    ("Old Headless mode has been removed") — use the sibling
//     chromium_headless_shell-*/chrome-linux/headless_shell binary
//     instead, passed via the PW_CHROMIUM env var below.
//
// Usage (after `npm run build && npx vite preview --port 4173`):
//   PW_CHROMIUM=/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell \
//     node mobile-screens.mjs <outDirTag>
// Seeds a bit of data via the real UI (not fixtures) so screens aren't
// all empty-states, and writes PNGs to /tmp/shots-<outDirTag>/.
import { chromium } from "playwright-core";
import fs from "node:fs";

const tag = process.argv[2] || "before";
const outDir = `/tmp/shots-${tag}`;
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

async function shot(name) {
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${outDir}/${name}.png` });
}

await page.goto("http://localhost:4173/#/");
await shot("01-pos-empty");

// Seed a category + product if none exist (Products tab)
await page.goto("http://localhost:4173/#/products");
await page.waitForTimeout(300);
await shot("02-products-tab");

// Categories tab
await page.getByRole("tab", { name: "Categories" }).click();
await page.waitForTimeout(200);
const catEmpty = await page.locator(".empty-state").count();
if (catEmpty > 0) {
  await page.getByRole("button", { name: /add category/i }).click();
  await page.getByLabel(/name/i).first().fill("Coffee");
  await page.getByRole("button", { name: /^save$/i }).click();
  await page.waitForTimeout(300);
}
await shot("03-categories-tab");

// Payment methods tab
await page.getByRole("tab", { name: "Payment Methods" }).click();
await page.waitForTimeout(200);
await shot("04-payment-methods-tab");

// Products tab - add a product if empty
await page.getByRole("tab", { name: "Products" }).click();
await page.waitForTimeout(200);
const prodEmpty = await page.locator(".empty-state").count();
if (prodEmpty > 0) {
  await page.getByRole("button", { name: /add product/i }).click();
  await page.getByLabel(/name/i).first().fill("Iced Latte");
  await page.getByLabel(/price/i).first().fill("120");
  await page.getByRole("button", { name: /^save$/i }).click();
  await page.waitForTimeout(300);
}
await shot("05-products-tab-filled");

// Backup tab
await page.getByRole("tab", { name: "Backup" }).click();
await page.waitForTimeout(200);
await shot("06-backup-tab");

// POS with a product
await page.goto("http://localhost:4173/#/");
await page.waitForTimeout(300);
await shot("07-pos-filled");

const tile = page.locator(".product-tile").first();
if (await tile.count()) {
  await tile.click();
  await page.waitForTimeout(200);
  await shot("08-pos-with-floating-bar");
  await page.locator(".pos-floating-bar").click();
  await page.waitForTimeout(300);
  await shot("09-pos-cart-sheet");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

// History
await page.goto("http://localhost:4173/#/history");
await page.waitForTimeout(300);
await shot("10-history");

// Reports
await page.goto("http://localhost:4173/#/reports");
await page.waitForTimeout(300);
await shot("11-reports");

await browser.close();
console.log("done", outDir);
