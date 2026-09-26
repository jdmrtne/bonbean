# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 6 — COMPLETE, with no automated checks run this session (no npm
registry access in this container, confirmed fresh — see "Testing
Status"). Manual browser/device click-through is also still outstanding,
same as every prior phase.

## Overall Project Progress

```
PHASE 0  — Project Foundation           — COMPLETE
PHASE 1  — Database + Product Mgmt      — COMPLETE
PHASE 2  — POS + Cart                   — COMPLETE (pending human verification)
PHASE 3  — Sales Recording              — COMPLETE (automated checks passed Phase 4's session; pending human click-through)
PHASE 4  — Sales History + Dashboard    — COMPLETE (automated checks passed Phase 4's session; pending human click-through)
PHASE 5  — Reports                      — COMPLETE (NO automated checks run that session — no npm registry access; pending human click-through)
PHASE 6  — Excel + PDF Export           — COMPLETE (NO automated checks run this session either — no npm registry access; pending human click-through)
PHASE 7  — Backup + Restore             — NOT STARTED
PHASE 8  — Offline + PWA                — NOT STARTED
PHASE 9  — Polish + Mobile UX           — NOT STARTED
PHASE 10 — Final QA + Release            — NOT STARTED
```

**Important note on this session's environment:** same situation as Phase
5 — this container's `npm install` fails outright (403 Forbidden from the
npm registry, reconfirmed via both `npm ping` and a real `npm install`
attempt at the start of this session, not assumed from Phase 5's notes).
`tsc -b`, `npm run build`, `npx oxlint`, and the real `npm run
smoke-test` could not be run. This is now the third phase session (2, 3,
5, 6 — 4 had access) without the real toolchain. See "Testing Status"
below for exactly what was and wasn't verified instead.

## What Has Been Built

Everything from Phases 0–5 (app shell, routing, design tokens, IndexedDB
schema, Product/Category/Payment Method management, the POS grid and
cart, sales recording with price/name snapshots, Sales History with a
"Today" dashboard, Reports with 6 date-range presets and a revenue/
quantity-toggleable product performance list), **plus**, from Phase 6:

- New `src/utils/csv.ts` — `escapeCsvField(value)`, `rowsToCsv(headers,
  rows)`. A hand-written, dependency-free CSV encoder (RFC 4180-style
  escaping: quote a field only if it contains a comma/quote/newline,
  double internal quotes; CRLF line endings). Written by hand rather than
  adding a CSV/Excel library, given this environment's spotty npm
  registry access across sessions — see "Decisions Already Made".
- New `src/utils/salesExport.ts` — `buildTransactionLineRows(sales)`,
  `transactionRowsToCsv(rows)`, `buildExportFilename(range, ext)`. Also
  dependency-free (imports only `../types` as a type and `DateRange`'s
  type from `./reportStats` — no `salesService.ts`/`db.ts` import, same
  discipline as `reportStats.ts`). One CSV row per **line item**, not per
  sale — see "Decisions Already Made" for the reasoning.
- New `src/utils/download.ts` — `downloadTextFile(filename, content,
  mimeType)`. Browser-only Blob + object-URL download trigger; not pure,
  not smoke-tested.
- `src/pages/ReportsPage.tsx` extended with an "Export" `Card` (CSV
  download button + Print/Save-as-PDF button) and a `.print-only` header
  block (business name, range, generated timestamp) that's invisible on
  screen and only shown by the new print stylesheet.
- `src/styles/components.css` extended with `.export-*`, `.print-only`,
  `.print-only-inline`, `.print-report-header*`, and an `@media print`
  block.
- `scripts/smoke-test-db.ts` extended with an "8. CSV export" section.

Still not built: backup/restore, offline/PWA support. Those are Phases
7–8, in order.

## Current Architecture

Unchanged from Phases 0–5. Additions this phase:

- **`utils/csv.ts` and `utils/salesExport.ts` are deliberately
  dependency-free**, same discipline as Phase 5's `reportStats.ts`:
  `salesExport.ts` imports only `../types` (type-only) and `DateRange`
  (also type-only) from `./reportStats`, and takes `Sale[]` as a plain
  parameter rather than reading sales itself. This is why both modules
  could be unit-tested this session (with a bare `tsx` invocation, zero
  `node_modules`) despite having no npm registry access — the same
  mitigation Phase 5 relied on. If you're tempted to have
  `salesExport.ts` call into `salesService.ts` or `getDB()` directly
  (e.g. to fetch its own data instead of taking `Sale[]`), don't — for
  the same reason `reportStats.ts` avoids it.
- **CSV export is one row per SALE ITEM, not one row per sale.** A sale
  with 3 line items becomes 3 CSV rows sharing the same
  `saleId`/`date`/`time`/`paymentMethod`/`saleTotal`. Reasoning: an
  owner's accountant/bookkeeper wants product-level detail (what sold, at
  what price), and the per-transaction totals/averages/breakdown are
  already covered by the report itself (on screen and in the printed/PDF
  export) — duplicating that as a second CSV format felt like more
  surface area for less value. The original transaction is still fully
  reconstructable by grouping CSV rows on `saleId`, so nothing is lost by
  not also offering a one-row-per-sale format. If a future session or the
  project owner wants a one-row-per-sale summary CSV too, it's a small
  addition to `salesExport.ts` (map `rangeSales` directly instead of
  flattening `items`) — not a redesign.
- **CSV amounts have no currency symbol** (`"150.00"`, not `"₱150.00"`)
  — deliberately, since a spreadsheet/bookkeeping tool wants a numeric
  column it can sum directly. The app's currency symbol
  (`utils/money.ts`'s `formatMoney`) is a display-layer concern that
  doesn't belong in the export. If a future phase needs the currency
  symbol in the file (e.g. for multi-currency businesses), it should be a
  separate metadata field/row, not baked into each amount cell.
- **No PDF-generation library was added.** The Phase 6 brief asked for
  "something presentable enough to hand to someone else, not just a data
  dump." Given this environment's inability to verify a new heavy
  dependency (a `jsPDF`-style library) via a real `npm install` this
  session — the same constraint that shaped Phase 5's date/aggregation
  code — the export uses the browser's own print stylesheet
  (`window.print()` + `@media print` CSS) instead. This has three
  concrete advantages over adding a library: (1) zero new dependencies,
  so nothing here depends on npm access ever working; (2) it prints the
  *exact* on-screen report DOM, so the PDF can never drift out of sync
  with what the owner sees on screen (a hand-built PDF layout is a
  second place the same numbers could be formatted incorrectly); (3)
  "Save as PDF" is a standard, offline-capable destination in every
  modern desktop and mobile browser's print dialog, consistent with the
  "must work fully offline" requirement. The trade-off: the printed
  layout is governed by CSS print rules rather than pixel-precise PDF
  layout code, and it hasn't been visually verified in a headed browser
  this session (see "Testing Status"). If a future session/owner
  specifically wants a library-generated PDF (e.g. for tighter layout
  control, letterhead, multi-page pagination beyond what CSS page-breaks
  give you), that's a deliberate reversal of this decision, not a bug fix
  — flag it for confirmation first, the same way Phase 4's and Phase 5's
  own judgment calls were flagged.
- **No separate export was added to `HistoryPage.tsx`.** The Phase 6
  brief asked whether a full-history (all-time) export was worth a
  separate control there, or whether Reports' "Custom" range already
  covers it. Decision: Reports' "Custom" range can already be set from a
  cart's very first sale date through today, which produces exactly a
  full-history export through the same CSV/print buttons — adding a
  second, parallel export entry point on `HistoryPage.tsx` would be a
  second place to keep in sync with `salesExport.ts` for no real gain.
  If real usage shows owners want a literal one-tap "export everything"
  shortcut (skipping picking a custom start date), that's a small
  addition — e.g. a "Custom (all-time)" preset, or defaulting the custom
  range's start to the earliest sale's date — not a new export system.
- **The Export card lives inside `ReportsPage.tsx`'s existing
  `Card`/`Button` pattern**, in the same non-empty-range block as the
  stat cards/breakdown/product performance (so it's not shown when a
  range has zero sales — there's nothing to export). No new modal, menu,
  or interaction pattern was introduced, per the Phase 6 brief's
  preference for consistency with the app's existing touch-friendly
  design.
- **`.no-print` / `.print-only` / `.print-only-inline` are the print
  stylesheet's only new conventions.** `.no-print` hides anything
  interactive/navigational when printing (range tabs, custom-range date
  inputs, the quantity/revenue toggle, the Export card's own buttons, the
  app shell's sidebar/topbar/tabbar). `.print-only` shows the new report
  header only when printing. `.print-only-inline` is the same idea for
  an inline `<span>` (used to note "(by revenue)"/"(by quantity)" next to
  "Product performance" in print, since the on-screen toggle that shows
  the same information is itself `.no-print`).

## Important Files

Everything in Phases 0–5's handoff still applies. New/changed this phase:

`src/utils/csv.ts`
→ New. `escapeCsvField(value: string | number): string`,
`rowsToCsv(headers: string[], rows: (string | number)[][]): string`. Zero
imports.

`src/utils/salesExport.ts`
→ New. Imports only `./csv`, a type from `../types`, and a type from
`./reportStats`. Exports: `TransactionLineRow` (type),
`buildTransactionLineRows`, `transactionRowsToCsv`, `buildExportFilename`,
plus re-exports of `escapeCsvField`/`rowsToCsv` from `./csv` for
convenience.

`src/utils/download.ts`
→ New. `downloadTextFile(filename, content, mimeType): void`. Browser-
only (Blob/URL/DOM). Not smoke-tested — see that file's header comment.

`src/pages/ReportsPage.tsx`
→ Extended (not rewritten): new `businessName` state (from
`getSettings()`, alongside the existing `currency`); `handleDownloadCsv`
and `handlePrint` handlers; a `.print-only` report header block; `.no-
print` added to the range tabs, custom-range row, range label, and the
product-performance sort toggle; a new "Export" `Card` with the two
buttons, placed inside the existing non-empty-range branch.

`src/styles/components.css`
→ Extended (not restructured): `.export-card__hint`, `.export-actions`
(+ `.export-actions .btn`), `.print-only`, `.print-only-inline`,
`.print-report-header*`, and an `@media print` block. No existing rules
were changed.

`scripts/smoke-test-db.ts`
→ Extended with an "8. CSV export" section (after the existing "7.
Report stats", which is unrenumbered/unchanged). Tests
`escapeCsvField`/`rowsToCsv` escaping edge cases, `buildTransactionLineRows`
against a hand-built 2-item sale fixture (spread from `secondSale`, same
pattern section 7 uses), the resulting CSV's shape, and both
`buildExportFilename` branches. Does not touch `db`/`getDB()`.

## Database Structure

Unchanged from Phase 1 — no migration needed this phase. Export reads
sales entirely through the existing `listSales()` (via `ReportsPage.tsx`'s
already-loaded `rangeSales`) and shapes rows client-side; no new indexes
or stores were added.

## Completed Features

- Export (Reports): "Download CSV" (one row per line item, current date
  range) and "Print / Save as PDF" (the on-screen report summary,
  formatted via a print stylesheet) buttons on the Reports screen.
- (Carried) Reports: date-range selection, range-scoped totals, payment
  breakdown, revenue-or-quantity-rankable product performance.
- (Carried) Sales History dashboard ("Today"), full sale list with
  search/detail/delete/notes.
- (Carried) product/category/payment-method management, POS grid + cart,
  sales recording with price/name snapshots, responsive app shell,
  IndexedDB schema, error boundary.

## Known Issues

- **No automated checks (`npm install`/`tsc -b`/`build`/`oxlint`/
  `smoke-test`) were run this session either** — see "Testing Status".
  This is now true for Phases 2, 3, 5, AND 6 — only Phase 4's session had
  working npm access. `ReportsPage.tsx`'s Phase 6 JSX changes in
  particular have only been manually reviewed, never compiled by the
  project's real `tsc`/React types.
- **Manual click-through has still not been done**, now across Phases
  2–6 — see PROJECT_STATUS.md. For Export specifically: the CSV has never
  been opened in a real spreadsheet app, and the print/PDF output has
  never been viewed in a real/headed browser (no headed browser was
  available in this environment, and Playwright — installed globally —
  has no downloaded browser binaries in this container).
- No PDF-generation library was added; the "PDF export" is a browser
  print stylesheet (`window.print()`). See "Decisions Already Made" for
  the full reasoning and what a future session should treat as a
  deliberate reversal (not a bug fix) if a real PDF library is wanted
  later.
- CSV export doesn't add a UTF-8 BOM; unlikely to matter since the export
  currently has no currency symbols, but worth a real-Excel check during
  the manual click-through, especially for product names with accented
  characters.
- (Carried from Phase 5) "This month"/"Last month" use the local system
  clock's calendar month boundaries (not UTC) — should be fine for a
  single-location coffee cart, not verified against a real device.
- (Carried from Phase 4) Top products in the Phase 4 "Today" dashboard
  are quantity-only by design; Reports offers both quantity and revenue.
- (Carried from Phase 4) Dashboard/Reports search and filtering, and now
  Export, are all client-side over `listSales()`'s full result — fine at
  small scale, worth revisiting if a cart's sale history grows very
  large.
- (Carried from Phase 3) "Cash" detection is by payment-method name
  match, not a stored flag.
- (Carried from Phase 2) No confirmation dialog before "Clear cart".
- (Carried from Phase 2) Cart state is in-memory only.
- (Carried from Phase 1) No UI yet for editing `settings`.

## Decisions Already Made

Carried from Phases 0–5 (still true, don't change without good reason):
IndexedDB over localStorage; `HashRouter`; plain CSS; self-hosted Manrope;
`SaleItem` snapshot pattern; soft-delete-only for products/categories/
payment methods; no confirmation dialogs for reversible one-tap actions;
cart stays in memory; cash detection by name match; sale-writing/reading
logic lives in `salesService.ts`; editing a saved sale is notes-only;
delete requires `window.confirm`; range-aggregation logic lives in
`utils/reportStats.ts`; Reports filters client-side over the full
`listSales()` result; product performance defaults to revenue; date-range
UI is a pill-tab scroller, not `.segmented`.

New in Phase 6:

- **CSV export is one row per line item, not one row per sale** — see
  "Current Architecture" for the reasoning. Don't quietly change this to
  one-row-per-sale; add a second export format instead if that's ever
  wanted, so the line-item detail isn't lost.
- **No currency symbol in CSV amounts** — plain numbers with 2 decimals,
  for spreadsheet-friendliness. See "Current Architecture".
- **No PDF-generation library — "PDF export" is `window.print()` + a
  print stylesheet.** This was a deliberate choice under this
  environment's dependency-verification constraints, not a placeholder.
  See "Current Architecture" for the full reasoning and reversal
  conditions.
- **No separate export control on `HistoryPage.tsx`** — Reports'
  "Custom" range (which can span a cart's entire history) is considered
  sufficient for a full-history export. See "Current Architecture".
- **`utils/csv.ts` and `utils/salesExport.ts` stay dependency-free**,
  same discipline as `utils/reportStats.ts` — see "Current Architecture".

## DO NOT CHANGE

Everything in Phases 0–5's version of this section still applies
(especially the price/name snapshot rule, and Phase 5's rule that
`utils/reportStats.ts` must not import `database/db.ts` or
`services/salesService.ts`). Additionally, as of Phase 6:

- Don't give `utils/csv.ts` or `utils/salesExport.ts` an import on
  `database/db.ts` or `services/salesService.ts`, for the same reason as
  `reportStats.ts` — they must keep taking `Sale[]`/rows as plain
  parameters so they stay testable without `node_modules`. This mattered
  concretely again this session, since it was the only new code path
  that could actually be executed and verified.
- Don't change `transactionRowsToCsv`'s column order/names without
  updating `smoke-test-db.ts` section 8's header-string assertion — it's
  an exact string match by design, since a bookkeeper depending on column
  position is exactly the kind of thing that should break loudly in a
  test rather than silently in someone's spreadsheet import.
- Don't remove the CSV's CRLF line endings (`rowsToCsv` joins with
  `"\r\n"`) — some spreadsheet apps (older Excel on Windows in
  particular) are pickier about bare `\n`.

## Next Phase

**PHASE 7 — Backup + Restore.** See `NEXT_PHASE_PROMPT.md` for the exact
brief.

## Recommended First Steps

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. **Before writing any Phase 7 code**, run `npm install && npx tsc -b &&
   npm run build && npx oxlint && npm run smoke-test`. This is now
   overdue: Phases 5 AND 6's code have never been run through the real
   toolchain. If this container has working npm access (check early,
   don't assume), this is the first opportunity to catch any `tsc`/
   `oxlint` issues in `reportStats.ts`, `ReportsPage.tsx` (both phases'
   changes), `csv.ts`, or `salesExport.ts`. Fix anything that comes up
   before moving on.
3. **Do the manual click-through that's now been deferred across five
   phases**: record several real sales via the POS screen, exercise Sales
   History fully, exercise every Reports control (all 6 range presets,
   both custom date inputs, the revenue/quantity toggle), and — new this
   time — click "Download CSV" and open the file in a real spreadsheet
   app, and click "Print / Save as PDF" and actually look at the result,
   at both mobile and desktop widths.
4. Read `src/utils/salesExport.ts` and `src/utils/csv.ts` in full (both
   short and dependency-free) if Phase 7 (Backup + Restore) needs to
   serialize sales/products/etc. to a file — consider whether a JSON
   backup format wants any of the same "plain params in, dependency-free
   module" discipline these modules and `reportStats.ts` use.
5. Check the original master spec's Phase 7 section for what belongs
   there.
6. Update `PROJECT_STATUS.md`, `HANDOFF.md`, and replace
   `NEXT_PHASE_PROMPT.md` with Phase 8 instructions before stopping.

## Testing Status

| Check | Result |
|---|---|
| `npm install` | ❌ NOT run — this session's container returned 403 Forbidden from the npm registry (confirmed via both `npm ping` and an actual `npm install` attempt, at the start of this session) |
| `npx tsc -b` | ❌ NOT run (requires `npm install` first) |
| `npm run build` | ❌ NOT run (requires `npm install` first) |
| `npx oxlint` | ❌ NOT run — no `oxlint` binary available anywhere in this environment, global or local |
| `npm run smoke-test` | ❌ NOT run — requires `fake-indexeddb` and `idb`, neither installed |
| `utils/csv.ts` + `utils/salesExport.ts`'s pure functions | ✅ Manually verified — extracted into a standalone script and run with the globally-available `tsx` (zero `node_modules` needed); all escaping, row-shaping, and filename assertions passed, plus a cross-check that Phase 5's `reportStats.ts` still works alongside the new module. These same assertions now live in `smoke-test-db.ts` section 8. |
| `tsc --strict` on the new dependency-free files only | ✅ Run directly with the globally-installed `tsc` (not the project's pinned version) against `utils/csv.ts` + `utils/salesExport.ts` (plus `reportStats.ts`/`date.ts`/`types/index.ts` for context) — zero errors. Sanity-checked by injecting a real type error into a scratch copy first and confirming it was caught, so this is a genuine (if partial) signal. **`ReportsPage.tsx` was NOT type-checked this way** — no reliable React type stubs were available in this environment (Phase 5 tried and abandoned building crude ones); manual review only. |
| Manual review of new/changed TSX for balanced JSX, correct prop shapes, consistent naming | ✅ Done by hand, file by file |
| CSS brace-balance check on `components.css`'s new rules | ✅ Done programmatically (not a substitute for a real CSS parser/build, but catches a missing/extra brace) |
| Manual click-through (POS/checkout, Sales History, Reports, and now Export — opening the CSV in a spreadsheet app and viewing the print/PDF output) in a real/headed browser | ❌ Not done — no headed browser available in this environment (Playwright is installed globally but has no downloaded browser binaries, and this container has no way to fetch one), and this gap now spans Phases 2–6 |
| Real mobile device check | ❌ Not done |
| Confirmed Phase 0–5 functionality untouched | ⚠️ Reviewed by inspection only (not by running the smoke test): only `ReportsPage.tsx` (extended with the Export card/print header) and `components.css`/`smoke-test-db.ts` (both extended, not restructured) were touched from Phase 0–5's set of files this phase. No Phase 0–5 file's existing logic was deleted or altered. This should be re-confirmed by actually running `npm run smoke-test` next session, since Phase 4's own handoff relied on that run (not just inspection) for this same confirmation, and it hasn't happened since. |
