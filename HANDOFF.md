# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 5 — COMPLETE, with no automated checks run this session (no npm
registry access in this container — see "Testing Status"). Manual
browser/device click-through is also still outstanding, same as every
prior phase.

## Overall Project Progress

```
PHASE 0  — Project Foundation           — COMPLETE
PHASE 1  — Database + Product Mgmt      — COMPLETE
PHASE 2  — POS + Cart                   — COMPLETE (pending human verification)
PHASE 3  — Sales Recording              — COMPLETE (automated checks passed Phase 4's session; pending human click-through)
PHASE 4  — Sales History + Dashboard    — COMPLETE (automated checks passed Phase 4's session; pending human click-through)
PHASE 5  — Reports                      — COMPLETE (NO automated checks run this session — no npm registry access; pending human click-through)
PHASE 6  — Excel + PDF Export           — NOT STARTED
PHASE 7  — Backup + Restore             — NOT STARTED
PHASE 8  — Offline + PWA                — NOT STARTED
PHASE 9  — Polish + Mobile UX           — NOT STARTED
PHASE 10 — Final QA + Release           — NOT STARTED
```

**Important note on this session's environment:** unlike Phase 4's
session, this container's `npm install` failed outright (403 Forbidden
from the npm registry, confirmed via `npm ping` and a real `npm install`
attempt — not assumed). That means `tsc -b`, `npm run build`, `npx
oxlint`, and the real `npm run smoke-test` could not be run at all this
phase. This matches the situation Phases 2 and 3 were built under. See
"Testing Status" below for exactly what was and wasn't verified, and
treat all Phase 5 code as **more likely than Phase 4's to have a small
type or lint issue** that a real `tsc -b`/`oxlint` run would have caught.
The next session should run the full check suite before writing any new
code, not just before shipping Phase 6.

## What Has Been Built

Everything from Phases 0–4 (app shell, routing, design tokens, IndexedDB
schema, Product/Category/Payment Method management, the POS grid and
cart, sales recording with price/name snapshots, Sales History with a
"Today" dashboard), **plus**, from Phase 5:

- New `src/utils/date.ts` — `formatDateKey(d: Date): string`, extracted
  out of `salesService.ts`.
- New `src/utils/reportStats.ts` — dependency-free date-range resolution
  (`resolveDateRange`) and sales aggregation (`computeSalesStats`,
  `computeProductPerformance`, `topProductsByQuantity`,
  `topProductsByRevenue`), shared by both `HistoryPage.tsx` and the new
  `ReportsPage.tsx`.
- `src/pages/ReportsPage.tsx` rebuilt: date-range tabs (6 presets
  including Custom), range-scoped stat cards, payment breakdown, and a
  revenue/quantity-toggleable product-performance list.
- `src/pages/HistoryPage.tsx` refactored (behavior unchanged) to use the
  new shared `reportStats.ts` functions instead of duplicating the same
  math inline.
- `src/services/salesService.ts` changed only to re-export `formatDateKey`
  from its new home in `utils/date.ts` — `recordSale`, `listSales`,
  `deleteSale`, `updateSaleNotes` are all untouched.
- `src/styles/components.css` extended with `.range-tabs*`,
  `.custom-range-row*`, `.report-range-label`, `.dashboard__section-header*`.
- `scripts/smoke-test-db.ts` extended with a "7. Report stats" section.

Still not built: Excel/PDF export, backup/restore, offline/PWA support.
Those are Phases 6–8, in order.

## Current Architecture

Unchanged from Phases 0–4. Additions this phase:

- **`utils/reportStats.ts` is deliberately dependency-free** — it imports
  only `../types` (types-only) and `./date` (which itself has zero
  imports). It does NOT import `salesService.ts` or `database/db.ts`.
  This was a specific choice, not an accident: it means the module can be
  unit-tested (and, this session, WAS manually tested) with a bare `tsx`
  invocation and no `node_modules` at all, since neither `idb` nor any
  other package needs to be resolved. If you're tempted to have it call
  into `salesService.ts` directly (e.g. to fetch sales itself instead of
  taking a `Sale[]` parameter), don't — that would silently reattach the
  IndexedDB dependency this design avoids.
- **`formatDateKey` moved from `salesService.ts` to `utils/date.ts`**,
  with `salesService.ts` re-exporting it (`export { formatDateKey };`
  after importing it) purely for backward compatibility with Phase 4's
  `HistoryPage.tsx` import. New code should import it from `utils/date.ts`
  directly (see `ReportsPage.tsx` for the pattern) — the re-export exists
  so Phase 4's file didn't need to be touched just for this.
- **`resolveDateRange`'s semantics**, in case they come up again in Phase
  6+ reports/exports:
  - `"last7"` = today plus the 6 days before it (7 calendar days
    inclusive of today), NOT a trailing window that excludes today.
  - `"thisMonth"` = the 1st of the current month through **today** (not
    through the end of the month) — there are never future sales to show.
  - `"lastMonth"` = the full previous calendar month, 1st through its
    last day, computed by taking the day before this month's 1st and then
    finding that day's own month's 1st — this correctly handles varying
    month lengths and year boundaries (both are covered by
    `smoke-test-db.ts` section 7).
  - `"custom"` swaps `start`/`end` if the picker produced them reversed,
    rather than returning an empty/invalid range. `ReportsPage.tsx` also
    constrains this at the UI level (`max`/`min` on the two date inputs)
    so a reversed range should be rare in practice, but the swap is a
    deliberate belt-and-suspenders guard, not dead code.
  - All range comparisons are done as `YYYY-MM-DD` **string** comparisons
    against `Sale.date`, never by parsing dates and comparing `Date`
    objects — consistent with how `listSales`'s sort already treats date
    keys as comparable strings.
- **`ReportsPage.tsx`'s date-range UI is a horizontal-scrolling pill row**
  (`.range-tabs`, copied in spirit from POS's `.category-tabs`), not the
  fixed-width `.segmented` control used for Products/Categories/Payment
  Methods. Reasoning: `.segmented` uses `flex: 1 1 0` per item, which
  works well for 2–3 items but gets cramped with 6 (5 presets + Custom),
  and this list is more likely to grow (e.g. "This year") than shrink.
  The quantity/revenue toggle on product performance, by contrast, DOES
  use `.segmented` — only 2 options, so the fixed-width behavior is fine
  there and matches the rest of the app's convention for small binary/
  ternary choices.
- **Product performance defaults to revenue ranking, not quantity** — the
  opposite of Phase 4's "Today" dashboard, which is quantity-only. The
  reasoning: for a single day, "what moved" (quantity) is what a coffee
  cart owner glances at; over a week or a month, "what actually made
  money" (revenue) is a different and arguably more useful question,
  since a cheap high-volume item and an expensive low-volume item can tie
  on quantity while differing a lot on revenue. Both are one tap away via
  the toggle — this is a default, not a removal of the other view.
- **`HistoryPage.tsx`'s dashboard is visually and numerically unchanged**
  after the refactor. The only structural difference is that
  `dashboard.topProducts` is now an array of `{ name, quantity, revenue }`
  objects (from `computeProductPerformance` + `topProductsByQuantity`)
  instead of `[name, qty]` tuples — the JSX was updated to destructure
  `product.name`/`product.quantity` instead of array-destructuring, and
  `dashboard.total` replaced the old `dashboard.totalToday` field name
  (the "today" scoping is now just about which sales are passed in, not
  part of the stats object's shape, since the same object shape is now
  shared with a range that isn't "today").

## Important Files

Everything in Phases 0–4's handoff still applies. New/changed this phase:

`src/utils/date.ts`
→ New. `formatDateKey(d: Date): string`. Zero imports. Moved here from
`salesService.ts` so `reportStats.ts` doesn't have to import
`salesService.ts` (and therefore `idb`) just for this one function.

`src/utils/reportStats.ts`
→ New. See "Current Architecture" above for the full design reasoning.
Exports: `DateRangePreset` (type), `CustomRange`/`DateRange` (types),
`resolveDateRange`, `filterSalesByRange`, `SalesStats` (type),
`computeSalesStats`, `ProductPerformanceRow` (type),
`computeProductPerformance`, `topProductsByQuantity`,
`topProductsByRevenue`.

`src/services/salesService.ts`
→ Changed minimally: `formatDateKey`'s implementation moved to
`utils/date.ts`; this file now does
`import { formatDateKey } from "../utils/date"; export { formatDateKey };`
instead of defining it locally. `recordSale` (which calls
`formatDateKey`), `listSales`, `deleteSale`, and `updateSaleNotes` are
byte-for-byte unchanged otherwise.

`src/pages/ReportsPage.tsx`
→ Rewritten (was the Phase 0 placeholder). Loads `listSales()` +
`getSettings()` on mount; holds `preset`, `customStart`, `customEnd`, and
`productSort` state; derives `range` → `rangeSales` → `stats` /
`productRows` → `topProducts` via chained `useMemo`s. Renders the range
tabs, the optional custom-range date inputs, a range label, and (unless
the range has zero sales) the stat cards / payment breakdown / product
performance card.

`src/pages/HistoryPage.tsx`
→ Refactored (not rewritten) to import and call `computeSalesStats` /
`computeProductPerformance` / `topProductsByQuantity` from
`utils/reportStats.ts` instead of computing the same things inline. The
`todaysSales` filtering and the JSX layout are otherwise unchanged.

`scripts/smoke-test-db.ts`
→ Extended with a "7. Report stats" section (after the existing "6.
Settings update", which is unrenumbered/unchanged). Tests
`resolveDateRange` for all 6 presets against a fixed `now`, including a
year-boundary case for `lastMonth` and a reversed-range case for
`custom`; then builds three hand-written `Sale` fixtures (by spreading an
already-recorded sale from earlier in the script and overriding
`date`/`total`/`paymentMethod`/`items`) to test `filterSalesByRange`,
`computeSalesStats` (including on an empty array), and
`computeProductPerformance`/`topProductsByQuantity`/`topProductsByRevenue`.
This section does not touch `db`/`getDB()` at all.

`src/styles/components.css`
→ Extended (not restructured): `.range-tabs`, `.range-tabs__item(.is-active)`,
`.custom-range-row`, `.custom-range-row .field`, `.report-range-label`,
`.dashboard__section-header`, `.dashboard__section-header .segmented`. No
existing rules were changed.

## Database Structure

Unchanged from Phase 1 — no migration needed this phase. Reports reads
sales entirely through the existing `listSales()` and filters client-side;
no new indexes or stores were added.

## Completed Features

- Reports: date-range selection (Today / Yesterday / Last 7 days / This
  month / Last month / Custom), range-scoped total/transactions/items/
  average, payment breakdown, and a revenue-or-quantity-rankable top-5
  product list.
- (Carried) Sales History dashboard ("Today"), full sale list with
  search/detail/delete/notes.
- (Carried) product/category/payment-method management, POS grid + cart,
  sales recording with price/name snapshots, responsive app shell,
  IndexedDB schema, error boundary.

## Known Issues

- **No automated checks (`npm install`/`tsc -b`/`build`/`oxlint`/
  `smoke-test`) were run this session** — see "Testing Status". This is
  the single biggest risk carried out of Phase 5: the new TypeScript code
  has been manually reviewed and its pure logic manually executed, but
  never actually type-checked or linted by the project's own toolchain.
- **Manual click-through has still not been done**, now across Phases 2–5
  — see PROJECT_STATUS.md.
- "This month"/"Last month" use the local system clock's calendar month
  boundaries (not UTC) — should be fine for a single-location coffee
  cart, not verified against a real device.
- (Carried from Phase 4) Top products in the Phase 4 "Today" dashboard
  are quantity-only by design; Reports offers both quantity and revenue.
- (Carried from Phase 4) Dashboard/Reports search and filtering are all
  client-side over `listSales()`'s full result — fine at small scale,
  worth revisiting if a cart's sale history grows very large.
- (Carried from Phase 3) "Cash" detection is by payment-method name
  match, not a stored flag.
- (Carried from Phase 2) No confirmation dialog before "Clear cart".
- (Carried from Phase 2) Cart state is in-memory only.
- (Carried from Phase 1) No UI yet for editing `settings`.

## Decisions Already Made

Carried from Phases 0–4 (still true, don't change without good reason):
IndexedDB over localStorage; `HashRouter`; plain CSS; self-hosted Manrope;
`SaleItem` snapshot pattern; soft-delete-only for products/categories/
payment methods; no confirmation dialogs for reversible one-tap actions;
cart stays in memory; cash detection by name match; sale-writing/reading
logic lives in `salesService.ts`; editing a saved sale is notes-only;
delete requires `window.confirm`.

New in Phase 5:

- **Range-aggregation logic lives in `utils/reportStats.ts`, not
  `salesService.ts` and not inline in either page component.** This is a
  deliberate departure from "one service per store" — `reportStats.ts`
  isn't a data-access layer, it's pure computation over data the caller
  already has, and keeping it dependency-free (see "Current Architecture")
  was judged more valuable than co-locating it with `salesService.ts`'s
  IndexedDB calls. If Phase 6 (Excel/PDF export) needs the same
  range/aggregation logic, import from `utils/reportStats.ts` rather than
  duplicating it again or moving it into `salesService.ts`.
- **Reports does client-side filtering over the full `listSales()` result**,
  per the Phase 5 brief's explicit suggestion — no date-range query logic
  was added to `salesService.ts`/`database/db.ts`. Revisit only if a real
  performance problem shows up with a much larger sale history.
- **Product performance defaults to revenue, not quantity** (toggle
  available) — see "Current Architecture" for the reasoning. This is a
  judgment call, worth confirming with the project owner like Phase 4's
  quantity-only choice was flagged for confirmation.
- **Date-range UI is a horizontal pill-tab scroller, not the fixed-width
  `.segmented` control** — see "Current Architecture" for why. The
  quantity/revenue toggle DOES use `.segmented`, since it's a 2-option
  choice.
- **`HistoryPage.tsx`'s "Today" dashboard and `ReportsPage.tsx` share
  their stats/aggregation logic** via `utils/reportStats.ts`, per the
  Phase 5 brief's suggestion to extract a shared helper rather than
  copy-pasting. `HistoryPage.tsx`'s own filtering (to "today") and layout
  are unchanged; only its internal computation was refactored.

## DO NOT CHANGE

Everything in Phases 0–4's version of this section still applies
(especially the price/name snapshot rule). Additionally, as of Phase 5:

- Don't give `utils/reportStats.ts` an import on `database/db.ts` or
  `services/salesService.ts`. It must keep taking `Sale[]` as a plain
  parameter so it stays testable without `node_modules` — this mattered
  concretely this session, since it was the only new code path that could
  actually be executed and verified.
- Don't change `resolveDateRange`'s date-key comparison approach (string
  comparison on `YYYY-MM-DD`, never `Date` object comparison) without
  re-running (or re-deriving) the year/month-boundary tests in
  `smoke-test-db.ts` section 7 — this is exactly the kind of logic that
  looks obviously correct and then breaks silently at a boundary.
- Don't move `formatDateKey`'s implementation back into `salesService.ts`
  — keep it in `utils/date.ts` with `salesService.ts` re-exporting it, or
  `reportStats.ts` regains its IndexedDB dependency.

## Next Phase

**PHASE 6 — Excel + PDF Export.** See `NEXT_PHASE_PROMPT.md` for the exact
brief.

## Recommended First Steps

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. **Before writing any Phase 6 code**, run `npm install && npx tsc -b &&
   npm run build && npx oxlint && npm run smoke-test`. This is more
   important than usual this time: Phase 5's code was never run through
   the real toolchain, so this is the first opportunity to catch any
   `tsc`/`oxlint` issues in `reportStats.ts`, `ReportsPage.tsx`, or the
   `HistoryPage.tsx` refactor. Fix anything that comes up before moving on
   — don't assume Phase 5's code is clean just because it was carefully
   reviewed.
3. **Do the manual click-through that's now been deferred across four
   phases**: record several real sales via the POS screen, exercise Sales
   History fully, and — new this time — exercise every Reports control
   (all 6 range presets, both custom date inputs including a reversed
   entry, and the revenue/quantity toggle) at both mobile and desktop
   widths, before building Export on top of it.
4. Read `src/utils/reportStats.ts` in full (it's short and dependency-
   free) — Phase 6's Excel/PDF export will very likely want to reuse
   `resolveDateRange`/`filterSalesByRange`/`computeSalesStats`/
   `computeProductPerformance` rather than recomputing anything.
5. Check the original master spec's Phase 6 section for what belongs there.
6. Update `PROJECT_STATUS.md`, `HANDOFF.md`, and replace
   `NEXT_PHASE_PROMPT.md` with Phase 7 instructions before stopping.

## Testing Status

| Check | Result |
|---|---|
| `npm install` | ❌ NOT run — this session's container returned 403 Forbidden from the npm registry (confirmed via both `npm ping` and an actual `npm install` attempt) |
| `npx tsc -b` | ❌ NOT run (requires `npm install` first) |
| `npm run build` | ❌ NOT run (requires `npm install` first) |
| `npx oxlint` | ❌ NOT run — no `oxlint` binary available anywhere in this environment, global or local |
| `npm run smoke-test` | ❌ NOT run — requires `fake-indexeddb` and `idb`, neither installed |
| `utils/reportStats.ts`'s pure functions | ✅ Manually verified — extracted into a standalone script and run with the globally-available `tsx` (needs no `node_modules` since the module has zero external imports); all range-resolution, filtering, and aggregation assertions passed, including month/year-boundary and empty-input edge cases. These same assertions now live in `smoke-test-db.ts` section 7 for the next session to run as part of the real suite. |
| Manual review of new/changed TSX for balanced JSX, correct prop shapes, consistent naming | ✅ Done by hand, file by file |
| Manual click-through (POS/checkout, Sales History, Reports) in a real/headed browser | ❌ Not done — no headed browser available in this environment, and this gap now spans Phases 2–5 |
| Real mobile device check | ❌ Not done |
| Confirmed Phase 0–4 functionality untouched | ⚠️ Reviewed by inspection only (not by running the smoke test): only `HistoryPage.tsx` (refactored, not behaviorally changed), `salesService.ts` (one function's implementation moved, re-exported for compatibility), `components.css` (extended), and `smoke-test-db.ts` (extended) were touched from Phase 0–4's set of files. No Phase 0–4 file's existing logic was deleted or altered. This should be re-confirmed by actually running `npm run smoke-test` next session, since Phase 4's own handoff relied on that run (not just inspection) for this same confirmation. |
