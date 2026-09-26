Project:
Coffee Cart POS

Current Phase:
PHASE 5 — Reports

Status:
COMPLETE, WITH A REAL CAVEAT — this session's container had NO npm registry
access (`npm install` fails with 403 Forbidden), unlike Phase 4's session.
That means `npm install`, `npx tsc -b`, `npm run build`, `npx oxlint`, and
`npm run smoke-test` could NOT be run this phase. This is the same
situation Phases 2 and 3 were in. See "Verification done instead" and
"Known bugs / verification gaps" below before trusting this phase's code
the way Phase 4's was trusted.

Completed:

* New `src/utils/reportStats.ts` — a deliberately dependency-free module
  (no IndexedDB, no service imports) with:
  - `resolveDateRange(preset, custom?, now?)` — resolves "today",
    "yesterday", "last7", "thisMonth", "lastMonth", or "custom" into a
    concrete `{ start, end }` inclusive date-key range. `now` is
    injectable for testability.
  - `filterSalesByRange(sales, range)` — client-side filter by the sale's
    `date` key (string comparison, since date keys are zero-padded
    `YYYY-MM-DD`).
  - `computeSalesStats(sales)` — total, transaction count, items sold,
    average sale, and payment-method breakdown. This is the exact same
    computation Phase 4's `HistoryPage` dashboard used to do inline; it's
    now shared.
  - `computeProductPerformance(sales)` + `topProductsByQuantity` /
    `topProductsByRevenue` — per-product quantity AND revenue together,
    unlike Phase 4's quantity-only "top products".
* New `src/utils/date.ts` — `formatDateKey` extracted out of
  `salesService.ts` so `reportStats.ts` can use it without pulling in
  IndexedDB. `salesService.ts` re-exports it, so Phase 4's existing
  `import { formatDateKey } from "../services/salesService"` (used in
  `HistoryPage.tsx`) still works unchanged.
* `src/pages/ReportsPage.tsx` rebuilt (Phase 0 placeholder replaced):
  - Date range: a horizontal-scrolling row of pill tabs — Today,
    Yesterday, Last 7 days, This month, Last month, Custom — styled like
    POS's existing `.category-tabs`, not the fixed-width `.segmented`
    control (documented reasoning in `HANDOFF.md` and in the component's
    own comments). Picking "Custom" reveals two native `<input type="date">`
    pickers (From/To) inline, not a separate modal.
  - Reuses `salesService.listSales()` + client-side `filterSalesByRange`,
    per the Phase 5 brief — no new service/query logic, since the dataset
    is small.
  - Report contents: total/transaction-count/items-sold/average-sale stat
    cards (same visual style as Phase 4's dashboard), a payment-method
    breakdown, and a "Product performance" list with a 2-way toggle
    (styled with the existing `.segmented` control, which fits well for
    exactly 2 options) between ranking by revenue (the default — see
    "Decisions" in `HANDOFF.md`) and by quantity.
  - Empty state ("No sales in this range") when the selected range has no
    sales.
* `src/pages/HistoryPage.tsx` refactored (not rebuilt) to call
  `computeSalesStats` / `computeProductPerformance` /
  `topProductsByQuantity` from the new shared module instead of
  duplicating that math inline. Behavior is unchanged — same numbers, same
  layout — this only removes duplication ahead of Reports needing the same
  logic. `topProducts` is now an array of `{ name, quantity, revenue }`
  objects instead of `[name, qty]` tuples; the JSX was updated to match.
* `src/styles/components.css` extended (not restructured): `.range-tabs*`,
  `.custom-range-row*`, `.report-range-label`, and
  `.dashboard__section-header*` (for the product-performance toggle row).
  No existing rules were changed.
* `scripts/smoke-test-db.ts` extended with a new "7. Report stats" section
  covering `resolveDateRange` for every preset (including a year-boundary
  case for "lastMonth" and a reversed custom range), `filterSalesByRange`,
  `computeSalesStats` (including the empty-input edge case), and
  `computeProductPerformance`/`topProductsByQuantity`/`topProductsByRevenue`
  against hand-built fixtures. This section needs no IndexedDB at all,
  matching `reportStats.ts`'s dependency-free design.

Verification done instead (no npm registry access this session):

* `src/utils/reportStats.ts`'s logic was extracted into a standalone throw-
  away script and run directly with the globally-installed `tsx` (which
  needs no `node_modules`, since the module has zero external imports) —
  every assertion passed, including month-boundary, year-boundary, empty-
  input, and reversed-custom-range edge cases. The same assertions were
  then folded into `scripts/smoke-test-db.ts` section 7 for the next
  session (with real npm access) to actually run as part of the full
  suite.
* A lightweight manual type-check pass was attempted with a global `tsc`
  plus hand-written stub `.d.ts` files for `react`, but the stubs were too
  crude to be trustworthy (they produced false-positive errors on
  pre-existing, untouched files like `Button.tsx` and `Card.tsx` too) — so
  that attempt was abandoned rather than reported as a real result.
* Careful manual line-by-line review of every new/changed `.tsx`/`.ts`
  file for balanced JSX, correct prop shapes, and consistent naming
  against the rest of the codebase's conventions.

Current functionality:

* Owner can pick Today / Yesterday / Last 7 days / This month / Last month
  / a custom range on the Reports screen and see that range's total,
  transaction count, items sold, average sale, payment breakdown, and top
  5 products — rankable by revenue or quantity.
* Sales History's "Today" dashboard (Phase 4) is visually and numerically
  unchanged, just powered by the shared `reportStats.ts` functions now.

Known bugs / verification gaps:

* **No automated checks were run this phase** — `npm install`, `tsc -b`,
  `build`, `oxlint`, and the full `smoke-test` suite are all UNVERIFIED
  against the actual project dependencies (`idb`, `react`, `react-router-dom`,
  `fake-indexeddb`, etc.). Only the dependency-free parts of the new code
  (`reportStats.ts`'s pure functions) were actually executed. The next
  session with working npm access MUST run the full check suite before
  trusting this phase, and should treat `tsc -b` in particular as likely
  to surface real (if probably small) type errors that couldn't be caught
  here.
* **Manual click-through has still not been done** — this gap is now
  carried across Phases 2, 3, 4, AND 5. Someone needs to actually open the
  app in a browser and click through the POS/checkout flow, Sales History,
  AND the new Reports screen (all 6 range presets, the custom pickers, the
  revenue/quantity toggle) at both mobile and desktop widths.
* "This month" and "Last month" use calendar-month boundaries in the
  user's local time zone (via `Date`'s local getters, same as the rest of
  the app) — not UTC. Should be correct for a single-timezone coffee cart
  but worth confirming against real usage.
* No pagination or virtualization on the product-performance list — fine
  at small scale, could matter eventually with a huge product catalog.
* (Carried) Everything in Phase 4's "Known bugs" list — cash detection by
  name match, no cart-clear confirmation, cart in memory only, etc.

Next phase:

PHASE 6 — Excel + PDF Export
