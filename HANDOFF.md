# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 3 — COMPLETE (code-complete; real-browser/device verification still outstanding — see "Testing Status")

## Overall Project Progress

```
PHASE 0  — Project Foundation           — COMPLETE
PHASE 1  — Database + Product Mgmt      — COMPLETE
PHASE 2  — POS + Cart                   — COMPLETE (pending human verification)
PHASE 3  — Sales Recording              — COMPLETE (pending human verification)
PHASE 4  — Sales History + Dashboard    — NOT STARTED
PHASE 5  — Reports                      — NOT STARTED
PHASE 6  — Excel + PDF Export           — NOT STARTED
PHASE 7  — Backup + Restore             — NOT STARTED
PHASE 8  — Offline + PWA                — NOT STARTED
PHASE 9  — Polish + Mobile UX           — NOT STARTED
PHASE 10 — Final QA + Release           — NOT STARTED
```

## What Has Been Built

Everything from Phases 0–2 (app shell, routing, design tokens, IndexedDB
schema, Product/Category/Payment Method management, the POS product grid
and cart), **plus**, from Phase 3:

- A new `salesService.ts` that writes a `Sale` + its `SaleItem`s from the
  cart in one IndexedDB transaction.
- A new `CheckoutModal.tsx` handling payment method selection, cash
  received + change calculation, validation, saving, and a confirmation
  screen.
- The Phase 2 "Continue to Payment" placeholder button is now wired to
  this real flow.
- `scripts/smoke-test-db.ts` extended with a sales round-trip test that
  specifically verifies the price-snapshot rule (the one thing that can't
  be checked any other way without a headed browser).

Still not built: sales history, dashboard stats, reports, exports,
backup/restore, offline/PWA support. Those are Phases 4–8, in order.

## Current Architecture

Unchanged from Phases 0–2. Additions this phase:

- **`salesService.recordSale(input)`** takes `{ lines: CartLine[],
  paymentMethod: string, amountReceived?, change?, notes? }` and returns
  the saved `Sale`. It builds one `SaleItem` per `CartLine`, computing
  `lineTotal` and the sale's `total` itself — the caller (currently only
  `CheckoutModal`) never computes totals independently, so there's one
  source of truth for "what does this sale add up to."
  - Writes both the embedded `Sale.items` array and the flat `saleItems`
    store in a single `db.transaction(["sales", "saleItems"], "readwrite")`
    — mirrors the multi-write transaction pattern already used by
    `categoriesService.moveCategory`/`paymentMethodsService.movePaymentMethod`,
    just across two stores instead of two records in one store.
  - Throws if `lines` is empty — `CheckoutModal` can only be reached from
    a non-empty cart in the current UI, but the service itself doesn't
    trust that and guards independently.
- **`CheckoutModal` reads `paymentMethods` and `currency` as props**
  (loaded once by `PosPage` alongside categories/products/settings, in the
  same `Promise.all` as before) rather than fetching them itself — keeps
  data-loading centralized in the page, consistent with how `PosPage`
  already handed `currency` down to `CartPanel`.
- **"Is this payment method cash?" is decided by name match**
  (`name.trim().toLowerCase() === "cash"`), not a stored flag — see the
  comment directly above `isCashMethod()` in `CheckoutModal.tsx` for the
  full reasoning and the known limitation (an owner renaming "Cash" loses
  the cash-specific fields for it).
- **Two-screen modal, one component.** `CheckoutModal` renders the
  payment-selection form until `recordSale` succeeds, then switches to a
  confirmation screen inside the *same* `<Modal>` mount (via a
  `savedSale` state flag) rather than closing one modal and opening
  another — avoids a flash of no-modal between the two steps.
- **`cart.clear()` happens on the confirmation screen's "New sale"
  button**, not immediately after `recordSale` resolves — so the owner
  still sees exactly what they just sold (and the change due) before the
  cart resets. `PosPage` doesn't need to know this happened; it just gets
  `onDone()` called, which closes the checkout modal, and the cart being
  empty naturally hides the floating bar and shows `CartPanel`'s empty
  state.

## Important Files

Everything in Phases 0–2's handoff still applies. New/changed this phase:

`src/services/salesService.ts`
→ New. `recordSale(input): Promise<Sale>`. See "Current Architecture"
above. Phase 4 (sales history) will read from the `sales` store directly
(likely a new `listSales`/`getSale`/`deleteSale` set of functions in this
same file, following the existing service pattern) — don't move sale-
reading logic into a different file than sale-writing logic without good
reason.

`src/components/CheckoutModal.tsx`
→ New. Props: `{ cart: UseCartResult; currency: string; paymentMethods:
PaymentMethod[]; onClose: () => void; onDone: () => void }`. `onClose` is
"cancel, go back to the order" (cart untouched); `onDone` is "the sale
flow is finished" (called after the owner dismisses the confirmation
screen, by which point `cart.clear()` has already run inside this
component). Phase 4 has no reason to touch this file.

`src/components/CartPanel.tsx`
→ Changed. Now takes a required `onCheckout: () => void` prop (was: a
disabled placeholder button with no prop). `PosPage.tsx` supplies
`openCheckout` to both the desktop and mobile instances of `CartPanel`.

`src/pages/PosPage.tsx`
→ Changed. Now also loads payment methods (`listPaymentMethods(false)`,
alongside categories/products/settings in the same `Promise.all`) and
holds `checkoutOpen` state. `openCheckout()` closes the mobile cart sheet
first (so the two modals never stack) before opening `CheckoutModal`.

`scripts/smoke-test-db.ts`
→ Extended with a "4. Sales recording + price/name snapshot independence"
section: records a 2-line sale (reusing the Phase 1 `latte` product plus a
new `croissant` product), asserts the sale's total/change and that both
the embedded and flat item stores got written, then updates the
croissant's price *after* the sale and asserts the saved `SaleItem` is
unaffected while the live `Product` did change. This is the only place the
price-snapshot rule is actually verified this phase (no headed browser was
available — see "Testing Status").

## Database Structure

Unchanged from Phase 1 — `sales`/`saleItems` are now actually written to,
using exactly the schema Phase 1 built (see Phase 1's original notes,
still accurate, in the git history of this file if you need the full
field list). No migration was needed this phase.

## Completed Features

- Payment method selection (button list, not a dropdown)
- Cash received + live change calculation, shown only for a "Cash"-named
  payment method; validated against the total before saving
- Non-cash payment methods save with no `amountReceived`/`change` (treated
  as paid in full, no change due)
- Sale + SaleItem(s) saved atomically with price/name snapshots frozen at
  sale time
- Confirmation screen (total + change due) → "New sale" clears the cart
- (Carried from Phases 0–2) product/category/payment-method management,
  POS product grid + cart, responsive app shell, IndexedDB schema, error
  boundary

## Known Issues

- **This phase's code has not been run, built, type-checked, or linted**,
  for the same reason as Phase 2 — this session's container has no
  network egress (`npm install` was retried at the start of this phase and
  still returns a 403 from the npm registry; see "Testing Status" for the
  exact error). None of `npm run dev`, `npm run build`, `npx tsc -b`,
  `npx oxlint`, or `npm run smoke-test` could be executed.
  **Whoever picks up Phase 4 must run all of these — including the
  extended smoke test, which has never actually been executed — before
  trusting Phase 3's code.**
- As a partial substitute: every new/changed file (`salesService.ts`,
  `CheckoutModal.tsx`, the edits to `CartPanel.tsx`/`PosPage.tsx`, and the
  extended `smoke-test-db.ts`) was syntax-checked with `esbuild`, and both
  the full app (from `src/main.tsx`) and the smoke test script (from
  `scripts/smoke-test-db.ts`) were bundle-resolved end-to-end with only
  real npm packages externalized — 0 errors either way. This confirms
  syntax and that import/export names line up; it does **not** confirm the
  new smoke-test assertions actually pass, or that the types check under
  `tsc`.
- Manual click-through (full order → payment → cash received → change →
  save → confirm → cart empties; try insufficient cash; try each payment
  method; multi-product/multi-quantity sales) as requested by the Phase 3
  brief has **not been done** — no headed browser or real device available
  in this environment.
- "Cash" is detected by name match, not a stored flag — see "Current
  Architecture" above.
- No confirmation dialog before "Clear cart" (carried from Phase 2,
  unchanged).
- Cart state is still in-memory only (carried from Phase 2, unchanged).
- (Carried from Phase 1) No UI yet for editing `settings`.
- No sales history/search/delete/dashboard yet — a saved sale can only be
  inspected via the smoke test or IndexedDB devtools until Phase 4.

## Decisions Already Made

Carried from Phases 0–2 (still true, don't change without good reason):
IndexedDB over localStorage; `HashRouter`; plain CSS; self-hosted Manrope;
`SaleItem` snapshot pattern; soft-delete-only; no confirmation dialogs for
reversible one-tap actions; cart stays in memory, not IndexedDB;
`CartPanel` shared between desktop/mobile.

New in Phase 3:

- **Cash detection by name match**, not a `PaymentMethod.isCash` flag —
  simplest option that correctly handles the seeded default without a
  schema change. Revisit (add a real flag, migrate `DB_VERSION`) only if
  an owner actually renames "Cash" and this becomes a real problem — see
  `CheckoutModal.tsx`'s `isCashMethod()` comment.
- **Non-cash payment methods require no cash-received input** and are
  saved as fully paid with no change — i.e. `amountReceived`/`change` are
  simply `undefined` on the `Sale` for those. This matches how a real
  coffee cart owner would use GCash/Maya/bank transfer (the exact amount
  moves, there's no "change").
- **The service, not the UI, computes `total` and each line's
  `lineTotal`.** `CheckoutModal` never adds up prices itself — it always
  reads `cart.total` for display and lets `recordSale` compute the
  authoritative total that gets saved. Keeps "what a sale actually cost"
  defined in exactly one place.
- **One `<Modal>`, two screens (form → confirmation), not two modals.**
  See "Current Architecture" above.
- **`cart.clear()` is deferred to the confirmation screen's dismissal**,
  not called immediately after saving — so the owner sees what they just
  sold before the cart resets.
- **Sale-writing logic lives in `salesService.ts`**; Phase 4 should put
  sale-*reading* logic (list/get/delete) in the same file rather than a
  separate `salesHistoryService.ts` or similar — one service per store,
  matching the pattern already set for products/categories/payment
  methods/settings.

## DO NOT CHANGE

Everything listed in Phases 0–2's version of this section still applies.
Additionally, as of Phase 3:

- The price/name snapshot rule in `salesService.recordSale` — it must
  always take `productNameSnapshot`/`unitPriceSnapshot` from the
  `CartLine` it's given, never from a live `productsService` lookup. This
  is the master spec's core data-integrity rule; breaking it would let a
  future price change silently rewrite historical sales.
- The `Sale`/`SaleItem` field names and the fact that both the embedded
  `Sale.items` array and the flat `saleItems` store are written for every
  sale — Phase 4's history list and Phase 5's product-performance reports
  are expected to read from whichever of the two is more convenient for
  their query, and both assume both are always present and in sync.
- Don't make `salesService.recordSale` compute `total`/`lineTotal` from
  anything other than the `CartLine`s it's given (e.g. don't have it
  re-fetch the product to "double check" the price) — that would
  reintroduce exactly the bug the snapshot pattern exists to prevent.

## Next Phase

**PHASE 4 — Sales History + Dashboard.** See `NEXT_PHASE_PROMPT.md` for the
exact brief.

## Recommended First Steps

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. **Run `npm install && npm run build && npx oxlint && npm run
   smoke-test` before writing any Phase 4 code.** Neither Phase 2 nor
   Phase 3's code has ever been through any of these — treat this as step
   zero, not optional, and fix anything they surface (including in the
   Phase 3 sales round-trip smoke test, which has never actually been
   executed) before proceeding.
3. Run `npm run dev` and manually complete a few full sales (different
   payment methods, different product/quantity combinations, at least one
   with insufficient cash to confirm validation blocks it) before changing
   anything. This is real manual QA that could not be done in Phases 2 or
   3.
4. Read `src/services/salesService.ts` (what a saved `Sale` looks like)
   and `src/types/index.ts`'s `Sale`/`SaleItem` types.
5. Build `listSales`/`getSale`/`deleteSale` in `salesService.ts` (query the
   `sales` store, probably via the existing `by-date` index for a
   most-recent-first list).
6. Build the Sales History screen (`src/pages/HistoryPage.tsx`, replacing
   its Phase 0 placeholder): list, search, transaction detail view,
   delete (with a confirmation dialog this time — unlike the reversible
   deactivate/clear-cart actions in earlier phases, deleting a sale is
   destructive and irreversible, so the master spec's requirement for
   confirmation here is different from those).
7. Build the dashboard stats called for in the Phase 4 brief (today's
   sales, transaction count, items sold, average sale, payment breakdown,
   top products) — decide where they live (a new section of `HistoryPage`,
   or a separate dashboard area) and document the choice.
8. Update `PROJECT_STATUS.md`, `HANDOFF.md`, and replace
   `NEXT_PHASE_PROMPT.md` with Phase 5 instructions before stopping.

## Testing Status

| Check | Result |
|---|---|
| `npm install` (retried this phase) | ❌ Failed again — `403 Forbidden` from `registry.npmjs.org`, same as Phase 2 |
| `npx tsc -b` / `npm run build` / `npx oxlint` / `npm run smoke-test` | ⛔ Not run — no `node_modules` |
| `esbuild` syntax check on `salesService.ts`, `CheckoutModal.tsx`, `CartPanel.tsx`, `PosPage.tsx`, `smoke-test-db.ts` | ✅ Pass, 0 errors |
| `esbuild --bundle` from `src/main.tsx` (app) and from `scripts/smoke-test-db.ts` (smoke test), externalizing only real npm packages | ✅ Pass both — every relative import resolves, 0 errors |
| Manual click-through of a full sale (cash + non-cash, various carts) in a real/headed browser | ❌ Not done — no headed browser available in this environment |
| Real mobile device check | ❌ Not done |
| Confirmed Phase 0–2 functionality untouched | ✅ Verified by inspection — only `CartPanel.tsx` and `PosPage.tsx` were modified; `salesService.ts` and `CheckoutModal.tsx` are new, isolated files |
