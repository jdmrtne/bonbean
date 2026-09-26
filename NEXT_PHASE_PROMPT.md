# CONTINUE COFFEE CART POS DEVELOPMENT

You are continuing an existing Coffee Cart POS project.

DO NOT rebuild the application from scratch.

First:

1. Read README.md
2. Read PROJECT_STATUS.md
3. Read HANDOFF.md — especially "Testing Status": Phase 2's code has
   never been installed, built, type-checked, or linted (no network
   egress was available in that session). Treat this as unverified until
   you've run the checks in step 6 yourself.
4. Read this file (NEXT_PHASE_PROMPT.md)
5. Inspect the existing source code, especially `src/types/index.ts`
   (note the `Sale` and `SaleItem` types, already shaped for this phase),
   `src/hooks/useCart.ts` and `src/components/CartPanel.tsx` (the Phase 2
   cart, which this phase saves from), and
   `src/services/productsService.ts` (the CRUD pattern to follow for the
   new `salesService.ts`).
6. Run `npm install && npm run build && npx oxlint && npm run
   smoke-test`. Fix anything they surface — this is the first time this
   exact codebase will have gone through any of these checks. Then run
   `npm run dev`, add a category/payment method/product if the database is
   empty, and click through the whole POS screen (switch categories, tap
   products, adjust quantities every way, check mobile and desktop widths)
   before changing anything.

Current phase:

PHASE 3

Previous phases completed:

PHASE 0 — Project Foundation
PHASE 1 — Database + Product Management
PHASE 2 — POS + Cart

Your task is to implement:

## PHASE 3 — SALES RECORDING

Build the "review order → select payment → save sale" flow that the
Phase 2 "Continue to Payment" placeholder button (in
`src/components/CartPanel.tsx`) currently does nothing. Wire it to a real
flow.

Must support:

- **Payment method selection** — read active payment methods via
  `paymentMethodsService.listPaymentMethods(false)` (check the exact
  function name/signature in `src/services/paymentMethodsService.ts`
  first)
- **Cash received** input, shown only when the selected payment method
  needs it (decide: probably only for a "Cash"-like method, or always —
  your call, document which and why)
- **Change calculation** — `amountReceived - total`, only meaningful for
  cash; validate that cash received isn't less than the total before
  allowing save
- **Save sale** — write a `Sale` record plus one `SaleItem` per cart line
  to IndexedDB
- **Transaction ID** — reuse `utils/id.ts`'s `generateId()`, don't invent
  a second ID scheme
- **Date/time** — stamp both `date` (YYYY-MM-DD) and `time` (HH:mm) per
  the `Sale` type in `src/types/index.ts`; also set `createdAt` (ISO
  string, matching the pattern already used in `productsService.ts`)
- **Price snapshots** — `SaleItem.productNameSnapshot` and
  `unitPriceSnapshot` must be copied from the cart line at save time, NOT
  looked up from the live `Product` record. This is the master spec's core
  data rule (see the original project brief: "Historical sales must
  preserve the price used when the sale occurred") — Phase 1 built the
  schema for exactly this; don't recompute prices from `productsService`
  when saving
- **Sale confirmation** — some visible confirmation that the sale saved
  (a success message, a brief modal, redirect back to an empty POS
  screen — your call), then `cart.clear()` so the next order starts fresh

Build a new `src/services/salesService.ts` following the same plain-async-
function pattern as `productsService.ts`/`categoriesService.ts` (see
HANDOFF.md "Current Architecture" — no state-management library, no
classes). It will need to write to both the `sales` and `saleItems`
IndexedDB stores in one transaction (see `moveCategory` in
`categoriesService.ts` for an example of a multi-write transaction using
`db.transaction(...)`/`tx.done`).

Do NOT implement yet (later phases): sales history list/search/delete
(Phase 4), dashboard stats (Phase 4), reports (Phase 5), exports (Phase 6).
It's fine for a saved sale to only be verifiable by re-opening IndexedDB
directly (e.g. via a quick `db.getAll("sales")` in the browser console, or
by extending `scripts/smoke-test-db.ts`) since the History screen that
would normally show it doesn't exist until Phase 4.

Do not break existing functionality: Product Management (Phase 1), the POS
product grid and cart (Phase 2), and the History/Reports placeholders
(Phase 0) must keep working exactly as they do now.

After completing the phase:

- Extend `scripts/smoke-test-db.ts` with a sales round-trip test (add a
  product, "sell" it via `salesService`, confirm the saved `Sale`/
  `SaleItem` have the right total and price snapshot, then update the
  product's price and confirm the saved `SaleItem`'s
  `unitPriceSnapshot` is unchanged) — this is explicitly called out in
  Phase 1's HANDOFF.md as the right place to add this test, and it's the
  only way to verify the price-snapshot rule without a headed browser.
- Test everything manually: full order → payment → cash received → change
  → save → confirm → cart is empty again; try declining/insufficient cash;
  try each payment method; confirm a sale with multiple different products
  and quantities saves the correct total and correct per-line snapshots.
- Run `npx tsc -b`, `npm run build`, `npx oxlint`, and `npm run
  smoke-test`, and fix anything they flag. (If your session also has no
  network egress, see HANDOFF.md's Phase 2 entry for how to at least
  syntax/import-check new code with `esbuild` as a partial substitute, and
  say so plainly in your own handoff rather than claiming untested code
  passed checks it didn't run through.)
- Update `PROJECT_STATUS.md`.
- Update `HANDOFF.md` (What Has Been Built, Important Files, Database
  Structure if anything changed, Completed Features, Decisions Already
  Made, Known Issues, Testing Status).
- Replace this file (`NEXT_PHASE_PROMPT.md`) with instructions for
  PHASE 4 — Sales History + Dashboard.

Do NOT start Phase 4. Stop once Phase 3 is tested and documented, and tell
the project owner Phase 3 is ready for handoff.
