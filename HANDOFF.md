# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 1 — COMPLETE

## Overall Project Progress

```
PHASE 0  — Project Foundation           — COMPLETE
PHASE 1  — Database + Product Mgmt      — COMPLETE
PHASE 2  — POS + Cart                   — NOT STARTED
PHASE 3  — Sales Recording              — NOT STARTED
PHASE 4  — Sales History + Dashboard    — NOT STARTED
PHASE 5  — Reports                      — NOT STARTED
PHASE 6  — Excel + PDF Export           — NOT STARTED
PHASE 7  — Backup + Restore             — NOT STARTED
PHASE 8  — Offline + PWA                — NOT STARTED
PHASE 9  — Polish + Mobile UX           — NOT STARTED
PHASE 10 — Final QA + Release           — NOT STARTED
```

## What Has Been Built

Everything from Phase 0 (app shell, routing, design tokens, reusable UI
primitives, error boundary), **plus**, from Phase 1:

- A real IndexedDB schema (see "Database Structure" below) replacing the
  Phase 0 placeholder, with a working migration path.
- Default data seeded automatically the first time the database is
  created: 5 payment methods and default settings — the owner never sees
  an empty payment-method list at first launch.
- A full data-access layer (`src/services/*Service.ts`) — nothing in the
  UI talks to IndexedDB directly.
- A working Product Management screen at the "Products" tab, with three
  sub-sections (Products / Categories / Payment Methods) switched by a
  segmented control, each with its own add/edit modal form.
- Product photos: optional, stored as base64 data URLs directly in
  IndexedDB (no server, no file system — works offline by construction).
- A headless smoke test (`npm run smoke-test`) that exercises the real
  `db.ts` and service modules end-to-end using `fake-indexeddb`, used in
  this phase as a stand-in for manual browser QA (this sandboxed
  environment has no headed browser — see "Testing Status").

Still not built: the POS/cart screen, sales saving, sales history,
dashboard, reports, exports, backup/restore, offline/PWA support. Those
are Phases 2–8, in order.

## Current Architecture

Unchanged from Phase 0 (React 19 + TypeScript + Vite, `idb` over
IndexedDB, `HashRouter`, plain CSS with design tokens, self-hosted
Manrope font) — see Phase 0's original notes below under "Decisions
Already Made" for why each of those was chosen. Additions this phase:

- **Data layer:** one service module per IndexedDB store
  (`productsService`, `categoriesService`, `paymentMethodsService`,
  `settingsService`). Each exposes plain async functions (`listX`,
  `addX`, `updateX`, `setXActive`) — no classes, no global state
  management library. Components call these directly and manage their own
  local `useState`/`useEffect` for loading/error/refresh, following the
  pattern in `ProductsManager.tsx` / `CategoriesManager.tsx` /
  `PaymentMethodsManager.tsx`. Keep this pattern for `salesService` in
  Phase 3 rather than introducing Redux/Zustand/etc. — the app's data
  needs are simple enough not to need one.
- **Forms:** a shared `Modal` component (`src/components/Modal.tsx`,
  using `createPortal`) hosts all add/edit forms as a bottom sheet on
  mobile / centered dialog on desktop. Reuse it for the cart review step
  in Phase 2 and the payment/amount-received step in Phase 3 if a
  modal fits, rather than building a second modal implementation.
- **Images:** `src/utils/image.ts`'s `fileToDataUrl` converts an
  `<input type="file">` selection to a base64 data URL. This keeps images
  fully offline-safe at the cost of IndexedDB storage size — fine for a
  cart's product catalog (tens of products), but don't reuse this
  approach for anything that could involve many large images.
- **Currency formatting:** `src/utils/money.ts`'s `formatMoney(amount,
  currencySymbol)` — always read the symbol from `settingsService`
  (already seeded to `"₱"`) rather than hardcoding `"₱"` in new code, so a
  future settings screen can let the owner change it.
- **Dev-only smoke test:** `scripts/smoke-test-db.ts`, run via `npm run
  smoke-test`. It imports the real `src/database`/`src/services` modules
  against `fake-indexeddb` (a devDependency) to verify schema/seeding/CRUD
  logic without a browser. It is **not** part of the production bundle —
  `scripts/` is intentionally outside both `tsconfig.app.json` and
  `tsconfig.node.json`'s `include` globs, so it can't affect `tsc -b` or
  the Vite build. Extend this script in later phases (e.g. add a sales
  round-trip test in Phase 3) rather than writing a separate one-off
  script each time — it's cheap insurance given the lack of a headed
  browser in this environment.

## Important Files

Everything listed in Phase 0's original handoff (see git history / prior
version of this file if needed) still applies. New/changed this phase:

`src/database/db.ts`
→ **Rewritten.** Real schema at `DB_VERSION = 2`: products, categories,
paymentMethods, sales, saleItems, settings, with the indexes listed under
"Database Structure" below. The `upgrade()` callback deletes the old
Phase-0 placeholder `settings` store (which never held real data) and
creates all 6 real stores, seeding default payment methods and settings
in the same upgrade transaction. `getDB()` itself is unchanged in shape —
callers don't need to know about the migration.

`src/services/productsService.ts`
→ `listProducts(includeInactive?)`, `listProductsByCategory(categoryId)`,
`getProduct(id)`, `addProduct(input)`, `updateProduct(id, changes)`,
`setProductActive(id, active)`. `updateProduct` always bumps `updatedAt`;
nothing here ever touches past `SaleItem` snapshots (those don't exist
yet — Phase 3 must keep it that way).

`src/services/categoriesService.ts`, `paymentMethodsService.ts`
→ Same CRUD shape as products, plus `moveCategory`/`movePaymentMethod`
for up/down reordering (swaps `sortOrder` with the adjacent item inside a
single IndexedDB transaction).

`src/services/settingsService.ts`
→ `getSettings()` (returns seeded defaults if the store is somehow empty),
`updateSettings(changes)`. No UI reads/writes this yet beyond the seed —
available for Phase 6 (PDF business name) or a future settings screen.

`src/components/ProductsManager.tsx`, `CategoriesManager.tsx`,
`PaymentMethodsManager.tsx`
→ The three list+form UIs shown under the Products tab's segmented
control. Each follows the same shape: load-on-mount via `useEffect`,
local `refresh()` re-fetches after any mutation, an inline modal form
component defined in the same file for add/edit.

`src/components/Modal.tsx`
→ Portal-based modal/bottom-sheet, used by all three managers above.
Closes on Escape or backdrop click.

`src/pages/ProductsPage.tsx`
→ **Rewritten.** Now hosts the segmented control (Products / Categories /
Payment Methods) and renders the matching manager component. No longer a
placeholder.

`src/utils/id.ts`, `money.ts`, `image.ts`
→ Small pure helpers: UUID generation, currency formatting, file→base64.

`scripts/smoke-test-db.ts`
→ Headless data-layer test, see "Current Architecture" above.

## Database Structure

```
products (keyPath: id)
  id, name, categoryId, price, image?, active, createdAt, updatedAt
  indexes: by-categoryId (categoryId), by-active (active)

categories (keyPath: id)
  id, name, active, sortOrder
  index: by-sortOrder (sortOrder)

paymentMethods (keyPath: id)
  id, name, active, sortOrder
  index: by-sortOrder (sortOrder)

sales (keyPath: id)                          ← store exists, unused until Phase 3
  id, date, time, items, total, paymentMethod, amountReceived?, change?, notes?, createdAt
  index: by-date (date)

saleItems (keyPath: id)                      ← store exists, unused until Phase 3
  id, saleId, productId, productNameSnapshot, unitPriceSnapshot, quantity, lineTotal
  indexes: by-saleId (saleId), by-productId (productId)

settings (out-of-line key, single record stored under key "app")
  businessName, currency
```

`DB_NAME = "coffee-cart-pos"`, `DB_VERSION = 2`. `sales`/`saleItems` are
created now (empty) so Phase 3 doesn't need another schema migration —
just start writing to them.

## Completed Features

- Product Management: add / edit / deactivate / reactivate products,
  with category assignment, price, and optional photo
- Category management: add / edit / activate / deactivate / reorder
- Payment method management: add / edit / activate / deactivate /
  reorder, seeded with the 5 defaults from the master spec
- All data persists in IndexedDB (verified via headless smoke test)
- (Carried from Phase 0) responsive app shell, navigation, design system,
  error boundary

## Known Issues

- **Still not verified in a real headed browser or on a mobile device.**
  This phase was verified via: `tsc -b`, `npm run build`, `npx oxlint`,
  serving the build with `vite preview` + `curl` (confirms the app loads
  and returns 200), and a new headless data-layer smoke test
  (`npm run smoke-test`) that exercises the actual database/service code
  against `fake-indexeddb`. None of these substitute for a human clicking
  through the add/edit/deactivate flows, checking the modal's mobile
  layout, or testing the photo picker on a real device — do that before
  or during Phase 2.
- No confirmation dialog before deactivating a product, category, or
  payment method. Deliberate for now (it's reversible, unlike the
  delete-with-confirmation flow required for sales history in Phase 4) —
  see "Decisions Already Made".
- No UI yet for editing `settings` (businessName/currency) — the store and
  service exist and are seeded, just no screen. Not required by Phase 1's
  brief; add one if/when a later phase needs the owner to change it.
- If a product's only category is deactivated, the product isn't
  automatically hidden or reassigned — Phase 2 (POS product grid) should
  decide how to handle a product whose category is inactive (recommend:
  filter it out of the POS grid, same as an inactive product, without
  changing its stored data).

## Decisions Already Made

Carried from Phase 0 (still true, don't change without good reason):
IndexedDB over localStorage; `HashRouter` over `BrowserRouter`; plain CSS
over Tailwind; self-hosted Manrope over a Google Fonts link; the
`SaleItem` snapshot pattern.

New in Phase 1:

- **Soft delete only, everywhere.** Products, categories, and payment
  methods are never hard-deleted — only deactivated (`active: false`).
  This is required by the master spec for products (so historical sales
  keep referencing a real, if inactive, product) and was applied
  consistently to categories and payment methods too, for the same
  reason and for UI consistency. Do not add a hard-delete path for these
  without re-checking this reasoning.
- **No confirmation dialog for deactivation.** Deactivating is a
  one-tap, instantly-reversible toggle, unlike the sales-history deletion
  in Phase 4 (which the master spec explicitly requires a confirmation
  for). Kept deliberately lightweight for a non-technical owner doing
  routine catalog upkeep.
- **Reorder via up/down buttons, not drag-and-drop.** A drag-and-drop
  library is unnecessary complexity for what's usually a handful of
  categories/payment methods; up/down buttons are simpler to implement
  correctly and are still touch-friendly. Revisit only if a real owner
  finds this annoying with a longer list.
- **Product photos as inline base64 data URLs**, not file references or
  a blob store. Simplest thing that (a) works fully offline, (b) survives
  `BACKUP`/`RESTORE` in Phase 7 for free (it's just JSON), and (c) needs
  no additional IndexedDB object store for blobs. Trade-off: larger
  IndexedDB size per product with a photo — acceptable for a small coffee
  cart catalog.
- **`fake-indexeddb` + `tsx` added as devDependencies**, purely to run
  `scripts/smoke-test-db.ts`. Neither ships in the production build
  (`scripts/` is excluded from both tsconfigs, and devDependencies aren't
  bundled by Vite). This is a deliberate stand-in for the manual browser
  QA this sandboxed environment can't perform — keep extending this
  script in future phases rather than trusting build-passes alone.

## DO NOT CHANGE

Everything listed in Phase 0's version of this section (HashRouter,
`SaleItem` snapshot fields, the design tokens, the top-level folder
structure) — still applies. Additionally, as of Phase 1:

- The soft-delete-only pattern for products/categories/payment methods.
- The `products`/`categories`/`paymentMethods`/`sales`/`saleItems`/
  `settings` store names and their keyPaths — Phase 3+ code and this
  handoff both assume these exact names.
- `DB_VERSION` must only ever increase, and every future schema change
  must go through `upgrade()`'s version-gated migration path (following
  the `if (oldVersion < N)` pattern already used) — never edit the
  Phase-1 migration block in place once it has shipped to a real device
  with real data, or that device's upgrade will be skipped.

## Next Phase

**PHASE 2 — POS + Cart.** See `NEXT_PHASE_PROMPT.md` for the exact brief.

## Recommended First Steps

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. Run `npm install && npm run dev`. Add a category, a payment method, and
   a couple of products (with and without a photo) through the Products
   tab; confirm they persist after a refresh. This is real manual QA this
   environment couldn't do — treat it as step zero, not optional.
3. Run `npm run smoke-test` to confirm the data layer still passes after
   your own changes as you go.
4. Read `src/types/index.ts`'s `CartLine` type — it's already shaped for
   the cart you're about to build.
5. Build the POS product grid in `src/pages/PosPage.tsx`, reading
   categories/products via the existing services (filter to `active`
   only, and to categories that are `active`).
6. Build cart state (likely a `useState<CartLine[]>` in `PosPage` or a
   small `useCart` hook in `src/hooks/`) with add/increase/decrease/
   remove/clear and a computed subtotal/total.
7. Build the mobile floating "VIEW ORDER — ₱450" bar and the
   desktop products-left/cart-right layout, per the master spec.
8. Update `PROJECT_STATUS.md`, `HANDOFF.md`, and replace
   `NEXT_PHASE_PROMPT.md` with Phase 3 instructions before stopping.

## Testing Status

| Check | Result |
|---|---|
| `npx tsc -b` (type-check) | ✅ Pass, 0 errors |
| `npm run build` (tsc -b + vite build) | ✅ Pass |
| `npx oxlint` | ✅ Pass, 0 errors (3 expected warnings — see "Current Architecture" note on the load-on-mount pattern) |
| `npm run smoke-test` (headless DB/services test via fake-indexeddb) | ✅ All 12 assertions pass |
| `vite preview` served over HTTP, checked with `curl` | ✅ 200 OK |
| Manual click-through in a real/headed browser | ❌ Still not done — no headed browser available in this environment |
| Real mobile device check | ❌ Still not done |
| Confirmed Phase 0's POS/History/Reports placeholder pages are byte-for-byte unchanged | ✅ Verified with `git diff` against the Phase 0 commit |
