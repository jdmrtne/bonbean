Project:
Coffee Cart POS (bon&bean)

Current Phase:
PHASE 10 — Final QA + Release

Status:
COMPLETE (code + manual review), WITH AN IMPORTANT CAVEAT — this
session had no working npm registry access (`npm install` fails with a
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

