# CONTINUE COFFEE CART POS DEVELOPMENT

You are continuing an existing Coffee Cart POS project.

DO NOT rebuild the application from scratch.

First:

1. Read README.md
2. Read PROJECT_STATUS.md
3. Read HANDOFF.md
4. Read this file (NEXT_PHASE_PROMPT.md)
5. Inspect the existing source code, especially `src/types/index.ts` and
   `src/database/db.ts`
6. Run `npm install && npm run dev`, and click through all 4 tabs
   (POS / History / Reports / Products) at both a mobile width and a
   desktop width, to confirm the existing shell works before changing
   anything. (This has not yet been visually confirmed in a headed browser
   — see "Testing Status" in HANDOFF.md.)

Current phase:

PHASE 1

Previous phases completed:

PHASE 0 — Project Foundation

Your task is to implement:

## PHASE 1 — DATABASE + PRODUCT MANAGEMENT

Build the real data layer, replacing the Phase 0 placeholder in
`src/database/db.ts`.

Create IndexedDB object stores for:

- `products` — id, name, categoryId, price, image, active, createdAt, updatedAt
- `categories` — id, name, active, sortOrder
- `paymentMethods` — id, name, active, sortOrder
- `sales` — id, date, time, items, total, paymentMethod, amountReceived, change, notes, createdAt
- `saleItems` — id, saleId, productId, productNameSnapshot, unitPriceSnapshot, quantity, lineTotal
- `settings` — businessName, currency

These field shapes already exist as TypeScript types in
`src/types/index.ts` — match the object stores to those types, and add
whatever indexes you need (at minimum, an index on `sales.date` will help
Phase 5's reports later, and an index on `products.categoryId` will help
Phase 2's product grid).

Bump `DB_VERSION` in `src/database/db.ts` and handle the migration inside
the `upgrade()` callback so upgrading from the Phase 0 placeholder schema
doesn't throw or lose data.

Build CRUD services (e.g. `src/services/productsService.ts`,
`categoriesService.ts`, `paymentMethodsService.ts`,
`settingsService.ts`) rather than calling `idb` directly from components.

Build the Product Management screen, replacing the placeholder in
`src/pages/ProductsPage.tsx`. The owner (a non-technical person) must be
able to, from this screen:

- Add a product (name, category, price, optional image)
- Edit a product
- Deactivate a product (soft delete — do not hard-delete, since historical
  sales reference products)
- Reactivate a deactivated product
- Change a product's price or category
- Manage categories (add / edit / deactivate / reorder)
- Manage payment methods (add / edit / deactivate / reorder) — seed with
  the defaults from the master spec: Cash, GCash, Maya, Bank Transfer, Other

**Critical rule from the master spec, already reflected in
`src/types/index.ts`:** historical sales must never change when a
product's price changes later. This phase doesn't create sales yet (that's
Phase 3), but keep this in mind while designing the products service — do
not build anything that would make Phase 3 read live product prices for
old sales instead of the `SaleItem` snapshot fields.

Do not break existing functionality: the app shell, navigation, and the 3
other placeholder pages (POS, History, Reports) must keep working exactly
as they do now.

After completing the phase:

- Test everything (add/edit/deactivate/reactivate for products,
  categories, and payment methods; refresh the browser and confirm data
  persists; confirm the other 3 tabs still work).
- Run `npx tsc -b`, `npm run build`, and `npx oxlint`, and fix anything
  they flag.
- Update `PROJECT_STATUS.md`.
- Update `HANDOFF.md` (Important Files, Database Structure, Completed
  Features, Decisions Already Made, DO NOT CHANGE, Testing Status
  sections all need updating).
- Replace this file (`NEXT_PHASE_PROMPT.md`) with instructions for
  PHASE 2 — POS + Cart.

Do NOT start Phase 2. Stop once Phase 1 is tested and documented, and tell
the project owner Phase 1 is ready for handoff.
