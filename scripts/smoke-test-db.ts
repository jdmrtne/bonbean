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
  const { addPaymentMethod, listPaymentMethods } = await import(
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

  console.log("\nAll smoke tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
