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

  // 4. Settings update
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
