Project:
Coffee Cart POS

Current Phase:
PHASE 6 — Excel + PDF Export

Status:
COMPLETE, WITH THE SAME REAL CAVEAT AS PHASE 5 — this session's container
again had NO npm registry access (`npm ping`/`npm install` both fail with
403 Forbidden, confirmed fresh this session, not assumed from Phase 5's
notes). That means `npm install`, `npx tsc -b`, `npm run build`,
`npx oxlint`, and `npm run smoke-test` could NOT be run against the real
project dependencies. This is now the THIRD session in a row (Phases 2, 3,
5, and now 6) without working npm access. See "Verification done instead"
and "Known bugs / verification gaps" below.

Completed:

* New `src/utils/csv.ts` — a tiny, dependency-free RFC-4180-ish CSV
  encoder (`escapeCsvField`, `rowsToCsv`). Not a library dependency —
  written by hand specifically because this environment can't reliably
  install new npm packages session to session, and the logic needed is a
  handful of lines.
* New `src/utils/salesExport.ts` — also dependency-free (only imports
  `../types` (type-only) and a type from `./reportStats`):
  - `buildTransactionLineRows(sales)` — turns a `Sale[]` into one row
    **per line item** (not per sale). Decision, documented in the file:
    an accountant/bookkeeper wants product-level detail; the per-
    transaction totals are already covered by the on-screen/printed
    report. Rows from the same sale share a `saleId` so the original
    transaction is still regroupable.
  - `transactionRowsToCsv(rows)` — fixed 10-column header (Date, Time,
    Sale ID, Payment method, Product, Unit price, Quantity, Line total,
    Sale total, Notes); amounts are plain numbers with 2 decimals and no
    currency symbol (a spreadsheet wants to sum a numeric column).
  - `buildExportFilename(range, ext)` — `sales-report_2026-03-18.csv` for
    a single-day range, `sales-report_2026-03-01_to_2026-03-18.csv` for a
    multi-day one. Shared by the CSV filename and could be reused for a
    future export format.
  - Every amount/name comes from the `Sale`/`SaleItem` price/name
    **snapshot** — never a live product look-up. Falls out naturally from
    only ever reading fields already on `Sale`, but called out explicitly
    in the file per the Phase 6 brief.
* New `src/utils/download.ts` — `downloadTextFile(filename, content,
  mimeType)`, a small Blob + object-URL download helper. Browser-only
  (DOM/Blob/URL APIs), not pure, not smoke-tested — same category as
  `utils/id.ts`'s `crypto` usage.
* `src/pages/ReportsPage.tsx` extended with an "Export" card (below
  Product performance, inside the same non-empty-range block, so there's
  nothing to export when a range has zero sales):
  - **"Download CSV"** — builds `transactionRowsToCsv` from the exact
    `rangeSales` the on-screen stats already use, so the export can never
    disagree with the report on screen.
  - **"Print / Save as PDF"** — calls `window.print()`. See "Decisions"
    below for why no PDF-generation library was added.
  - A print-only header (business name, "Sales report — <range>",
    "Generated <timestamp>") is rendered but hidden on screen
    (`.print-only`), and shown only by the new `@media print` CSS.
* `src/styles/components.css` extended (not restructured):
  `.export-card__hint`, `.export-actions`, `.print-only`,
  `.print-only-inline`, `.print-report-header*`, and an `@media print`
  block that hides the app shell (sidebar/topbar/tabbar) and every
  `.no-print`-marked control (range tabs, custom-range inputs, the
  quantity/revenue toggle, the Export card's own buttons), reveals
  `.print-only` content, and lets `.card`s print as bordered boxes
  instead of shadowed cards.
* `scripts/smoke-test-db.ts` extended with an "8. CSV export" section:
  `escapeCsvField`/`rowsToCsv` escaping edge cases (comma, quote,
  newline), `buildTransactionLineRows` producing one row per line item
  from a 2-item sale fixture (with a comma in its notes), the resulting
  CSV's header/line count/escaping, and both `buildExportFilename`
  branches (single-day vs. multi-day). Needs no IndexedDB, matching
  `reportStats.ts`'s and `salesExport.ts`'s dependency-free design.

Verification done instead (no npm registry access this session):

* All of `utils/csv.ts` and `utils/salesExport.ts`'s pure logic — the
  exact assertions now in `smoke-test-db.ts` section 8, plus a
  cross-check that `utils/reportStats.ts` (Phase 5) is still importable
  and working alongside the new module — were extracted into a
  standalone script and run directly with the globally-installed `tsx`
  (needs no `node_modules`, since neither module has any external
  import). Every assertion passed.
* `npx tsc --strict` (the globally-installed `tsc`, not the project's
  pinned version) was run directly against just the new dependency-free
  files (`utils/csv.ts`, `utils/salesExport.ts`, plus `utils/reportStats.ts`,
  `utils/date.ts`, and `types/index.ts` for context) — zero errors. This
  check was sanity-checked by deliberately injecting a type error into a
  scratch copy and confirming `tsc` actually caught it, so a clean result
  here is a real (if partial) signal, not a silently-broken check.
  `ReportsPage.tsx` itself was **not** type-checked this way — Phase 5
  tried building crude stand-in `.d.ts` stubs for `react` and abandoned
  that attempt as unreliable (false positives on untouched files), and
  this session didn't repeat that attempt.
* Careful manual review of `ReportsPage.tsx`'s new JSX (balanced
  tags/fragments, hooks called unconditionally before any early return,
  `Button`/`Card` props matching their actual component signatures) and
  of `components.css`'s new rules (brace-balance checked
  programmatically).

Current functionality:

* From the Reports screen, for whatever date range is selected: a
  "Download CSV" button producing one CSV row per line item sold in that
  range, and a "Print / Save as PDF" button that prints the exact
  on-screen report (stat cards, payment breakdown, product performance)
  as a clean, standalone-looking document via the browser's own print/
  Save-as-PDF flow.
* No separate export was added to `HistoryPage.tsx` — see "Decisions"
  below for why Reports' "Custom" range (which can span all the way back
  to a cart's first sale) was judged sufficient for a full-history
  export, rather than adding a second, parallel export control.
* Everything from Phases 0–5 (POS/cart, sales recording, Sales History +
  dashboard, Reports' date-range totals/breakdown/product performance)
  unchanged.

Known bugs / verification gaps:

* **No automated checks were run this phase either** — `npm install`,
  `tsc -b`, `build`, `oxlint`, and the full `smoke-test` suite remain
  UNVERIFIED against the actual project dependencies (`idb`, `react`,
  `react-router-dom`, `fake-indexeddb`, etc.) for a third/fourth
  consecutive phase. `ReportsPage.tsx`'s new JSX in particular has only
  been manually reviewed, never actually compiled by the project's real
  `tsc`.
* **Manual click-through has still not been done** — now carried across
  Phases 2–6. For Export specifically: nobody has actually clicked
  "Download CSV" and opened the resulting file in a spreadsheet app, or
  clicked "Print / Save as PDF" and looked at the resulting PDF, in a
  real/headed browser. The print stylesheet in particular (`@media
  print`) has only been read, never rendered — there was no headed
  browser available in this environment to check it against (Playwright
  is installed globally but has no downloaded browser binaries, and
  fetching one would itself need registry/CDN access this container
  doesn't have).
* The CSV export has no explicit Excel/BOM handling
  (`\uFEFF` byte-order mark) for guaranteeing correct UTF-8 rendering of
  the ₱ symbol or other non-ASCII product names if opened directly in
  older versions of Excel — the export doesn't currently include the
  currency symbol at all (see "Decisions"), which sidesteps the most
  likely case, but a product name with accented characters could still
  be affected in an old Excel version. Worth a quick real-Excel check
  during the manual click-through.
* `window.print()`'s output depends on the browser/OS's own print-to-PDF
  implementation — untested across browsers/devices as part of this
  phase.
* (Carried) Everything in Phase 5's "Known bugs" list, including the
  still-outstanding manual click-through for Phases 2–5's own features.

Next phase:

PHASE 7 — Backup + Restore
