Project:
Coffee Cart POS (bon&bean)

Current Phase:
PHASE 12 — Open/Close Register with a Cash Fund

Status:
COMPLETE. Full toolchain access this session (npm install/tsc/oxlint/
vite build/smoke-test all ran for real, unlike Phase 10's session) —
see "Verification done" below.

Completed:

* **Register sessions.** New `RegisterSession` type (`src/types/index.ts`),
  a new `registerSessions` IndexedDB store (`DB_VERSION` 4→5,
  `database/db.ts`), and `services/registerService.ts`
  (openRegister/closeRegister/getOpenSession/listRegisterSessions). Only
  one session can be open at a time.
* **Open Register gate.** `PosPage.tsx` now requires an open register
  session before the product grid/cart render at all — `OpenRegisterGate`
  (new) prompts for the Opening Cash Fund and blocks every other POS
  action until it's entered.
* **Close Register.** New `CloseRegisterModal` shows the shift's payment
  summary (via `computeSalesStats`, scoped to the session by
  `utils/registerStats.ts`'s `filterSalesBySession`), takes Physical Cash
  Counted, and computes: Cash Sales = Physical Cash Counted − Opening
  Cash Fund; Total Sales = Cash Sales + every non-cash payment method's
  shift total. The Opening Cash Fund is never subtracted from Total
  Sales and is always labeled as its own line, never a sale/expense/
  deduction. Also surfaces (informational only, not part of the
  required totals) a comparison against the shift's recorded
  cash-method sale totals, to help catch an over/short drawer.
* **Closing report.** `utils/registerExport.ts` builds a small CSV
  (Opening Cash Fund, Physical Cash Counted, Cash Sales, each non-cash
  payment method, Total Sales) downloaded automatically when a register
  closes. The existing Reports-page CSV/print export
  (`utils/salesExport.ts`, `ReportsPage.tsx`) is completely untouched.
* **Backup/restore.** `registerSessions` added to `buildBackupFile`/
  `restoreBackup` (`services/backupService.ts`) and to `BackupFile`
  (`utils/backup.ts`) as an OPTIONAL section — a backup taken before
  this phase simply has none to restore (same as an upgraded database
  never gets a backfilled one), rather than failing validation.
* Scope discipline: no other POS feature, UI, payment method, order ID,
  or existing sales-recording logic was touched — see the brief this
  phase was built from.

Verification done (real toolchain, this session):

* `npm install` — succeeded.
* `npx tsc -b` — clean, no errors.
* `npx oxlint src` — same 6 pre-existing warnings as before this phase
  (all in code this phase didn't touch), 0 new warnings, 0 errors.
* `npm run build` — succeeded, produced a complete `dist/`.
* `npm run smoke-test` — all tests pass, including new coverage added
  this phase: register open/close guards, session-scoped sale
  filtering, the exact Cash Sales/Total Sales formula (with a case
  where Cash Sales deliberately does NOT equal the shift's literal cash
  sale total, to prove it comes from the physical count), non-cash
  breakdown by payment method name, and a register session round-trip
  through backup/restore.

Known gaps / left for manual QA:

* No real browser/device click-through of the new Open/Close Register
  screens happened this session (no headed browser here either) — click
  through: open register → add a mix of cash/non-cash sales → close
  register → confirm the numbers match a manual count → download and
  check the closing CSV.
* No dedicated "past register sessions" history view was built —
  `listRegisterSessions()` exists in the service layer for this, but
  nothing in the UI surfaces it yet, since it wasn't asked for.
* The real `DB_VERSION` 4→5 migration (creating the empty
  `registerSessions` store) has only been verified by a fresh-database
  smoke test, not a genuine upgrade of a pre-Phase-12 database with real
  data in it.

---

Previous phase (PHASE 10 — Final QA + Release):

COMPLETE (code + manual review), WITH AN IMPORTANT CAVEAT — that
session had no working npm registry access (`npm install` failed with a
403 on every package) and therefore no headless-browser pass either
(nothing to build/serve). Every change below was verified by careful
manual code review — tracing call sites, checking types by hand,
re-reading every edited file in full — NOT by running `tsc`, `vite
build`, `oxlint`, `npm run smoke-test`, or loading the app in a
browser. This is a weaker verification bar than Phases 8/9 had. See
"Verification done" below for the exact breakdown, and treat this as
needing a real toolchain + browser pass before relying on it for
actual daily use.

Completed:

* **Cart persistence.** New `cartDraft` IndexedDB store (`DB_VERSION`
  2→3), `src/services/cartDraftService.ts`, a `restore()` method on
  `useCart`, and hydrate-on-mount/persist-on-change wiring in
  `PosPage.tsx`. An unfinished cart now survives a refresh, an
  accidental tab close, or reopening the app later. Clears (rather than
  storing an empty array) exactly when a sale completes or the cart is
  explicitly cleared — never touches completed sales/history.
* **Clear-cart confirmation.** `CartPanel.tsx`'s "Clear cart" now
  requires a `window.confirm` before clearing a non-empty cart, using
  the exact wording from the brief and matching this app's existing
  confirmation convention (same pattern as delete-sale, restore-backup
  — no new dialog component introduced).
* **Destructive-action confirmations, reviewed in full**: delete-sale
  and restore-backup were already confirmed from earlier phases.
  Hard-delete for products/categories, and any "reset/clear all data"
  feature, **do not exist in this app at all** (it's soft-delete/
  deactivate-only by design) — so those two specific brief items are
  N/A, not gaps.
* **Cash payment robustness.** `PaymentMethod` gained a real
  `isCash: boolean` field (`src/types/index.ts`), replacing the old
  "name must literally be Cash" check. `database/db.ts`'s migration
  backfills it for every existing payment method (preserving old
  behavior exactly: only a method named "Cash", case-insensitively,
  becomes cash-accepting). `backupService.ts`'s restore does the same
  backfill for old backup files. `paymentMethodsService.ts` and
  `PaymentMethodsManager.tsx` (new toggle + list badge) expose it.
  `CheckoutModal.tsx` now reads the flag directly and resets
  cash-received/error state on every payment-method switch, so no
  stale cash/change value can survive a method change.
* **Mobile: cart line long names.** `.cart-line__name` now wraps
  instead of truncating — the one concrete mobile gap Phase 9 left
  open. Everything else Phase 9 fixed (touch targets, loading states,
  dialog sizing, numeric-input keyboards) was reviewed and found still
  solid; no other mobile changes were needed.
* **Backup/restore safety** — reviewed against the brief's checklist
  (warn → confirm → validate → keep existing data on failure → reload
  after success): already fully satisfied since Phase 7. Only change:
  the `isCash` backfill above, for backward compatibility.
* **Service worker/PWA update safety** — reviewed: already cache-first
  with a manual (non-silent) update banner and old-cache cleanup on
  activate, satisfying the brief as-is since Phase 8. `CACHE_VERSION`
  bumped `v3`→`v4` since this phase's CSS change is a cached file.
* **Error handling** — reviewed call-site by call-site across
  `salesService.ts`, `backupService.ts`, and every manager component:
  all critical writes are inside atomic idb transactions, every catch
  already surfaces a specific non-crashing message, prior data is left
  intact on failure, and a failed sale never clears the cart (so
  nothing is silently lost). No changes needed.
* `scripts/smoke-test-db.ts` — two new sections (`isCash`
  configuration; cart-draft persistence round-trip), plus extended
  assertions in section 1 for the seeded defaults' `isCash` values.
  Explicitly documented as NOT covering the real `DB_VERSION` 2→3
  upgrade/backfill path or `PosPage.tsx`'s own React wiring, with the
  reasoning written in-file.
* `HANDOFF.md`/`PROJECT_STATUS.md` — updated to mark the project
  complete; `NEXT_PHASE_PROMPT.md` replaced with a closing note (see
  that file — no Phase 11 exists in what this session had access to).

Verification done (THIS SESSION — no npm registry, no working browser):

* `npm install` — **failed**, 403 Forbidden from the npm registry on
  every real package (confirmed with the actual command, not just
  `--dry-run`, which misleadingly succeeds since it never fetches a
  tarball).
* `npx tsc -b`, `npm run build`, `npx oxlint src`, `npm run
  smoke-test` — **not run**, no `node_modules` to run them with.
* Real headless-browser pass — **not done**, no built `dist/` to serve
  (the Chromium binaries at `/opt/pw-browsers` were present but unused).
* **Manual verification actually performed**: read the entire existing
  codebase before making any change; hand-traced every call site of
  every changed type/function/service (`PaymentMethod`, `useCart`,
  `paymentMethodsService`, `cartDraftService`, `CheckoutModal`,
  `PosPage`); re-read every edited file in full after editing to catch
  mistakes; reasoned through the IndexedDB upgrade transaction's
  request-ordering semantics by hand (no way to execute it this
  session); cross-checked the new smoke-test assertions' logic against
  the actual service implementations line-by-line.

Current functionality:

* Everything from Phases 0–9 (POS/cart, sales recording, Sales History
  + dashboard, Reports, CSV + print/PDF export, Backup + Restore,
  offline + PWA install, mobile touch-target/loading-state polish)
  reviewed and confirmed still intact by code reading — not re-run,
  since no toolchain was available.
* Cart survives a refresh/reopen mid-order.
* Clearing a non-empty cart requires confirmation.
* Cash-received/change fields appear only for payment methods
  explicitly marked "Accepts cash payments", configurable per method,
  and never carry a stale value across a method switch.
* Long product names in the cart wrap instead of truncating.

Known bugs / verification gaps:

* **Nothing in this phase has been compiler/lint/test/browser-verified
  this session** (see "Status" above) — this is the single most
  important item here, not a footnote. A future session with working
  npm access should run the full toolchain (`npm install && npx tsc -b
  && npm run build && npx oxlint src && npm run smoke-test`) before
  this is considered production-ready.
* **The real `DB_VERSION` 2→3 migration (the `isCash` backfill) has
  only been verified by code review**, not an automated test or a real
  upgrade of an actual pre-Phase-10 database. Manual QA item: on a
  device with real existing data, confirm payment methods behave
  correctly after the app updates.
* Real mobile DEVICE testing still hasn't happened (carried from
  Phase 8/9 — no headless browser this session either, so still true).
* The update-banner flow still hasn't been tested end-to-end with a
  real second deploy (carried from Phase 8/9, unchanged).
* (Carried from Phase 7) No format-version migration path for backup
  files.
* (Carried from Phase 7) The native file-picker UI hasn't been checked
  on a real mobile browser's file picker specifically.
* (Carried from Phase 6) No PDF-generation library; "PDF export" is
  `window.print()` + a print stylesheet.
* (Carried from Phase 6) CSV export doesn't add a UTF-8 BOM.
* (Carried from Phase 5) "This month"/"Last month" use the local system
  clock's calendar month boundaries (not UTC).
* (Carried from Phase 4) Top products in the "Today" dashboard are
  quantity-only by design.
* (Carried from Phase 1) No dedicated settings UI beyond Backup/Restore
  on the Products page.
* Hard-delete for products/categories and a "reset all data" feature
  don't exist — confirmed N/A for this phase's confirmation-dialog
  requirement, not overlooked.

Is the app ready for supervised daily use?

**Conditionally yes, WITH the toolchain caveat above treated as a real
blocker, not a formality.** The feature set and data-safety properties
(atomic transactions, price/name snapshots, backup/restore safety,
offline support, now cart persistence and cash-config robustness) are
all in place and were reasoned through carefully. But because this
specific session could not compile, lint, run the smoke test, or click
through the app even once, "supervised daily use" should wait for
*someone* — a future session with npm access, or a human developer —
to actually run `npm install && npx tsc -b && npm run build && npx
oxlint src && npm run smoke-test` and click through the regression list
below at least once. Until that happens, this phase is best described
as "believed correct" rather than "confirmed working."

Final action required before production deployment:

1. **Get a real toolchain pass**: `npm install && npx tsc -b && npm run
   build && npx oxlint src && npm run smoke-test`, and fix anything it
   surfaces (there is a real chance the `async upgrade()` change in
   `database/db.ts` has a subtlety this session couldn't catch without
   compiling it).
2. **Click through the full regression list from the Phase 10 brief**
   at least once, ideally on a real phone: fresh app → add/edit
   products → cart → change quantities → refresh page → confirm cart
   restored → checkout → cash sale → verify change → verify in history
   → verify reports update → export → backup → restore → verify
   restored data → offline → mobile layout → every confirmation
   dialog (clear cart, delete sale, restore backup) → empty cart →
   invalid/exact/insufficient cash → multiple payment methods →
   invalid backup restore → deleting/deactivating products → refresh
   during an unfinished order.
3. Confirm the built `dist/` folder is a complete, correct static site
   ready to host anywhere.

Next phase:

None planned — see `NEXT_PHASE_PROMPT.md` for a closing note.

