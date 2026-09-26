Project:
Coffee Cart POS

Current Phase:
PHASE 4 — Sales History + Dashboard

Status:
COMPLETE — `npm install`, `npx tsc -b`, `npm run build`, `npx oxlint`, and
`npm run smoke-test` were all actually run this phase (this session had
working npm registry access, unlike Phases 2–3) and all passed, including
for the first time verifying Phase 3's sales round-trip / price-snapshot
smoke test actually works. Manual click-through in a real/headed browser
on mobile and desktop widths still has NOT been done — no headed browser
was available in this sandboxed environment — see "Known bugs" below.

Completed:

* `salesService.ts` extended with `listSales()` (all sales, most recent
  first — sorts by `date` then by `time` string since the `by-date` index
  only orders by date), `deleteSale(id)` (removes the `Sale` plus every
  matching `SaleItem` in one transaction), and `updateSaleNotes(id, notes)`
* New `src/components/SaleDetailModal.tsx` — shows a sale's full line
  items, payment method, cash received/change if applicable, and
  timestamp; lets the owner edit/save a free-text note; deletes the sale
  after a native `window.confirm(...)` (delete is the one destructive,
  irreversible action in the app so far, and is the only Phase 4 action
  gated behind a confirmation)
* `src/pages/HistoryPage.tsx` rebuilt (Phase 0 placeholder replaced):
  a "Today" dashboard (today's sales total, transaction count, items sold,
  average sale, payment-method breakdown, top 5 products by quantity sold)
  above a searchable, most-recent-first list of every recorded sale;
  tapping a row opens `SaleDetailModal`
* Search is a simple case-insensitive filter over product names within
  each sale's line items (e.g. "croissant") — no date-range picker was
  built here, since that's explicitly Phase 5 Reports' job
* Editing a transaction was scoped to notes only, deliberately — line
  items, prices, payment method, and totals stay immutable, since they're
  a record of what actually happened (same principle as the Phase 3
  price-snapshot rule)
* `scripts/smoke-test-db.ts` extended with `listSales`/`deleteSale`
  round-trip tests: records a second sale, confirms `listSales` returns
  both in the right order, deletes the first sale, and confirms its
  `Sale` record and both its `SaleItem`s are gone while the second sale
  and its items are untouched (no orphaned records)
* Confirmed Phases 0–3 (product/category/payment-method management, POS
  grid/cart, sales recording) still build and pass their existing smoke
  tests unchanged — only `HistoryPage.tsx` was replaced and
  `salesService.ts`/`components.css` were extended; no other file touched

Current functionality:

* Owner can record a sale on the POS screen (Phases 2–3), then see it
  immediately in Sales History: full history list, tap for detail, search
  by product name, delete with confirmation, add/edit a note
* The dashboard shows real numbers for today the moment a sale is saved —
  no page reload needed on return, since `HistoryPage` re-fetches on mount
* Reports (custom date ranges, more detailed product performance) still
  show the Phase 0 placeholder — that's Phase 5

Known bugs / verification gaps:

* **Manual click-through has not been done.** Record several real sales
  via the POS screen, then check: the history list order and content, the
  detail modal (including a cash sale and a non-cash sale), search with a
  real product name, delete with both "confirm" and "cancel" on the native
  dialog, note editing, and the dashboard numbers against what was
  actually entered — at both a mobile and a desktop width. This must be
  done by a human before Phase 4 is truly trusted, per the master spec.
* `npx oxlint` reports the same pre-existing `react(set-state-in-effect)`
  style warning on `HistoryPage.tsx`'s `void refresh()` call that already
  exists on `CategoriesManager.tsx` and `PaymentMethodsManager.tsx` — 0
  errors, and consistent with the codebase's existing pattern, not a new
  issue introduced this phase.
* Top products are ranked by quantity sold, not revenue — a deliberate
  choice (documented in `HANDOFF.md`); revisit if revenue ranking turns
  out to matter more in practice or in Phase 5.
* No date-range picker in the Phase 4 dashboard — scoped to "today" only,
  by design; Phase 5 (Reports) owns date ranges.

Next phase:

PHASE 5 — Reports
