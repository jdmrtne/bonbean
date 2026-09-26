Project:
Coffee Cart POS

Current Phase:
PHASE 1 — Database + Product Management

Status:
COMPLETE

Completed:

* Real IndexedDB schema built (DB_VERSION 2): products, categories, paymentMethods, sales, saleItems, settings — with indexes on products.categoryId, products.active, categories.sortOrder, paymentMethods.sortOrder, sales.date, saleItems.saleId, saleItems.productId
* Migration from the Phase 0 placeholder schema handled in db.ts's upgrade() callback
* Default data seeded on first run: 5 payment methods (Cash, GCash, Maya, Bank Transfer, Other) and default settings (businessName "My Coffee Cart", currency "₱")
* CRUD services added: productsService, categoriesService, paymentMethodsService, settingsService — components never touch IndexedDB directly
* Product Management UI built at /products, replacing the Phase 0 placeholder, with 3 segmented tabs: Products, Categories, Payment Methods
* Products: add, edit (name/category/price/photo), deactivate, reactivate — deactivating is a soft toggle, never a hard delete, so historical sales stay intact
* Categories: add, edit, activate/deactivate, reorder (up/down)
* Payment methods: add, edit, activate/deactivate, reorder (up/down)
* Optional product photo upload, stored as a base64 data URL directly in IndexedDB (no file-system/network dependency, works offline)
* Reusable Modal component added for all add/edit forms
* Currency formatting helper (utils/money.ts) using the seeded currency symbol
* Headless data-layer smoke test added (scripts/smoke-test-db.ts, run via `npm run smoke-test`) using fake-indexeddb, since this environment has no headed browser — verifies schema creation, seeding, and all CRUD paths against the real db.ts/services code
* `npm run build` (tsc -b + vite build) succeeds with no errors
* `npx oxlint` passes with 0 errors (3 expected warnings about setState-in-effect for the standard "load from IndexedDB on mount" pattern — see HANDOFF.md)
* Confirmed the other 3 pages (POS, History, Reports) are byte-for-byte unchanged from Phase 0

Current functionality:

* Owner can open the Products tab and manage products, categories, and payment methods end to end
* Data persists in IndexedDB across reloads (verified via the smoke test; not yet verified by a human clicking "refresh" in a real browser)
* POS, History, and Reports tabs still show their Phase 0 placeholders — no cart or sales logic exists yet

Known bugs:

* None found in this phase's own scope.
* Still not verified in an actual headed browser or mobile device — see "Known Issues" in HANDOFF.md for exactly what has and hasn't been checked.
* No confirmation dialog before deactivating a product/category/payment method. This was a deliberate choice (deactivating is reversible, unlike the delete-with-confirmation flow required for sales in Phase 4), documented in HANDOFF.md — flagging here in case Phase 9 polish wants to reconsider.

Next phase:

PHASE 2 — POS + Cart
