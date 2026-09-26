# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 7 — COMPLETE, with no automated checks run this session (no npm
registry access in this container, confirmed fresh — see "Testing
Status"). Manual browser/device click-through is also still outstanding,
same as every prior phase, and is now MORE important than usual since
Restore is this app's first genuinely destructive action.

## Overall Project Progress

```
PHASE 0  — Project Foundation           — COMPLETE
PHASE 1  — Database + Product Mgmt      — COMPLETE
PHASE 2  — POS + Cart                   — COMPLETE (pending human verification)
PHASE 3  — Sales Recording              — COMPLETE (automated checks passed Phase 4's session; pending human click-through)
PHASE 4  — Sales History + Dashboard    — COMPLETE (automated checks passed Phase 4's session; pending human click-through)
PHASE 5  — Reports                      — COMPLETE (NO automated checks run that session — no npm registry access; pending human click-through)
PHASE 6  — Excel + PDF Export           — COMPLETE (NO automated checks run that session either — no npm registry access; pending human click-through)
PHASE 7  — Backup + Restore             — COMPLETE (NO automated checks run this session either — no npm registry access; pending human click-through, especially Restore)
PHASE 8  — Offline + PWA                — NOT STARTED
PHASE 9  — Polish + Mobile UX           — NOT STARTED
PHASE 10 — Final QA + Release            — NOT STARTED
```

**Important note on this session's environment:** same situation as
Phases 5 and 6 — this container's `npm install` fails outright (403
Forbidden from the npm registry, reconfirmed via both `npm ping` and a
real `npm install` attempt at the start of this session). `tsc -b`,
`npm run build`, `npx oxlint`, and the real `npm run smoke-test` could
not be run. This is now the fourth phase session (2, 3, 5, 6, 7 — only 4
had access) without the real toolchain. See "Testing Status" below for
exactly what was and wasn't verified instead.

## What Has Been Built

Everything from Phases 0–6 (app shell, routing, design tokens, IndexedDB
schema, Product/Category/Payment Method management, the POS grid and
cart, sales recording with price/name snapshots, Sales History with a
"Today" dashboard, Reports with 6 date-range presets and a
revenue/quantity-toggleable product performance list, CSV export and a
print/"Save as PDF" report), **plus**, from Phase 7:

- New `src/utils/backup.ts` — `BACKUP_FORMAT_VERSION` (`1`), the
  `BackupFile` type (`formatVersion`, `exportedAt`, plus one array/object
  per IndexedDB store: `products`, `categories`, `paymentMethods`,
  `sales`, `saleItems`, `settings`), `validateBackupFile(raw)` (shape
  validation, returns a discriminated `{ valid, ... }` result rather than
  throwing), `serializeBackup(payload)` (pretty-printed JSON), and
  `buildBackupFilename(now?)` (date-stamped naming, mirroring
  `salesExport.ts`'s `buildExportFilename`). Dependency-free — imports
  only type-only `../types` and `./date`'s `formatDateKey` — same
  discipline as `reportStats.ts`/`salesExport.ts`, so it's unit-testable
  with a bare `tsx` invocation.
- New `src/services/backupService.ts` — `buildBackupFile()` (reads all
  six stores via `getDB()`, shapes them into a `BackupFile`) and
  `restoreBackup(payload)` (clears and repopulates all six stores from
  `payload` inside one `idb` transaction — see "Current Architecture"
  for the full reasoning). This is the only new file that imports both
  `utils/backup.ts` and `database/db.ts`.
- New `src/components/BackupManager.tsx` — the UI: a "Back up" button
  and a "Restore from file…" button (backed by this codebase's first
  `<input type="file">`), with validation, an explicit
  `window.confirm`, and a post-restore `window.location.reload()`. See
  "Current Architecture" for the full flow.
- `src/pages/ProductsPage.tsx` extended with a fourth "Backup" tab.
- `scripts/smoke-test-db.ts` extended with a "9. Backup + Restore"
  section (pure validation/serialization assertions PLUS a real
  IndexedDB build-then-restore round-trip — see "Testing Status" for why
  the latter couldn't actually be run this session).

Still not built: offline/PWA support (service worker, manifest,
installability). That's Phase 8, next.

## Current Architecture

Unchanged from Phases 0–6. Additions this phase:

- **`utils/backup.ts` is deliberately dependency-free**, same discipline
  as `reportStats.ts`/`salesExport.ts`: it only imports type-only
  `../types` and `./date` (itself dependency-free), and takes/returns
  plain data rather than touching IndexedDB. This is why its logic could
  be unit-tested this session (bare `tsx`, zero `node_modules`) despite
  no npm registry access. `services/backupService.ts` is the ONLY file
  that bridges `utils/backup.ts`'s plain `BackupFile` shape and the real
  `getDB()`/IndexedDB — if you're tempted to have `utils/backup.ts` call
  `getDB()` itself, don't, for the same reason `reportStats.ts` and
  `salesExport.ts` avoid it.
- **A backup file is one JSON object with one key per store**, plus
  `formatVersion` and `exportedAt` metadata:
  ```json
  {
    "formatVersion": 1,
    "exportedAt": "2026-03-18T10:00:00.000Z",
    "products": [...],
    "categories": [...],
    "paymentMethods": [...],
    "sales": [...],
    "saleItems": [...],
    "settings": { "businessName": "...", "currency": "₱" }
  }
  ```
  `formatVersion` is checked for an EXACT match by `validateBackupFile` —
  there's no migration path yet (only one format has ever existed), so a
  mismatched version is rejected outright with a clear message rather
  than guessed at.
- **Restore is a FULL REPLACE, not a merge.** `restoreBackup` clears
  all six stores, then repopulates every one of them from the backup
  file, inside a single `idb` transaction spanning all six stores (same
  multi-store-transaction shape as `salesService.ts`'s
  `recordSale`/`deleteSale` — see that file's comments for the
  precedent). Reasoning, in order of weight:
  1. It matches an owner's mental model of "restore my backup" — what's
     in the file is what you get back, with zero ambiguity about what
     happens to anything not in it.
  2. A merge raises id-collision and duplicate-sale questions with no
     good universal default (if a sale with the same id exists on both
     sides but differs, which wins? what if two different devices
     recorded sales with colliding generated ids?) — full replace has
     none of these questions.
  3. The destructiveness is offset by an explicit, honestly-worded
     `window.confirm` in `BackupManager.tsx` BEFORE `restoreBackup` is
     ever called — the owner is told exactly what will be replaced
     (every product/category/payment method/sale/setting), the backup's
     export timestamp, and its product/sale counts, and must actively
     confirm. This is a stronger confirmation than this project's
     existing single-record delete confirmation (see
     `salesService.ts`'s `deleteSale` call-sites), deliberately, since
     the blast radius here is the entire database rather than one row.
  If a future phase or the project owner wants a merge/upsert mode
  instead (or in addition), treat that as a deliberate reversal of this
  decision — flag it for confirmation first, the same way Phase 4's/5's/
  6's own judgment calls were flagged.
- **Validation happens before ANY write.** `BackupManager.tsx` reads the
  selected file's text, `JSON.parse`s it, and runs
  `validateBackupFile` — only a `{ valid: true }` result proceeds to the
  confirm dialog and then `restoreBackup`. A parse failure or a failed
  validation shows an inline error banner and touches IndexedDB not at
  all. This matters because `restoreBackup` itself does no validation of
  its own (see its doc comment) — it trusts the caller completely, so
  the caller (this component) is the only gate.
- **Every `Sale`/`SaleItem` field, including each item's
  `productNameSnapshot`/`unitPriceSnapshot`, is written back to
  IndexedDB EXACTLY as it appears in the backup file** — `restoreBackup`
  never recomputes anything from the (possibly different, post-restore)
  live `products` data. This is the same price/name-snapshot rule
  applied throughout every prior phase (see "DO NOT CHANGE" below) —
  restoring a backup must reproduce history exactly as it was recorded,
  not as today's product catalog would compute it.
- **Backup/Restore lives on `ProductsPage.tsx` as a fourth tab**, not a
  new route. This app has no settings/admin screen yet, and
  `ProductsPage.tsx` already hosts other non-sales administrative tasks
  (categories, payment methods) alongside products — adding a "Backup"
  tab there is consistent with what already exists, versus introducing
  a whole new nav item (in `AppShell.tsx`) for one more admin task. If a
  future phase adds enough settings-like features that this page starts
  feeling overloaded, splitting Backup out into its own route is a
  reasonable revisit — not required now.
- **The hidden `<input type="file">` pattern is this codebase's first
  file input.** `BackupManager.tsx`'s "Restore from file…" `Button`
  calls `.click()` on a visually-hidden (`style={{ display: "none" }}`)
  native file input via a `ref`, so the touch-friendly `Button` styling
  is what the owner actually sees and taps, not the browser's own
  unstyled file-picker control. `accept="application/json,.json"` scopes
  the native picker to JSON files where the OS/browser respects it, but
  `validateBackupFile` is the real gate regardless of what the picker
  allowed through.
- **`window.location.reload()` after a successful restore**, rather than
  re-fetching/re-rendering each page's own state. A full-replace restore
  touches every store this app reads from — POS's product grid, Sales
  History, Reports, this same Backup tab's own display of nothing in
  particular — and a full reload is the simplest way to guarantee every
  screen reflects the restored data with no risk of one component's
  stale in-memory state surviving the restore. This is a reasonable
  default for now; if Phase 8's offline/PWA work changes how navigation
  or state persistence works, revisit whether this is still the right
  call.

## Important Files

Everything in Phases 0–6's handoff still applies. New/changed this
phase:

`src/utils/backup.ts`
→ New. `BACKUP_FORMAT_VERSION: 1`, `BackupFile` type,
`validateBackupFile(raw: unknown): BackupValidationResult`,
`serializeBackup(payload: BackupFile): string`,
`buildBackupFilename(now?: Date): string`. Imports only type-only
`../types` and `./date`'s `formatDateKey`.

`src/services/backupService.ts`
→ New. `buildBackupFile(): Promise<BackupFile>`,
`restoreBackup(payload: BackupFile): Promise<void>`. Imports
`database/db.ts` (for `getDB`/`SETTINGS_KEY`) and `utils/backup.ts` (for
the `BackupFile` type/`BACKUP_FORMAT_VERSION`) — the only file that
imports both.

`src/components/BackupManager.tsx`
→ New. Two `Card`s ("Back up", "Restore") plus a hidden
`<input type="file">` and an inline success/error `banner`. Imports
`services/backupService.ts`, `utils/backup.ts`, and Phase 6's
`utils/download.ts`.

`src/pages/ProductsPage.tsx`
→ Extended (not rewritten): `Tab` type gains `"backup"`, `TABS` gains a
`{ id: "backup", label: "Backup" }` entry, and a
`{tab === "backup" && <BackupManager />}` render branch.

`scripts/smoke-test-db.ts`
→ Extended with a "9. Backup + Restore" section (after the existing "8.
CSV export", which is unrenumbered/unchanged). First half: pure
`validateBackupFile`/`serializeBackup`/`buildBackupFilename` assertions
against hand-built fixtures (needs no IndexedDB, matching sections 7/8's
pattern). Second half: a REAL IndexedDB round-trip using the db already
populated by sections 1–6 — `buildBackupFile()`, mutate the live db, then
`restoreBackup()` the earlier snapshot and assert the mutation is gone
and every store matches the backup exactly (including a `SaleItem`
price-snapshot check). This second half needs `fake-indexeddb`/`idb`
from `node_modules` and could NOT be executed this session — see
"Testing Status".

## Database Structure

Unchanged from Phase 1 — no migration needed this phase. Backup/Restore
read and write the SAME six stores Phase 1 created
(`products`/`categories`/`paymentMethods`/`sales`/`saleItems`/`settings`)
directly, with no new store or index.

## Completed Features

- Backup + Restore (Products → Backup tab): "Back up" downloads a single
  dated JSON file with every store's full contents; "Restore from
  file…" validates a previously-exported file, confirms with the owner
  (naming exactly what will be replaced), then fully replaces all
  current data and reloads the page.
- (Carried) Export (Reports): "Download CSV" (one row per line item,
  current date range) and "Print / Save as PDF" (the on-screen report
  summary, via a print stylesheet).
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
  This is now true for Phases 2, 3, 5, 6, AND 7 — only Phase 4's session
  had working npm access. `backupService.ts`, `BackupManager.tsx`, and
  `ProductsPage.tsx`'s Phase 7 changes have only been manually reviewed,
  never compiled by the project's real `tsc`/React types.
- **Manual click-through has still not been done**, now across Phases
  2–7 — see PROJECT_STATUS.md. For Backup/Restore specifically: nobody
  has exported a real backup, inspected the file, and restored it in a
  real/headed browser. Given Restore is this app's first destructive
  action, this is the single highest-priority manual check outstanding
  — higher than any carried-over gap from Phases 2–6.
- `smoke-test-db.ts` section 9's real-IndexedDB round-trip (build a
  backup, mutate the db, restore, assert it matches) has never actually
  been run — it needs `fake-indexeddb`/`idb`, neither available this
  session. Confirmed by attempting `tsx scripts/smoke-test-db.ts`
  directly, which fails immediately with `Cannot find package
  'fake-indexeddb'`.
- No format-version migration path — `validateBackupFile` rejects any
  `formatVersion` other than exactly `1`. Not a bug (there's only ever
  been one format), but a future phase that changes the backup shape
  needs to either keep old files reading correctly or document the
  break.
- The native file-picker UI (`accept="application/json,.json"`) hasn't
  been checked on a real mobile browser — desktop Chrome/Firefox/Safari
  and mobile Chrome/Safari can present file pickers differently.
- (Carried from Phase 6) No PDF-generation library; "PDF export" is
  `window.print()` + a print stylesheet.
- (Carried from Phase 6) CSV export doesn't add a UTF-8 BOM.
- (Carried from Phase 5) "This month"/"Last month" use the local system
  clock's calendar month boundaries (not UTC).
- (Carried from Phase 4) Top products in the Phase 4 "Today" dashboard
  are quantity-only by design; Reports offers both quantity and revenue.
- (Carried from Phase 4) Dashboard/Reports search and filtering, and
  Export, are all client-side over `listSales()`'s full result.
- (Carried from Phase 3) "Cash" detection is by payment-method name
  match, not a stored flag.
- (Carried from Phase 2) No confirmation dialog before "Clear cart" (a
  DIFFERENT, much lower-stakes action than Restore — not changed this
  phase).
- (Carried from Phase 2) Cart state is in-memory only.
- (Carried from Phase 1) No dedicated settings UI beyond what
  Backup/Restore now adds to the Products page.

## Decisions Already Made

Carried from Phases 0–6 (still true, don't change without good reason):
IndexedDB over localStorage; `HashRouter`; plain CSS; self-hosted Manrope;
`SaleItem` snapshot pattern; soft-delete-only for products/categories/
payment methods; no confirmation dialogs for reversible one-tap actions;
cart stays in memory; cash detection by name match; sale-writing/reading
logic lives in `salesService.ts`; editing a saved sale is notes-only;
delete requires `window.confirm`; range-aggregation logic lives in
`utils/reportStats.ts`; Reports filters client-side over the full
`listSales()` result; product performance defaults to revenue; date-range
UI is a pill-tab scroller; CSV export is one row per line item with no
currency symbol; no PDF-generation library (browser print instead); no
separate export control on `HistoryPage.tsx`.

New in Phase 7:

- **Restore is a full replace, not a merge** — see "Current
  Architecture" for the full reasoning (owner mental model, no good
  id-collision default for a merge, offset by an explicit confirm
  dialog). Don't quietly change this to a merge; if that's ever wanted,
  treat it as a deliberate, flagged reversal, not a refinement.
- **Backup/Restore lives as a "Backup" tab on `ProductsPage.tsx`**, not
  a new route — this app has no settings/admin screen yet, and this
  page already hosts other non-sales admin tasks. Revisit only if this
  page starts feeling overloaded with unrelated admin features.
- **A backup is one JSON object with a `formatVersion`/`exportedAt`
  header plus one key per store** — see "Current Architecture" for the
  exact shape. `formatVersion` must match exactly; there's no migration
  logic yet.
- **`utils/backup.ts` stays dependency-free** (plain data in/out, no
  `getDB()` import) — same discipline as `reportStats.ts`/
  `salesExport.ts`. `services/backupService.ts` is the only file
  allowed to bridge it to IndexedDB.
- **Every Sale/SaleItem field is restored verbatim from the backup** —
  never recomputed from live `products` data. Same price/name-snapshot
  rule as every prior phase.
- **A full page reload (`window.location.reload()`) follows a successful
  restore** — simplest way to guarantee every screen reflects the
  restored data. Revisit only if this stops being true (e.g. if Phase 8
  introduces a service worker with its own reload/update semantics that
  conflict with this).

## DO NOT CHANGE

Everything in Phases 0–6's version of this section still applies
(especially the price/name snapshot rule, `utils/reportStats.ts` and
`utils/csv.ts`/`utils/salesExport.ts` not importing `database/db.ts`/
`services/salesService.ts`, and `transactionRowsToCsv`'s column
order/CRLF line endings). Additionally, as of Phase 7:

- Don't give `utils/backup.ts` an import on `database/db.ts` — it must
  keep taking/returning plain `BackupFile` data so it stays unit-testable
  without `node_modules`, the same reason `reportStats.ts`/
  `salesExport.ts` avoid that import. `services/backupService.ts` is the
  designated bridge.
- Don't make `restoreBackup` skip or weaken the `window.confirm` step —
  that confirmation lives in the CALLER (`BackupManager.tsx`), not in
  `restoreBackup` itself, by design (so `restoreBackup` stays a plain,
  testable async function callable from a smoke test without a real
  `window.confirm` dialog blocking it) — but the UI must never call
  `restoreBackup` without it first.
- Don't have `restoreBackup` recompute any `Sale`/`SaleItem` field from
  live `products` data. Every field, especially
  `productNameSnapshot`/`unitPriceSnapshot`, is written back exactly as
  given in the backup payload.
- Don't change the backup JSON's top-level key names
  (`products`/`categories`/`paymentMethods`/`sales`/`saleItems`/
  `settings`/`formatVersion`/`exportedAt`) without bumping
  `BACKUP_FORMAT_VERSION` and updating `validateBackupFile` accordingly
  — a real backup file a real owner exported with the OLD shape must
  either still validate or fail with a clear, honest error, never
  silently partially import.

## Next Phase

**PHASE 8 — Offline + PWA.** See `NEXT_PHASE_PROMPT.md` for the exact
brief.

## Recommended First Steps

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. **Before writing any Phase 8 code**, run `npm install && npx tsc -b &&
   npm run build && npx oxlint && npm run smoke-test`. This is now
   overdue: Phases 5, 6, AND 7's code have never been run through the
   real toolchain. If this container has working npm access (check
   early, don't assume), this is the first opportunity to catch any
   `tsc`/`oxlint` issues in `reportStats.ts`, `ReportsPage.tsx`,
   `csv.ts`, `salesExport.ts`, `backup.ts`, `backupService.ts`,
   `BackupManager.tsx`, or `ProductsPage.tsx`. Fix anything that comes up
   before moving on. **Pay special attention to `smoke-test-db.ts`
   section 9's real-IndexedDB round-trip** — it's the first time it will
   actually run, and if `restoreBackup`'s multi-store transaction has any
   issue, this is where it will surface.
3. **Do the manual click-through that's now been deferred across six
   phases, with Backup/Restore as the TOP priority** (it's the first
   destructive action in this app): export a real backup, open the
   downloaded JSON and eyeball it, then actually click "Restore from
   file…" with that same file (and, ideally, after adding/deleting a
   sale first, so the restore is a real round-trip) and confirm the app
   reflects the restored state afterward — on both desktop and mobile,
   since this is also the first file-input UI in the app. Then do the
   full click-through carried from Phase 6's own recommended steps: a
   few full sales on the POS screen, Sales History, every Reports
   control (all 6 range presets, both custom date inputs, the
   revenue/quantity toggle), the Export buttons (open the CSV in a real
   spreadsheet app, look at the print/PDF output).
4. Check the original master spec's Phase 8 section for what belongs
   there (service worker, web app manifest, installability, offline
   asset caching — IndexedDB access itself is already offline-capable,
   so Phase 8 is about the app SHELL working offline, not the data
   layer).
5. Consider whether Phase 8's offline caching interacts with Backup/
   Restore's `window.location.reload()` (a service worker's own
   update/reload semantics might need to be accounted for) or with the
   file-input pattern `BackupManager.tsx` introduced.
6. Update `PROJECT_STATUS.md`, `HANDOFF.md`, and replace
   `NEXT_PHASE_PROMPT.md` with Phase 9 instructions before stopping.

## Testing Status

| Check | Result |
|---|---|
| `npm install` | ❌ NOT run — this session's container returned 403 Forbidden from the npm registry (confirmed via both `npm ping` and an actual `npm install` attempt, at the start of this session) |
| `npx tsc -b` | ❌ NOT run (requires `npm install` first) |
| `npm run build` | ❌ NOT run (requires `npm install` first) |
| `npx oxlint` | ❌ NOT run — no `oxlint` binary available anywhere in this environment, global or local |
| `npm run smoke-test` | ❌ NOT run — requires `fake-indexeddb` and `idb`, neither installed; confirmed by directly attempting `tsx scripts/smoke-test-db.ts`, which fails immediately with `Cannot find package 'fake-indexeddb'` |
| `utils/backup.ts`'s pure functions (`validateBackupFile`, `serializeBackup`, `buildBackupFilename`) | ✅ Manually verified — extracted into a standalone script and run with the globally-available `tsx` (zero `node_modules` needed); accept case, 9 reject/edge cases, a serialize-round-trip, and the filename convention all passed. These same assertions now live in `smoke-test-db.ts` section 9's first half. |
| `tsc --strict` on `utils/backup.ts` (+ `date.ts`/`types/index.ts` for context) | ✅ Run directly with the globally-installed `tsc` — zero errors. Sanity-checked by injecting a real type error into a scratch copy first (`BACKUP_FORMAT_VERSION: string = 1`) and confirming it was caught, so this is a genuine (if partial) signal. **`backupService.ts`, `BackupManager.tsx`, and `ProductsPage.tsx` were NOT type-checked this way** — `backupService.ts` imports `idb` (an external dependency with no reliable stand-in stub available in this environment), and the React files hit the same missing-React-type-stubs wall Phase 5 hit and abandoned; manual review only for all three. |
| `smoke-test-db.ts` section 9's real-IndexedDB round-trip (`buildBackupFile` → mutate → `restoreBackup` → assert match) | ❌ NOT run — written, but needs `fake-indexeddb`/`idb` from `node_modules`; confirmed unavailable this session. This is the single most important check to run FIRST if a future session gets npm access, since it directly exercises `restoreBackup`'s multi-store transaction. |
| Manual review of new/changed TS/TSX for balanced JSX, correct prop shapes, consistent naming | ✅ Done by hand, file by file, for all four new/changed files (`utils/backup.ts`, `services/backupService.ts`, `components/BackupManager.tsx`, `pages/ProductsPage.tsx`) |
| Brace/paren/bracket balance check on the four new/changed files | ✅ Done programmatically (not a substitute for a real parser/build, but catches a missing/extra bracket) — all four balanced |
| Manual click-through (POS/checkout, Sales History, Reports, Export, and now Backup/Restore) in a real/headed browser | ❌ Not done — no headed browser available in this environment (Playwright is installed globally but has no downloaded browser binaries, and this container has no way to fetch one), and this gap now spans Phases 2–7. **Backup/Restore is the highest-priority item in this gap**, since it's the first destructive action in the app and has never been watched actually run. |
| Real mobile device check | ❌ Not done — also relevant to `BackupManager.tsx`'s file-picker UI specifically, which is new this phase |
| Confirmed Phase 0–6 functionality untouched | ⚠️ Reviewed by inspection only (not by running the smoke test): only `ProductsPage.tsx` was touched from Phase 0–6's set of files this phase (extended with a new tab branch, nothing removed), and all other Phase 7 files are new. No Phase 0–6 file's existing logic was deleted or altered. This should be re-confirmed by actually running `npm run smoke-test` next session, since Phase 4's own handoff relied on that run (not just inspection) for this same confirmation, and it hasn't happened since Phase 4. |
