Project:
Coffee Cart POS

Current Phase:
PHASE 7 — Backup + Restore

Status:
COMPLETE, WITH THE SAME REAL CAVEAT AS PHASES 5 AND 6 — this session's
container again had NO npm registry access (`npm ping`/`npm install` both
fail with 403 Forbidden, confirmed fresh this session). That means
`npm install`, `npx tsc -b`, `npm run build`, `npx oxlint`, and
`npm run smoke-test` could NOT be run against the real project
dependencies. This is now the FOURTH session in a row (Phases 2, 3, 5, 6,
and now 7) without working npm access — only Phase 4's session had it.
See "Verification done instead" and "Known bugs / verification gaps"
below.

Completed:

* New `src/utils/backup.ts` — dependency-free (imports only type-only
  `../types` and `./date`'s `formatDateKey`):
  - `BACKUP_FORMAT_VERSION` (currently `1`) and the `BackupFile` type:
    `{ formatVersion, exportedAt, products, categories, paymentMethods,
    sales, saleItems, settings }` — one JSON object with one key per
    IndexedDB store, plus the version/timestamp metadata the Phase 7
    brief asked for so a future phase can evolve the format without
    guessing at old files.
  - `validateBackupFile(raw)` — checks `formatVersion` matches exactly,
    `exportedAt` is a non-empty string, each of
    products/categories/paymentMethods/sales/saleItems is an array of
    objects each carrying an `id`, and `settings` has string
    `businessName`/`currency`. Returns `{ valid: true, data }` or
    `{ valid: false, error }` — never throws. Deliberately a shape check,
    not a full per-record schema validator (see the file's header
    comment for why that's the right amount of validation here).
  - `serializeBackup(payload)` — pretty-printed (`JSON.stringify(...,
    null, 2)`) JSON, unlike the CSV export, since a backup is meant to be
    human-spot-checkable, not machine-summed.
  - `buildBackupFilename(now?)` — `coffee-cart-backup_2026-03-18.json`,
    following `salesExport.ts`'s date-stamped naming convention.
* New `src/services/backupService.ts` — the only new file that imports
  both `utils/backup.ts` and `database/db.ts`, same separation
  `reportStats.ts`/`salesExport.ts` keep from their IndexedDB-touching
  callers:
  - `buildBackupFile()` — reads every store (`products`, `categories`,
    `paymentMethods`, `sales`, `saleItems`, `settings`) via `getDB()` and
    shapes them into a `BackupFile`. No filtering of inactive
    products/categories/payment methods — a backup is a complete,
    restorable copy, not a report.
  - `restoreBackup(payload)` — **full replace, not a merge** (see
    "Decisions" below for the reasoning): clears all six stores and
    repopulates them from `payload`, all inside **one** `idb`
    transaction (`db.transaction([...6 stores...], "readwrite")`), the
    same multi-store-transaction shape `salesService.ts`'s
    `recordSale`/`deleteSale` use, so a failure partway through can't
    leave the database half-restored. Writes every `Sale`/`SaleItem`
    field — including each item's `productNameSnapshot`/
    `unitPriceSnapshot` — exactly as given in `payload`, never
    recomputed from live `products` data (the same price/name-snapshot
    rule as every prior phase). Assumes `payload` was already validated
    by the caller.
* New `src/components/BackupManager.tsx` — a "Back up" `Card` (button ->
  `buildBackupFile()` -> `serializeBackup()` -> `downloadTextFile()`,
  reusing Phase 6's download helper unchanged) and a "Restore" `Card`
  (button opens a hidden `<input type="file">` — this codebase's first
  file-input pattern — then: read the file's text, `JSON.parse`,
  `validateBackupFile`; on failure, show an inline error banner and write
  nothing; on success, an explicit `window.confirm` naming exactly what
  will be replaced and the backup's product/sale counts and export
  timestamp; only on confirmation does `restoreBackup()` run, followed by
  `window.location.reload()` so every screen reflects the restored data
  instead of stale in-memory state).
* `src/pages/ProductsPage.tsx` extended (not rewritten) with a fourth
  "Backup" tab alongside Products/Categories/Payment Methods, rendering
  `BackupManager` — see "Decisions" below for why it lives here rather
  than a new route.
* `scripts/smoke-test-db.ts` extended with a "9. Backup + Restore"
  section: `validateBackupFile`'s accept/reject cases (well-formed,
  null, wrong `formatVersion`, non-array section, incomplete `settings`),
  a serialize-then-reparse-still-validates round-trip,
  `buildBackupFilename`'s naming convention, and — unlike sections 7/8 —
  a REAL IndexedDB round-trip: `buildBackupFile()` the db's current
  state, mutate the live db afterward (add a product), `restoreBackup()`
  that earlier snapshot, then confirm the mutation is gone and every
  store's contents (including a `SaleItem` price snapshot) match the
  backup exactly.

No new CSS was needed — `BackupManager.tsx` reuses Phase 6's
`.export-card__hint`/`.export-actions`/`.dashboard__section-title` and
this project's existing `banner`/`banner--danger`/`banner--success`
classes as-is.

Verification done instead (no npm registry access this session):

* `utils/backup.ts`'s pure logic — `validateBackupFile` (accept + 9
  reject/edge cases), `serializeBackup`'s round-trip, and
  `buildBackupFilename` — was extracted into a standalone script and run
  directly with the globally-installed `tsx` (needs no `node_modules`,
  since the module has no external import). Every assertion passed. The
  same assertions now live in `smoke-test-db.ts` section 9's first half.
* `npx tsc --strict` (globally-installed `tsc`) was run directly against
  `utils/backup.ts` plus `utils/date.ts`/`types/index.ts` for context —
  zero errors. Sanity-checked by deliberately injecting a type error
  (`BACKUP_FORMAT_VERSION: string = 1`) into a scratch copy and
  confirming `tsc` actually caught it (it did), so the clean result is a
  real, if partial, signal.
* `backupService.ts` (which imports `idb` via `database/db.ts`) and
  `BackupManager.tsx`/`ProductsPage.tsx` (React) could NOT be
  type-checked this way — same gap as Phase 5's/6's `ReportsPage.tsx`.
  Manual review only: brace/paren/bracket balance was checked
  programmatically for all four new/changed files (all balanced), and
  `BackupManager.tsx`'s JSX was read by hand for balanced
  tags/fragments, hooks called unconditionally (no hooks after an early
  return), and `Button`/`Card` props matching their actual component
  signatures (`Button`'s `variant`/`disabled`/`onClick`; `Card`'s
  `style`/`children`) — both confirmed against the real component files.
* `smoke-test-db.ts`'s new section 9 (including the real-IndexedDB
  round-trip half) was written but **NOT executed** — it needs
  `fake-indexeddb`/`idb` from `node_modules`, neither installed. Running
  `tsx scripts/smoke-test-db.ts` this session fails immediately with
  `Cannot find package 'fake-indexeddb'`, confirmed and shown in this
  session's own log — the same failure Phases 5/6 hit for the full
  suite.

Current functionality:

* From the Products screen's new "Backup" tab: a "Back up" button that
  downloads a single dated JSON file containing every product, category,
  payment method, sale, and setting on the device; and a "Restore from
  file…" button that accepts a previously-exported backup file, validates
  it, asks for explicit confirmation naming exactly what will be
  replaced, and — only if confirmed — replaces all current data with the
  file's contents and reloads the page.
* Everything from Phases 0–6 (POS/cart, sales recording, Sales History +
  dashboard, Reports' date-range totals/breakdown/product performance,
  CSV + print/PDF export) unchanged — no existing file's logic was
  deleted or altered, only `ProductsPage.tsx` was extended with a new
  tab.

Known bugs / verification gaps:

* **No automated checks were run this phase either** —
  `npm install`/`tsc -b`/`build`/`oxlint`/the full `smoke-test` suite
  remain UNVERIFIED against the actual project dependencies for a
  fourth/fifth consecutive phase (only Phase 4 had working npm access).
  `backupService.ts`, `BackupManager.tsx`, and `ProductsPage.tsx`'s
  changes have only been manually reviewed, never compiled by the
  project's real `tsc`/React types, and section 9's real-IndexedDB
  round-trip test has never actually been run.
* **Manual click-through has still not been done** — now carried across
  Phases 2–7. For Backup/Restore specifically: nobody has exported a
  real backup file, inspected its contents, and restored it in a
  real/headed browser to confirm the app reflects the restored data
  afterward. This is the single most important thing to verify before
  trusting Restore with real data, since it's the first genuinely
  destructive action in this app.
* **`restoreBackup`'s full-replace behavior has only been reasoned
  about, never watched happen.** The logic (clear then repopulate all
  six stores in one transaction) mirrors `recordSale`/`deleteSale`'s
  already-working pattern, but a multi-store `clear()` + bulk `put()`
  transaction is a new shape for this codebase and deserves an actual
  click-through, not just code review.
* The hidden `<input type="file">` pattern in `BackupManager.tsx` is
  this codebase's first file input — untested on a real mobile browser's
  file picker (Android/iOS variants can differ in how they present
  "choose a JSON file").
* No format-version MIGRATION path exists yet — `validateBackupFile`
  rejects anything that isn't exactly `formatVersion: 1` rather than
  attempting to upgrade an older file. Fine for now (there's only ever
  been one format), but worth remembering if a future phase changes the
  backup shape.
* (Carried) Everything in Phase 6's "Known bugs" list, including the
  still-outstanding manual click-through for Phases 2–6's own features.

Next phase:

PHASE 8 — Offline + PWA
