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
  const { openRegister, closeRegister, getOpenSession, listRegisterSessions } = await import(
    "../src/services/registerService"
  );
  const { computeRegisterClosingSummary, filterSalesBySession } = await import(
    "../src/utils/registerStats"
  );

  const assert = (cond: unknown, msg: string) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
    console.log(`ok - ${msg}`);
  };

  // Sales recorded back-to-back in this script can land in the very same
  // millisecond, unlike a real cashier who takes at least a few seconds
  // between transactions — listSales' final tiebreaker is each sale's
  // createdAt timestamp (see salesService.ts), so a tiny delay here keeps
  // "most recent first" assertions meaningful without touching app code.
  const tick = () => new Promise((resolve) => setTimeout(resolve, 2));

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
  assert(sale.orderNumber === "ORD-0001", "first recorded sale gets short Order ID ORD-0001");

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

  await tick();
  const secondSale = await recordSale({
    lines: [{ productId: latte.id, name: "Iced Latte", unitPrice: 150, quantity: 1 }],
    paymentMethod: "GCash",
  });
  assert(secondSale.orderNumber === "ORD-0002", "Order IDs increment sequentially (ORD-0002)");
  // PHASE 11 — cashless payments: GCash/Maya/Bank Transfer/Other (every
  // method with isCash === false) never receives an amountReceived/change
  // from the caller — recordSale must fill these in automatically rather
  // than leaving them undefined.
  assert(
    secondSale.amountReceived === secondSale.total,
    "a cashless sale auto-sets amountReceived to the sale total",
  );
  assert(secondSale.change === 0, "a cashless sale auto-sets change to 0");

  await tick();
  const thirdSale = await recordSale({
    lines: [{ productId: latte.id, name: "Iced Latte", unitPrice: 150, quantity: 1 }],
    paymentMethod: "Maya",
  });
  assert(
    thirdSale.amountReceived === thirdSale.total && thirdSale.change === 0,
    "a second cashless payment method (Maya) also auto-sets amountReceived/change",
  );
  assert(
    thirdSale.orderNumber === "ORD-0003" && thirdSale.id !== secondSale.id,
    "Order IDs keep incrementing and stay unique across sales",
  );

  const allSales = await listSales();
  assert(allSales.length === 3, "listSales returns all three recorded sales");
  assert(allSales[0].id === thirdSale.id, "listSales sorts most-recent-first");

  await deleteSale(sale.id);
  const afterDelete = await listSales();
  assert(afterDelete.length === 2, "deleteSale removes exactly one sale");
  assert(afterDelete[0].id === thirdSale.id, "the untouched sales are still present after delete");

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
    csvLines[0] === "Date,Time,Order ID,Payment method,Product,Unit price,Quantity,Line total,Order total,Notes",
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

  // 8b. Orders Summary + OVERALL TOTAL (PHASE 11)
  //
  // buildOrderSummaryRows/computeOverallTotal/buildSalesReportCsv all
  // take Sale[] directly (same dependency-free discipline as the rest of
  // this module), so — like multiItemSale above — a second, single-item
  // fixture sale exercises the "one row per ORDER, never per item" shape
  // without touching IndexedDB.
  const { buildOrderSummaryRows, computeOverallTotal, orderSummaryRowsToCsv, buildSalesReportCsv } =
    await import("../src/utils/salesExport");

  const singleItemSale = {
    ...secondSale,
    id: "export-fixture-2",
    orderNumber: "ORD-0099",
    date: "2026-03-18",
    total: 120,
    paymentMethod: "Cash",
    amountReceived: 150,
    change: 30,
    items: [
      {
        ...secondSale.items[0],
        id: "export-item-3",
        productNameSnapshot: "Latte",
        quantity: 1,
        unitPriceSnapshot: 120,
        lineTotal: 120,
      },
    ],
  };

  const summaryRows = buildOrderSummaryRows([multiItemSale, singleItemSale]);
  assert(
    summaryRows.length === 2,
    "buildOrderSummaryRows produces exactly one row per ORDER, regardless of item count",
  );
  assert(
    summaryRows[0].itemCount === 2 && summaryRows[0].totalQty === 2,
    "a multi-product order's summary row reports its own item/qty counts, not per-item duplicates",
  );
  assert(
    summaryRows[0].orderTotal === 235 && summaryRows[1].orderTotal === 120,
    "each order's summary row carries its own order total exactly once",
  );

  const overallTotal = computeOverallTotal([multiItemSale, singleItemSale]);
  assert(
    overallTotal === 235 + 120,
    "computeOverallTotal sums every order's total exactly once (no per-item double-counting)",
  );
  assert(
    computeOverallTotal([multiItemSale]) === 235,
    "computeOverallTotal on a single order equals that order's own total",
  );

  const summaryCsv = orderSummaryRowsToCsv([multiItemSale, singleItemSale]);
  const summaryCsvLines = summaryCsv.split("\r\n");
  assert(
    summaryCsvLines[0] ===
      "Order ID,Date,Time,Items,Total qty,Payment method,Amount received,Change,Order total",
    "orderSummaryRowsToCsv header matches the documented Orders Summary columns",
  );
  assert(
    summaryCsvLines.length === 1 + 2 + 2,
    "orderSummaryRowsToCsv emits: header + one row per order + a separator row + an OVERALL TOTAL row",
  );
  const overallTotalLine = summaryCsvLines[summaryCsvLines.length - 1];
  assert(
    overallTotalLine.includes("OVERALL TOTAL") && overallTotalLine.includes((235 + 120).toFixed(2)),
    "the last row is a clearly labeled OVERALL TOTAL row carrying the summed total",
  );
  assert(
    summaryCsvLines[summaryCsvLines.length - 2].split(",").every((cell) => cell === "---"),
    "a separator row visually sets the OVERALL TOTAL row apart from ordinary order rows",
  );

  const fullReportCsv = buildSalesReportCsv([multiItemSale, singleItemSale]);
  assert(
    fullReportCsv.includes("Order Items") && fullReportCsv.includes("Orders Summary"),
    "buildSalesReportCsv includes both the Order Items and Orders Summary sections",
  );
  assert(
    fullReportCsv.indexOf("Order Items") < fullReportCsv.indexOf("Orders Summary"),
    "the Order Items section comes before the Orders Summary section",
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
    buildBackupFilename(new Date(2026, 2, 18)) === "bon-and-bean-backup_2026-03-18.json",
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
  assert(
    restoredSecondSale?.orderNumber === secondSale.orderNumber,
    "restoreBackup preserves a restored sale's existing Order ID exactly",
  );

  // PHASE 11 — Order ID sequence resync: after restoring a backup whose
  // highest restored Order ID is ORD-0003 (secondSale=ORD-0002,
  // thirdSale=ORD-0003 — `sale`/ORD-0001 was deleted before this backup
  // was taken), the very next sale recorded must continue from there
  // (ORD-0004), never collide with a restored order, and never regress
  // to an old count from before the restore.
  await tick();
  const saleAfterRestore = await recordSale({
    lines: [{ productId: latte.id, name: "Iced Latte", unitPrice: 150, quantity: 1 }],
    paymentMethod: "Cash",
    amountReceived: 150,
    change: 0,
  });
  assert(
    saleAfterRestore.orderNumber === "ORD-0004",
    "the Order ID sequence resyncs on restore and continues from the highest restored order number",
  );
  assert(
    !salesAfterRestore.some((s) => s.orderNumber === saleAfterRestore.orderNumber),
    "the post-restore sale's Order ID never collides with a restored sale's Order ID",
  );

  const settingsAfterRestore = await getSettings();
  assert(
    settingsAfterRestore.businessName === backupBeforeRestore.settings.businessName,
    "restoreBackup restores settings from the backup",
  );

  // PHASE 12 — registerSessions is optional (see utils/backup.ts's
  // comment): a malformed one is still rejected, but an old-format
  // fixture with no registerSessions key at all (validBackupFixture
  // above) already validated fine — confirming that path here too.
  assert(
    validateBackupFile({ ...validBackupFixture, registerSessions: "nope" }).valid === false,
    "validateBackupFile rejects a non-array registerSessions field when present",
  );
  assert(
    validateBackupFile({
      ...validBackupFixture,
      registerSessions: [{ id: "fx-r1", openingFund: 500, openedAt: "2026-03-18T09:00:00.000Z" }],
    }).valid === true,
    "validateBackupFile accepts a well-formed registerSessions section",
  );

  // Real round trip, same "mutate the live db AFTER taking the backup"
  // pattern as the products/sales checks above: open a session, back it
  // up while still open, close it, then restore and confirm the backup
  // brings the OPEN session back exactly as it was when backed up.
  const tempRegisterSession = await openRegister(500);
  const backupWithSession = await buildBackupFile();
  assert(
    backupWithSession.registerSessions.some((s) => s.id === tempRegisterSession.id),
    "buildBackupFile includes register sessions",
  );
  await closeRegister(tempRegisterSession.id, 500);
  assert(
    (await getOpenSession()) === null,
    "sanity check: the session is closed before restoring the backup that captured it open",
  );
  await restoreBackup(backupWithSession);
  const reopenedFromBackup = await getOpenSession();
  assert(
    reopenedFromBackup !== null &&
      reopenedFromBackup.id === tempRegisterSession.id &&
      reopenedFromBackup.closedAt === undefined,
    "restoreBackup brings back a register session exactly as it was when backed up (still open)",
  );
  // Close it again so later sections (register open/close, below) start
  // from a clean slate, same as every other store this round-trip touched.
  await closeRegister(tempRegisterSession.id, 500);
  assert(
    (await getOpenSession()) === null,
    "register session closed again after the backup round-trip check",
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

  // 13. Register open/close with a Cash Fund (PHASE 12)
  assert((await getOpenSession()) === null, "no register session is open before one is created");

  const registerSession = await openRegister(2000);
  assert(registerSession.openingFund === 2000, "openRegister stores the opening cash fund");
  assert(registerSession.closedAt === undefined, "a freshly opened session has no closedAt");

  const reopened = await getOpenSession();
  assert(
    reopened !== null && reopened.id === registerSession.id,
    "getOpenSession returns the session just opened",
  );

  let openTwiceFailed = false;
  try {
    await openRegister(500);
  } catch {
    openTwiceFailed = true;
  }
  assert(openTwiceFailed, "openRegister refuses to open a second session while one is open");

  await tick();
  const gcashForRegister = methods.find((m) => m.name === "GCash")!;
  await recordSale({
    lines: [{ productId: latte.id, name: "Iced Latte", unitPrice: 120, quantity: 1 }],
    paymentMethod: "Cash",
    amountReceived: 120,
    change: 0,
  });
  await tick();
  await recordSale({
    lines: [{ productId: latte.id, name: "Iced Latte", unitPrice: 120, quantity: 1 }],
    paymentMethod: gcashForRegister.name,
  });

  const allSalesForRegister = await listSales();
  const shiftSales = filterSalesBySession(allSalesForRegister, registerSession);
  assert(
    shiftSales.length === 2,
    "filterSalesBySession scopes to sales recorded during the open session",
  );

  // Physical count of 2240 = 2000 opening fund + 120 cash sale + 120
  // over/short slack, so Cash Sales (2240 - 2000 = 240) intentionally
  // does NOT equal the single ₱120 cash sale actually recorded above —
  // this proves cashSales comes from the physical count, not from
  // summing cash-tagged sales, exactly per the brief's formula.
  const summary = computeRegisterClosingSummary(shiftSales, methods, registerSession.openingFund, 2240);
  assert(summary.cashSales === 240, "Cash Sales = Physical Cash Counted - Opening Cash Fund");
  assert(
    summary.nonCashBreakdown.some(([name, total]) => name === "GCash" && total === 120),
    "non-cash payment methods are broken out by name with their own shift total",
  );
  assert(
    summary.totalSales === summary.cashSales + 120,
    "Total Sales = Cash Sales + every non-cash payment method's total",
  );
  assert(
    !summary.nonCashBreakdown.some(([name]) => name === "Cash"),
    "the Cash payment method itself never appears in the non-cash breakdown",
  );
  assert(
    summary.recordedCashSales === 120 && summary.cashVariance === 120,
    "recordedCashSales/cashVariance compare the counted cash against the receipts, informationally only",
  );

  const closed = await closeRegister(registerSession.id, 2240);
  assert(closed.closedAt !== undefined, "closeRegister stamps closedAt");
  assert(closed.physicalCashCounted === 2240, "closeRegister stores the physical cash counted");
  assert((await getOpenSession()) === null, "no session is open immediately after closing");

  let closeTwiceFailed = false;
  try {
    await closeRegister(registerSession.id, 100);
  } catch {
    closeTwiceFailed = true;
  }
  assert(closeTwiceFailed, "closeRegister refuses to close an already-closed session");

  const sessionHistory = await listRegisterSessions();
  assert(
    sessionHistory.length === 2 && sessionHistory[0].id === registerSession.id,
    "listRegisterSessions returns every session, most-recent-first (the backup-roundtrip session from earlier, then this one)",
  );

  console.log("\nAll smoke tests passed.");

  // 14. Offline + PWA (PHASE 8) — intentionally NOT covered here.
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
  //
  // Also NOT covered here (PHASE 11): the real DB_VERSION 3 -> 4 upgrade
  // path that backfills `orderNumber` onto sales created before it
  // existed (database/db.ts's upgrade(), oldVersion < 4 branch). Every
  // DB this script opens starts fresh at version 4, so every sale
  // recorded above already goes through recordSale's own orderNumber
  // assignment (exercised throughout section 4/5) rather than that
  // migration's backfill loop. Left as a manual QA item, same as the
  // 2 -> 3 upgrade above: on a device with real pre-Phase-11 data,
  // confirm every existing sale gets a sensible, uniquely-numbered
  // ORD-#### after upgrading, and that a newly recorded sale continues
  // the sequence rather than restarting it.
  //
  // Also NOT covered here (PHASE 12): the real DB_VERSION 4 -> 5 upgrade
  // path that creates the new `registerSessions` store (database/db.ts's
  // upgrade(), oldVersion < 5 branch) — every DB this script opens
  // starts fresh at version 5, so that branch's object-store-creation
  // code runs, but there's no pre-existing data for it to migrate (it
  // backfills nothing, by design — see that branch's comment). Left as a
  // manual QA item, same as the migrations above: on a device with real
  // pre-Phase-12 data, confirm the POS now asks for an Opening Cash Fund
  // before the first sale after upgrading.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
