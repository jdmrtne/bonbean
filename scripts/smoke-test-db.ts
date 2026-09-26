// Dev-only smoke test. Not part of the app bundle or build.
// Run with: npx tsx scripts/smoke-test-db.ts
//
// Exercises the actual src/database + src/services modules against
// fake-indexeddb, since this sandboxed environment has no headed browser
// to click through the real UI in. This is a stand-in for manual QA, not
// a replacement for it — see HANDOFF.md Testing Status.

import "fake-indexeddb/auto";

async function main() {
  const { getDB } = await import("../src/database/db");
  const { addCategory, listCategories } = await import("../src/services/categoriesService");
  const { addPaymentMethod, listPaymentMethods, updatePaymentMethod } = await import(
    "../src/services/paymentMethodsService"
  );
  const { addProduct, listProducts, updateProduct, setProductActive } = await import(
    "../src/services/productsService"
  );
  const { getSettings, updateSettings } = await import("../src/services/settingsService");

  const assert = (cond: unknown, msg: string) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
    console.log(`ok - ${msg}`);
  };

  // 1. DB opens and seeds defaults
  await getDB();
  const methods = await listPaymentMethods();
  assert(methods.length === 5, "5 default payment methods seeded");
  assert(methods[0].name === "Cash", "Cash is the first default payment method");
  assert(methods[0].isCash === true, "the default Cash method has isCash = true");
  assert(
    methods.slice(1).every((m) => m.isCash === false),
    "every other default payment method has isCash = false",
  );

  const settings = await getSettings();
  assert(settings.currency === "₱", "default currency seeded as ₱");

  // 2. Categories CRUD
  const drinks = await addCategory({ name: "Drinks" });
  const snacks = await addCategory({ name: "Snacks" });
  const categories = await listCategories();
  assert(categories.length === 2, "2 categories exist after adding 2");
  assert(categories[0].id === drinks.id && categories[1].id === snacks.id, "categories keep insertion sortOrder");

  // 3. Products CRUD + price snapshot independence
  const latte = await addProduct({ name: "Iced Latte", categoryId: drinks.id, price: 120 });
  let products = await listProducts();
  assert(products.length === 1, "1 product exists after adding 1");
  assert(products[0].price === 120, "product price stored correctly");

  await updateProduct(latte.id, { price: 150 });
  products = await listProducts();
  assert(products[0].price === 150, "product price updates correctly");

  await setProductActive(latte.id, false);
  const activeOnly = await listProducts(false);
  assert(activeOnly.length === 0, "deactivated product excluded when includeInactive=false");
  const allProducts = await listProducts(true);
  assert(allProducts.length === 1, "deactivated product still present when includeInactive=true");

  // 4. Sales recording + price/name snapshot independence (PHASE 3)
  const { recordSale } = await import("../src/services/salesService");
  const croissant = await addProduct({ name: "Croissant", categoryId: snacks.id, price: 85 });

  const sale = await recordSale({
    lines: [
      { productId: latte.id, name: "Iced Latte", unitPrice: 150, quantity: 2 },
      { productId: croissant.id, name: croissant.name, unitPrice: croissant.price, quantity: 1 },
    ],
    paymentMethod: "Cash",
    amountReceived: 500,
    change: 500 - (150 * 2 + 85),
  });

  assert(sale.total === 150 * 2 + 85, "sale total is the sum of line totals");
  assert(sale.items.length === 2, "sale has one SaleItem per cart line");
  assert(sale.change === 500 - (150 * 2 + 85), "change = amountReceived - total");

  const db = await getDB();
  const storedSale = await db.get("sales", sale.id);
  assert(storedSale !== undefined, "sale persisted in the sales store");
  const storedItems = await db.getAllFromIndex("saleItems", "by-saleId", sale.id);
  assert(storedItems.length === 2, "both sale items persisted in the flat saleItems store");

  // Now change the croissant's price AFTER the sale — the saved sale must
  // keep showing what the customer actually paid, not the new price.
  await updateProduct(croissant.id, { price: 95 });
  const reReadSale = await db.get("sales", sale.id);
  const reReadItem = reReadSale?.items.find((i) => i.productId === croissant.id);
  assert(reReadItem?.unitPriceSnapshot === 85, "SaleItem price snapshot unchanged after product price update");
  assert((await db.get("products", croissant.id))?.price === 95, "live product price did update (snapshot is independent, not stale data)");

  // 5. Sales history: listSales + deleteSale (PHASE 4)
  const { listSales, deleteSale } = await import("../src/services/salesService");

  const secondSale = await recordSale({
    lines: [{ productId: latte.id, name: "Iced Latte", unitPrice: 150, quantity: 1 }],
    paymentMethod: "GCash",
  });

  const allSales = await listSales();
  assert(allSales.length === 2, "listSales returns both recorded sales");
  assert(allSales[0].id === secondSale.id, "listSales sorts most-recent-first");

  await deleteSale(sale.id);
  const afterDelete = await listSales();
  assert(afterDelete.length === 1, "deleteSale removes exactly one sale");
  assert(afterDelete[0].id === secondSale.id, "the untouched sale is still present after delete");

  const deletedSaleRecord = await db.get("sales", sale.id);
  assert(deletedSaleRecord === undefined, "deleted sale's record is gone from the sales store");
  const orphanedItems = await db.getAllFromIndex("saleItems", "by-saleId", sale.id);
  assert(orphanedItems.length === 0, "deleted sale's saleItems are also gone (no orphans)");
  const survivingItems = await db.getAllFromIndex("saleItems", "by-saleId", secondSale.id);
  assert(survivingItems.length === 1, "the untouched sale's saleItems are still present");

  // 6. Settings update
  await updateSettings({ businessName: "Test Cart" });
  const updated = await getSettings();
  assert(updated.businessName === "Test Cart", "settings update persists");
  assert(updated.currency === "₱", "settings update doesn't clobber other fields");

  // 7. Report stats: date-range resolution + aggregation (PHASE 5)
  //
  // This is the one section of this file that never touches IndexedDB —
  // utils/reportStats.ts is deliberately dependency-free (see its header
  // comment), so it's tested directly against hand-built Sale[] fixtures
  // rather than through recordSale/listSales. A fixed `now` is passed to
  // resolveDateRange throughout so these assertions never depend on the
  // date this script happens to run.
  const {
    resolveDateRange,
    filterSalesByRange,
    computeSalesStats,
    computeProductPerformance,
    topProductsByQuantity,
    topProductsByRevenue,
  } = await import("../src/utils/reportStats");

  const now = new Date(2026, 2, 18); // Wed 2026-03-18, arbitrary fixed date

  assert(
    JSON.stringify(resolveDateRange("today", undefined, now)) ===
      JSON.stringify({ start: "2026-03-18", end: "2026-03-18" }),
    "resolveDateRange('today')",
  );
  assert(
    JSON.stringify(resolveDateRange("yesterday", undefined, now)) ===
      JSON.stringify({ start: "2026-03-17", end: "2026-03-17" }),
    "resolveDateRange('yesterday')",
  );
  assert(
    JSON.stringify(resolveDateRange("last7", undefined, now)) ===
      JSON.stringify({ start: "2026-03-12", end: "2026-03-18" }),
    "resolveDateRange('last7') is 7 days inclusive of today",
  );
  assert(
    JSON.stringify(resolveDateRange("thisMonth", undefined, now)) ===
      JSON.stringify({ start: "2026-03-01", end: "2026-03-18" }),
    "resolveDateRange('thisMonth') runs from the 1st through today",
  );
  assert(
    JSON.stringify(resolveDateRange("lastMonth", undefined, now)) ===
      JSON.stringify({ start: "2026-02-01", end: "2026-02-28" }),
    "resolveDateRange('lastMonth') is the full previous calendar month",
  );
  assert(
    JSON.stringify(resolveDateRange("lastMonth", undefined, new Date(2026, 0, 10))) ===
      JSON.stringify({ start: "2025-12-01", end: "2025-12-31" }),
    "resolveDateRange('lastMonth') crosses a year boundary correctly",
  );
  assert(
    JSON.stringify(resolveDateRange("custom", { start: "2026-01-05", end: "2026-01-01" }, now)) ===
      JSON.stringify({ start: "2026-01-01", end: "2026-01-05" }),
    "resolveDateRange('custom') swaps a reversed start/end instead of returning an empty range",
  );

  const reportSales = [
    {
      ...secondSale,
      date: "2026-03-18",
      total: 200,
      paymentMethod: "Cash",
      items: [
        { ...secondSale.items[0], productNameSnapshot: "Iced Latte", quantity: 2, lineTotal: 200 },
      ],
    },
    {
      ...secondSale,
      id: "report-fixture-2",
      date: "2026-03-17",
      total: 250,
      paymentMethod: "GCash",
      items: [
        { ...secondSale.items[0], productNameSnapshot: "Croissant", quantity: 5, lineTotal: 250 },
      ],
    },
    {
      ...secondSale,
      id: "report-fixture-3",
      date: "2026-03-10", // outside the last7 window used below
      total: 100,
      paymentMethod: "Cash",
      items: [
        { ...secondSale.items[0], productNameSnapshot: "Iced Latte", quantity: 1, lineTotal: 100 },
      ],
    },
  ];

  const last7Range = resolveDateRange("last7", undefined, now);
  const last7Sales = filterSalesByRange(reportSales, last7Range);
  assert(last7Sales.length === 2, "filterSalesByRange excludes the out-of-range fixture sale");

  const last7Stats = computeSalesStats(last7Sales);
  assert(last7Stats.total === 450, "computeSalesStats total matches the two in-range sales");
  assert(last7Stats.transactionCount === 2, "computeSalesStats transactionCount");
  assert(last7Stats.itemsSold === 7, "computeSalesStats itemsSold");
  assert(last7Stats.averageSale === 225, "computeSalesStats averageSale");
  assert(
    last7Stats.paymentBreakdown[0][0] === "GCash" && last7Stats.paymentBreakdown[0][1] === 250,
    "computeSalesStats paymentBreakdown sorted descending by total",
  );
  assert(computeSalesStats([]).averageSale === 0, "computeSalesStats averageSale is 0 (not NaN) for an empty range");

  const allRange = resolveDateRange("thisMonth", undefined, now);
  const monthSales = filterSalesByRange(reportSales, allRange);
  const perf = computeProductPerformance(monthSales);
  const latteRow = perf.find((p) => p.name === "Iced Latte");
  assert(latteRow?.quantity === 3, "computeProductPerformance sums quantity across sales");
  assert(latteRow?.revenue === 300, "computeProductPerformance sums revenue across sales");

  const byQty = topProductsByQuantity(perf, 5);
  const byRev = topProductsByRevenue(perf, 5);
  assert(byQty[0].name === "Croissant", "topProductsByQuantity ranks Croissant (5) above Iced Latte (3)");
  assert(byRev[0].name === "Iced Latte", "topProductsByRevenue ranks Iced Latte (300) above Croissant (250)");

  // 8. CSV export (PHASE 6)
  //
  // Like section 7, this never touches IndexedDB — utils/salesExport.ts
  // (and the utils/csv.ts it builds on) are dependency-free, taking
  // Sale[] as a plain parameter. Covers CSV escaping edge cases and the
  // one-row-per-line-item shaping decision documented in
  // utils/salesExport.ts's header comment. The actual file-download step
  // (utils/download.ts) is browser-only DOM/Blob API and isn't covered
  // here, same as every other browser-only helper in this project — see
  // HANDOFF.md's Testing Status for what a manual click-through still
  // needs to confirm (opening the downloaded CSV and checking its
  // contents against the app).
  const { escapeCsvField, rowsToCsv, buildTransactionLineRows, transactionRowsToCsv, buildExportFilename } =
    await import("../src/utils/salesExport");

  assert(escapeCsvField("plain") === "plain", "escapeCsvField leaves a plain field untouched");
  assert(escapeCsvField("a,b") === '"a,b"', "escapeCsvField quotes a field containing a comma");
  assert(escapeCsvField('say "hi"') === '"say ""hi"""', "escapeCsvField doubles internal quotes");
  assert(escapeCsvField("line1\nline2") === '"line1\nline2"', "escapeCsvField quotes a field containing a newline");

  const csvSample = rowsToCsv(["A", "B"], [["1", "2"], ["x,y", 3]]);
  assert(
    csvSample === 'A,B\r\n1,2\r\n"x,y",3',
    "rowsToCsv joins header + rows with CRLF line endings and escapes fields as needed",
  );

  // A multi-item sale with a comma in its notes, to exercise row-shaping
  // and CSV escaping together against one realistic fixture.
  const multiItemSale = {
    ...secondSale,
    id: "export-fixture-1",
    date: "2026-03-18",
    total: 235,
    paymentMethod: "Cash",
    notes: "regular, no sugar",
    items: [
      {
        ...secondSale.items[0],
        productNameSnapshot: "Iced Latte",
        quantity: 1,
        unitPriceSnapshot: 150,
        lineTotal: 150,
      },
      {
        ...secondSale.items[0],
        id: "export-item-2",
        productNameSnapshot: "Croissant",
        quantity: 1,
        unitPriceSnapshot: 85,
        lineTotal: 85,
      },
    ],
  };

  const exportRows = buildTransactionLineRows([multiItemSale]);
  assert(exportRows.length === 2, "buildTransactionLineRows produces one row per line item, not one per sale");
  assert(
    exportRows[0].saleTotal === 235 && exportRows[1].saleTotal === 235,
    "every row from the same sale repeats that sale's saleTotal",
  );
  assert(
    exportRows[0].saleId === exportRows[1].saleId,
    "rows from the same sale share a saleId, so the original transaction is regroupable",
  );

  const exportCsv = transactionRowsToCsv(exportRows);
  const csvLines = exportCsv.split("\r\n");
  assert(csvLines.length === 3, "transactionRowsToCsv emits one header line plus one line per row");
  assert(
    csvLines[0] === "Date,Time,Sale ID,Payment method,Product,Unit price,Quantity,Line total,Sale total,Notes",
    "transactionRowsToCsv header matches the documented column order",
  );
  assert(csvLines[1].includes('"regular, no sugar"'), "a note containing a comma is quoted in the CSV output");
  assert(
    csvLines[1].includes("150.00") && csvLines[2].includes("85.00"),
    "unit/line amounts are formatted with 2 decimals and no currency symbol",
  );

  assert(
    buildExportFilename({ start: "2026-03-18", end: "2026-03-18" }, "csv") === "sales-report_2026-03-18.csv",
    "buildExportFilename collapses a single-day range to one date",
  );
  assert(
    buildExportFilename({ start: "2026-03-01", end: "2026-03-18" }, "csv") ===
      "sales-report_2026-03-01_to_2026-03-18.csv",
    "buildExportFilename spells out a multi-day range",
  );

  // 9. Backup + Restore (PHASE 7)
  //
  // Two halves, matching backupService.ts/utils/backup.ts's split:
  //   - utils/backup.ts's validateBackupFile/serializeBackup/
  //     buildBackupFilename are dependency-free (like section 7/8's
  //     modules) and tested directly against hand-built payloads.
  //   - backupService.ts's buildBackupFile/restoreBackup DO touch
  //     IndexedDB (via getDB()), so — unlike sections 7/8 — they're
  //     exercised here against the real db/fake-indexeddb, the same way
  //     sections 1-6 test productsService.ts/salesService.ts.
  const { BACKUP_FORMAT_VERSION, validateBackupFile, serializeBackup, buildBackupFilename } =
    await import("../src/utils/backup");
  const { buildBackupFile, restoreBackup } = await import("../src/services/backupService");

  // -- Pure validation/serialization --
  const validBackupFixture = {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: "2026-03-18T10:00:00.000Z",
    products: [
      { id: "fx-p1", name: "Latte", categoryId: "fx-c1", price: 120, active: true, createdAt: "x", updatedAt: "x" },
    ],
    categories: [{ id: "fx-c1", name: "Drinks", active: true, sortOrder: 0 }],
    paymentMethods: [{ id: "fx-m1", name: "Cash", active: true, sortOrder: 0 }],
    sales: [] as unknown[],
    saleItems: [] as unknown[],
    settings: { businessName: "Fixture Cart", currency: "₱" },
  };

  const validResult = validateBackupFile(validBackupFixture);
  assert(validResult.valid === true, "validateBackupFile accepts a well-formed backup");

  assert(validateBackupFile(null).valid === false, "validateBackupFile rejects null");
  assert(
    validateBackupFile({ ...validBackupFixture, formatVersion: 99 }).valid === false,
    "validateBackupFile rejects an unknown formatVersion",
  );
  assert(
    validateBackupFile({ ...validBackupFixture, products: "nope" }).valid === false,
    "validateBackupFile rejects a non-array products field",
  );
  assert(
    validateBackupFile({ ...validBackupFixture, settings: { businessName: "X" } }).valid === false,
    "validateBackupFile rejects settings missing currency",
  );

  const roundTripped = JSON.parse(serializeBackup(validBackupFixture as never));
  assert(
    validateBackupFile(roundTripped).valid === true,
    "a serialized-then-reparsed backup still validates",
  );

  assert(
    buildBackupFilename(new Date(2026, 2, 18)) === "coffee-cart-backup_2026-03-18.json",
    "buildBackupFilename uses the date-stamped naming convention",
  );

  // -- Real IndexedDB round-trip: build a backup of the db's CURRENT
  // state (already populated by sections 1-6 above), then restore it and
  // confirm the db matches afterward. --
  const backupBeforeRestore = await buildBackupFile();
  assert(
    backupBeforeRestore.formatVersion === BACKUP_FORMAT_VERSION,
    "buildBackupFile stamps the current format version",
  );
  const salesBeforeBackup = await listSales();
  assert(
    backupBeforeRestore.sales.length === salesBeforeBackup.length,
    "buildBackupFile's sales count matches listSales()",
  );

  // Mutate the live db AFTER taking the backup, so restoring it is a real
  // (not no-op) round-trip: add an extra product, then restore.
  const extraProduct = await addProduct({ name: "Muffin", categoryId: snacks.id, price: 70 });
  const productsAfterExtra = await listProducts();
  assert(
    productsAfterExtra.some((p) => p.id === extraProduct.id),
    "sanity check: the extra product exists before restoring",
  );

  await restoreBackup(backupBeforeRestore);

  const productsAfterRestore = await listProducts();
  assert(
    !productsAfterRestore.some((p) => p.id === extraProduct.id),
    "restoreBackup replaces products — the post-backup addition is gone",
  );
  assert(
    productsAfterRestore.length === backupBeforeRestore.products.length,
    "restoreBackup's product count matches the backup exactly",
  );

  const salesAfterRestore = await listSales();
  assert(
    salesAfterRestore.length === backupBeforeRestore.sales.length,
    "restoreBackup's sales count matches the backup exactly",
  );
  const restoredSecondSale = salesAfterRestore.find((s) => s.id === secondSale.id);
  assert(
    restoredSecondSale?.items[0]?.unitPriceSnapshot === secondSale.items[0].unitPriceSnapshot,
    "restoreBackup writes SaleItem price snapshots back exactly as backed up, not recomputed",
  );

  const settingsAfterRestore = await getSettings();
  assert(
    settingsAfterRestore.businessName === backupBeforeRestore.settings.businessName,
    "restoreBackup restores settings from the backup",
  );

  // 11. Cash payment configuration (PHASE 10)
  // -- isCash now drives cash handling instead of matching the method's
  // name against the literal string "Cash" (see CheckoutModal.tsx and
  // database/db.ts's migration comment). --
  const gcash = methods.find((m) => m.name === "GCash");
  assert(gcash !== undefined, "sanity check: default GCash method exists");
  const customCashMethod = await addPaymentMethod({ name: "Boss's IOU", isCash: true });
  assert(
    customCashMethod.isCash === true,
    "addPaymentMethod respects an explicit isCash: true",
  );
  const defaultedMethod = await addPaymentMethod({ name: "Voucher" });
  assert(
    defaultedMethod.isCash === false,
    "addPaymentMethod defaults isCash to false when omitted",
  );
  if (gcash) {
    await updatePaymentMethod(gcash.id, { isCash: true });
    const methodsAfterFlip = await listPaymentMethods();
    const flippedGcash = methodsAfterFlip.find((m) => m.id === gcash.id);
    assert(
      flippedGcash?.isCash === true,
      "updatePaymentMethod can flip an existing method's isCash on",
    );
  }

  // 12. Cart draft persistence (PHASE 10)
  // -- an in-progress cart is now mirrored to its own `cartDraft` store
  // (services/cartDraftService.ts) so a refresh/reopen restores it; see
  // pages/PosPage.tsx for how the live UI wires this up (not exercised
  // here, since PosPage is a React component — this only covers the
  // persistence layer it calls into). --
  const { getCartDraft, saveCartDraft, clearCartDraft } = await import(
    "../src/services/cartDraftService"
  );
  const emptyDraft = await getCartDraft();
  assert(
    Array.isArray(emptyDraft) && emptyDraft.length === 0,
    "getCartDraft returns an empty array before anything is saved",
  );
  const draftLines = [
    { productId: extraProduct.id, name: "Muffin", unitPrice: 70, quantity: 2 },
  ];
  await saveCartDraft(draftLines);
  const savedDraft = await getCartDraft();
  assert(
    savedDraft.length === 1 && savedDraft[0].quantity === 2,
    "saveCartDraft/getCartDraft round-trips a cart's lines",
  );
  await clearCartDraft();
  const clearedDraft = await getCartDraft();
  assert(clearedDraft.length === 0, "clearCartDraft empties the persisted draft");

  console.log("\nAll smoke tests passed.");

  // 13. Offline + PWA (PHASE 8) — intentionally NOT covered here.
  // public/sw.js, src/pwa/registerServiceWorker.ts, and
  // src/hooks/useOnlineStatus.ts/useServiceWorkerUpdate.ts are all
  // browser-API surface (ServiceWorkerContainer, CacheStorage,
  // navigator.onLine, the online/offline events) with no pure,
  // dependency-free logic to extract — the same reason utils/download.ts
  // (Phase 6) has no smoke-test coverage either. sw.js in particular is
  // plain JS served as a static /public asset, not compiled by this
  // project's tsc/Vite pipeline, so it can't import from src/ or be
  // exercised by a tsx script at all. This is a manual click-through
  // item (see HANDOFF.md "Testing Status"): load the app once online,
  // then go offline and confirm it still loads.
  //
  // Also NOT covered here (PHASE 10): the real DB_VERSION 2 -> 3 upgrade
  // path that backfills `isCash` onto payment methods created before it
  // existed (database/db.ts's upgrade()). Every DB this script opens
  // starts fresh at version 3 (oldVersion 0), so that backfill branch
  // never actually runs above — it was verified by code review only.
  // Exercising a genuine 2 -> 3 upgrade would need a second, separate
  // raw-indexedDB harness that manually creates a v2 database BEFORE
  // this file's very first getDB() call, which conflicts with how every
  // other section here already shares one v3 database end to end. Left
  // as a manual QA item: on a device with real Phase-9-or-earlier data,
  // confirm existing payment methods keep working as expected after
  // upgrading. Likewise not covered: PosPage.tsx's own cart-hydrate-on-
  // mount/persist-on-change wiring (React component, not pure logic) —
  // only the cartDraftService functions it calls are tested in section
  // 12 above.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
