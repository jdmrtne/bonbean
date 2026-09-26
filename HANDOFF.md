# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 4 — COMPLETE (all automated checks actually run and passing; manual
browser/device click-through still outstanding — see "Testing Status")

## Overall Project Progress

```
PHASE 0  — Project Foundation           — COMPLETE
PHASE 1  — Database + Product Mgmt      — COMPLETE
PHASE 2  — POS + Cart                   — COMPLETE (pending human verification)
PHASE 3  — Sales Recording              — COMPLETE (automated checks passed this phase; pending human click-through)
PHASE 4  — Sales History + Dashboard    — COMPLETE (automated checks passed; pending human click-through)
PHASE 5  — Reports                      — NOT STARTED
PHASE 6  — Excel + PDF Export           — NOT STARTED
PHASE 7  — Backup + Restore             — NOT STARTED
PHASE 8  — Offline + PWA                — NOT STARTED
PHASE 9  — Polish + Mobile UX           — NOT STARTED
PHASE 10 — Final QA + Release           — NOT STARTED
```

Note on Phases 2–3: this session had working `npm install` access (unlike
the Phase 3 session, which had none). Re-running the full check suite
confirmed Phases 1–3's code and existing smoke tests all genuinely pass —
see "Testing Status" below. That's real signal, but it's still not the
same as a human clicking through the POS/checkout flow in a real browser,
which remains undone.

## What Has Been Built

Everything from Phases 0–3 (app shell, routing, design tokens, IndexedDB
schema, Product/Category/Payment Method management, the POS grid and
cart, sales recording with price/name snapshots), **plus**, from Phase 4:

- `salesService.ts` extended with `listSales()`, `deleteSale(id)`, and
  `updateSaleNotes(id, notes)` — all reading/writing the same
  `sales`/`saleItems` stores `recordSale` already uses.
- New `SaleDetailModal.tsx` — transaction detail view + note editing +
  confirmed delete.
- `HistoryPage.tsx` rebuilt: today's dashboard stats + searchable sale
  list, replacing the Phase 0 placeholder.
- `scripts/smoke-test-db.ts` extended with a `listSales`/`deleteSale`
  round-trip section.
- `components.css` extended with dashboard/stat-card/sale-detail styles,
  plus a `button.list-row` reset (see "Current Architecture").

Still not built: reports with custom date ranges, Excel/PDF export,
backup/restore, offline/PWA support. Those are Phases 5–8, in order.

## Current Architecture

Unchanged from Phases 0–3. Additions this phase:

- **`salesService.listSales()`** reads all sales via the `by-date` index,
  then re-sorts most-recent-first by comparing `date`, then `time`, then
  (as a final tiebreaker) the full `createdAt` ISO timestamp. The
  `createdAt` tiebreaker isn't decorative — it fixed a real bug caught by
  running the smoke test repeatedly (see "Testing Status"): two sales
  saved within the same minute have equal `date` AND `time` keys, and
  IndexedDB does not guarantee insertion order for equal index keys, so
  without a finer tiebreaker the order between such sales was effectively
  random (the test failed roughly 1 in 8 runs). `createdAt`'s millisecond
  precision resolves this deterministically with no schema change needed.
  Display formatting (in `HistoryPage` and `SaleDetailModal`) also uses
  `createdAt` directly via `toLocaleString`, rather than reassembling
  `date` + `time`.
- **`salesService.deleteSale(id)`** mirrors `recordSale`'s multi-store
  transaction shape: one `db.transaction(["sales", "saleItems"],
  "readwrite")` that deletes the `Sale` and looks up + deletes every
  `SaleItem` via the `by-saleId` index, so a sale can never be left with
  orphaned items (or vice versa).
- **`salesService.updateSaleNotes(id, notes)`** is a plain `get` + `put`,
  same pattern as `productsService.updateProduct`. It's the *only* mutable
  field on a saved `Sale` — see "DO NOT CHANGE" below for why everything
  else stays frozen.
- **The whole sales-list row is a `<button className="list-row">`**, not a
  `<div>` with a nested action button (unlike the products/categories/
  payment-methods lists, which have per-row actions like move-up/edit
  alongside the row). A sale only has one tap action (open detail), so
  making the row itself the button was simpler than adding an inert
  wrapper + click handler. This needed a small CSS reset
  (`button.list-row` in `components.css`) to strip native button chrome
  without touching the existing `.list-row` used elsewhere as a `<div>`.
- **Delete lives inside `SaleDetailModal`, not in the list row.** The
  Phase 4 brief calls out that deleting a sale is destructive and
  irreversible (unlike the reversible deactivate/clear-cart actions in
  earlier phases) and specifically needs confirmation — putting it behind
  "tap row → open detail → Delete sale → native confirm" adds a
  deliberate extra step compared to, say, a swipe-to-delete gesture.
- **Editing is notes-only.** `SaleDetailModal` has an editable `<textarea>`
  for `Sale.notes` with its own "Save note" button (only shown once the
  text actually differs from the saved value); every other field
  (items/prices/payment method/timestamps/totals) is rendered read-only.
  The Phase 4 brief explicitly allowed this as the minimal option — see
  "Decisions Already Made" below for the reasoning.
- **The dashboard is a section at the top of `HistoryPage`, not a separate
  route/page.** It's computed with a `useMemo` over the same `sales` list
  the history section already loaded (filtered to today's `date` key via
  `salesService.formatDateKey`, now exported for this purpose) — no
  separate query or service function was needed.
- **Top products are ranked by quantity sold, not revenue** — see
  `HistoryPage.tsx`'s comment above the `topProducts` computation.
  Documented as a judgment call in the Phase 4 brief; revisit in Phase 5
  if revenue ranking is wanted for reports too.

## Important Files

Everything in Phases 0–3's handoff still applies. New/changed this phase:

`src/services/salesService.ts`
→ Changed (extended, not rewritten). Added `listSales()`, `deleteSale(id)`,
`updateSaleNotes(id, notes)`. Also changed `formatDateKey` from a private
`function` to an `export function` so `HistoryPage` can compute "today"'s
key the same way `recordSale` does — no new date-formatting logic was
added anywhere else. `recordSale` itself is untouched.

`src/components/SaleDetailModal.tsx`
→ New. Props: `{ sale: Sale; currency: string; onClose: () => void;
onDeleted: () => void; onNotesSaved: (updated: Sale) => void }`. Reuses
`.cart-line`/`.cart-panel__summary` CSS classes from `CartPanel` for the
line-item list, rather than inventing parallel styles, since a sale's
saved items and a cart's live lines render almost identically.

`src/pages/HistoryPage.tsx`
→ Rewritten (was the Phase 0 placeholder). Loads `listSales()` +
`getSettings()` on mount into local state; holds `search` and
`selectedSale` state; computes the dashboard stats via `useMemo`. Renders
the dashboard, a search input, the sale list (or an `EmptyState`), and
`SaleDetailModal` when a sale is selected.

`scripts/smoke-test-db.ts`
→ Extended with a "5. Sales history: listSales + deleteSale" section
(renumbering the old "5. Settings update" to "6."): records a second sale,
asserts list order and count, deletes the first sale, and asserts both its
`Sale` and `SaleItem`s are gone while the second sale's are untouched.

`src/styles/components.css`
→ Extended (not restructured): a `button.list-row` reset, `.list-row__amount`,
`.badge--payment`, and a new "PHASE 4" section (`.dashboard*`, `.stat-*`,
`.breakdown-*`, `.top-product-*`, `.search-bar`, `.sale-detail__*`). No
existing rules were changed.

## Database Structure

Unchanged from Phase 1 — no migration needed this phase. `listSales` and
`deleteSale` both operate on the existing `sales`/`saleItems` stores and
their existing indexes (`by-date`, `by-saleId`).

## Completed Features

- Sales history list, most recent first, with search by product name
- Transaction detail view: line items, payment method, cash/change,
  timestamp
- Delete a sale (with native confirm) — removes the `Sale` and all its
  `SaleItem`s
- Edit a sale's note (the only mutable field on a saved sale)
- Dashboard (today only): total sales, transaction count, items sold,
  average sale, payment-method breakdown, top 5 products by quantity
- (Carried) product/category/payment-method management, POS grid + cart,
  sales recording with price/name snapshots, responsive app shell,
  IndexedDB schema, error boundary

## Known Issues

- **Manual click-through has not been done** — no headed browser or real
  device was available in this environment. A human needs to: record
  several real sales via the POS screen (cash and non-cash, various
  products/quantities), then check the history list, detail view (both a
  cash and a non-cash sale), search, delete (confirm and cancel), note
  editing, and every dashboard number against what was actually entered —
  at both mobile and desktop widths.
- Top products ranked by quantity, not revenue (see "Current
  Architecture" above) — a judgment call, not a bug, but worth confirming
  it's what the project owner actually wants.
- Dashboard is "today" only; no custom date range (by design — that's
  Phase 5).
- Search only matches product names within a sale, not date, amount, or
  transaction ID — documented as the deliberate "simple first pass" the
  Phase 4 brief asked for.
- (Carried from Phase 3) "Cash" detection is by payment-method name match,
  not a stored flag.
- (Carried from Phase 2) No confirmation dialog before "Clear cart".
- (Carried from Phase 2) Cart state is in-memory only.
- (Carried from Phase 1) No UI yet for editing `settings`.

## Decisions Already Made

Carried from Phases 0–3 (still true, don't change without good reason):
IndexedDB over localStorage; `HashRouter`; plain CSS; self-hosted Manrope;
`SaleItem` snapshot pattern; soft-delete-only for products/categories/
payment methods; no confirmation dialogs for reversible one-tap actions;
cart stays in memory; cash detection by name match; sale-writing logic
lives in `salesService.ts`.

New in Phase 4:

- **Sale-reading/deleting logic also lives in `salesService.ts`**, per the
  Phase 3 handoff's own recommendation — one service per store, not a
  separate `salesHistoryService.ts`.
- **Editing a transaction is notes-only.** Everything else on a saved sale
  is immutable, for the same reason the price/name snapshot exists: a
  sale is a record of what actually happened, and letting an owner
  "correct" a line item or total after the fact would silently rewrite
  history exactly like a live price lookup would. If real editing (fixing
  a mis-entered quantity, say) turns out to be needed, the safer pattern
  is probably "delete and re-enter" using the delete feature already
  built, rather than adding item-level editing later — worth raising with
  the project owner before building it, not assuming it's wanted.
- **Delete requires `window.confirm`, and only lives in the detail modal**
  — not a swipe gesture or an inline row button — see "Current
  Architecture" above.
- **Dashboard is a section of `HistoryPage`, scoped to "today," computed
  client-side from the same `listSales()` result the list already needed**
  — no new service function, no separate route.
- **Top products ranked by quantity sold, not revenue** — see "Current
  Architecture" above.

## DO NOT CHANGE

Everything in Phases 0–3's version of this section still applies
(especially the price/name snapshot rule — Phase 4 reads sales, it never
recomputes anything from live product data). Additionally, as of Phase 4:

- Don't let `SaleDetailModal` (or anything else) make `items`, `total`,
  `paymentMethod`, `amountReceived`, `change`, `date`, `time`, or
  `createdAt` on a saved `Sale` editable. `notes` is the one field this
  phase deliberately made mutable — see "Decisions Already Made" above.
- `deleteSale` must keep deleting from both `sales` and `saleItems` in one
  transaction. Don't split this into two separate calls/transactions —
  that would reopen the exact "can be left inconsistent" risk
  `recordSale`'s single transaction already exists to prevent.
- Don't move `listSales`/`deleteSale`/`updateSaleNotes` out of
  `salesService.ts` into a new file — Phase 5 (Reports) is expected to
  also read from this file (or add its own read functions here), matching
  the one-service-per-store pattern used everywhere else in this project.

## Next Phase

**PHASE 5 — Reports.** See `NEXT_PHASE_PROMPT.md` for the exact brief.

## Recommended First Steps

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. Run `npm install && npx tsc -b && npm run build && npx oxlint && npm
   run smoke-test` before writing any Phase 5 code, to confirm your
   environment matches the state this phase left things in.
3. **Do the manual click-through this phase couldn't do**: record several
   real sales via the POS screen, then exercise Sales History fully
   (list, detail, search, delete with confirm/cancel, notes) and confirm
   the dashboard numbers, at both mobile and desktop widths, before
   building Reports on top of it.
4. Read `src/services/salesService.ts` (especially `listSales`, and the
   `by-date`/`by-saleId` indexes it and `deleteSale` use) and
   `src/pages/HistoryPage.tsx` (the "today"-scoped dashboard computation
   you'll likely generalize into a date-range version for Reports).
5. Check the original master spec's Phase 5 section for what belongs here
   vs. what Phase 4 already covered (today-only dashboard, simple product-
   name search) before deciding how much date-range/product-performance UI
   to build.
6. Update `PROJECT_STATUS.md`, `HANDOFF.md`, and replace
   `NEXT_PHASE_PROMPT.md` with Phase 6 instructions before stopping.

## Testing Status

| Check | Result |
|---|---|
| `npm install` | ✅ Passed — this session had working npm registry access (unlike Phases 2–3's sessions) |
| `npx tsc -b` | ✅ Passed, 0 errors |
| `npm run build` | ✅ Passed |
| `npx oxlint` | ✅ 0 errors; 5 warnings total, all the same pre-existing `react(set-state-in-effect)` style warning already present on `CategoriesManager.tsx`/`PaymentMethodsManager.tsx` (now also on `HistoryPage.tsx`, which uses the same `void refresh()`-in-`useEffect` pattern) |
| `npm run smoke-test` | ✅ All 26 assertions passed, including — for the first time — Phase 3's sales round-trip/price-snapshot test (never actually executed before this session) and the new Phase 4 `listSales`/`deleteSale` tests. Run 8 times in a row to confirm; the first run caught a real ordering race (see "Current Architecture" — `listSales`'s `createdAt` tiebreaker), which was fixed and then re-verified stable across 8 further runs |
| Manual click-through of Sales History (list/detail/search/delete/notes) in a real/headed browser | ❌ Not done — no headed browser available in this environment |
| Manual click-through of Phase 2/3 flows (product grid, cart, checkout) | ❌ Also still not done, despite the automated checks now passing — see note under "Overall Project Progress" |
| Real mobile device check | ❌ Not done |
| Confirmed Phase 0–3 functionality untouched | ✅ Verified by both inspection (only `HistoryPage.tsx`, `salesService.ts`, `components.css`, and `smoke-test-db.ts` were touched) and by the full smoke-test suite passing, including every pre-existing Phase 1–3 assertion |
