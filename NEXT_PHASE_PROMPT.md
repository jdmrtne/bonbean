# CONTINUE COFFEE CART POS DEVELOPMENT

You are continuing an existing Coffee Cart POS project.

DO NOT rebuild the application from scratch.

First:

1. Read README.md
2. Read PROJECT_STATUS.md
3. Read HANDOFF.md IN FULL — especially "Testing Status" AND the note at
   the top of "Current Phase". Phases 5 AND 6's sessions both had NO npm
   registry access, so `npm install`, `tsc -b`, `build`, `oxlint`, and the
   real `smoke-test` suite have not been run against the actual project
   dependencies since Phase 4. Only each phase's dependency-free pure
   logic was actually executed (via a standalone script with the
   globally-available `tsx`, which needs no `node_modules`). Treat ALL of
   Phase 5's AND Phase 6's TypeScript as genuinely unverified by the
   project's toolchain until you've run it yourself in step 6. This now
   spans two full phases of unverified `ReportsPage.tsx` changes in
   particular.
4. Read this file (NEXT_PHASE_PROMPT.md)
5. Inspect the existing source code, especially:
   - `src/utils/salesExport.ts` and `src/utils/csv.ts` — dependency-free
     CSV row-shaping/escaping added in Phase 6. Backup/restore probably
     wants its own serialization format (likely JSON, covering
     products/categories/payment methods/settings/sales — not just
     sales), but consider whether the same "plain params in, no
     IndexedDB import" discipline these modules (and `reportStats.ts`)
     use is worth following for a backup-building/parsing module too, so
     it stays unit-testable without `node_modules`.
   - `src/services/*.ts` — Restore will need to write to every store
     (`products`, `categories`, `paymentMethods`, `sales`, `saleItems`,
     `settings`), not just read from one. Look at `src/database/db.ts`
     for the schema/store names and at `salesService.ts`'s
     multi-store-transaction pattern (`recordSale`/`deleteSale`) for how
     this project keeps related stores in sync within one `idb`
     transaction.
   - `src/utils/download.ts` — the Phase 6 CSV download helper
     (Blob + object-URL). A JSON backup file download will likely reuse
     this exact pattern (or a near-identical one) rather than
     reintroducing it.
   - `src/pages/ReportsPage.tsx`'s "Export" `Card` (Phase 6) — for UI
     precedent on where a "Backup" (and "Restore") control might live;
     Backup/Restore probably doesn't belong on the Reports screen itself
     (it's not scoped to a date range like everything else there), so
     think about whether it wants its own settings/admin area — check
     whether one already exists or would need to be added to
     `AppShell.tsx`'s nav.
6. Run `npm install && npx tsc -b && npm run build && npx oxlint && npm
   run smoke-test`. **This is more important than usual**: if this
   container has working npm registry access (unlike Phases 5 and 6), this
   is the FIRST time in two phases that any of this code will actually be
   type-checked, linted, and smoke-tested. Fix anything that comes up —
   don't assume Phase 5's or Phase 6's code is clean just because each
   was carefully reviewed; carefully-reviewed unverified code is still
   unverified, twice over now. If your container ALSO lacks npm registry
   access, say so plainly (as Phases 5 and 6 both did) rather than
   silently skipping these steps — don't let this become a fourth or
   fifth consecutive phase where the real toolchain never actually runs.
   Then run `npm run dev` and manually click through: a few full sales on
   the POS screen, Sales History, every Reports control including the new
   Phase 6 Export buttons (actually open the downloaded CSV in a
   spreadsheet app and look at the print/PDF output), before building
   Backup/Restore on top of it. This manual pass has not been done for
   ANY phase since Phase 1.

Current phase:

PHASE 7

Previous phases completed:

PHASE 0 — Project Foundation
PHASE 1 — Database + Product Management
PHASE 2 — POS + Cart
PHASE 3 — Sales Recording
PHASE 4 — Sales History + Dashboard
PHASE 5 — Reports
PHASE 6 — Excel + PDF Export

Your task is to implement:

## PHASE 7 — BACKUP + RESTORE

This is a client-side, offline-first app with all data in IndexedDB and
nowhere else (see README's tech stack) — there is currently no way for an
owner to move their data to a new device, recover from a cleared browser/
uninstalled PWA, or keep an off-device safety copy. Phase 7 adds that.

### What to back up

- Every IndexedDB store: `products`, `categories`, `paymentMethods`,
  `sales`, `saleItems`, `settings`. Decide the file's shape (a single JSON
  object with one key per store is the obvious default) and document it.
- Consider a format version field in the backup file from the start (e.g.
  `{ formatVersion: 1, exportedAt: ..., products: [...], ... }`) so a
  future phase can evolve the format without guessing at old, unversioned
  files.

### Backup (export)

- A "Back up" action that reads every store and downloads a single JSON
  file (reuse/extend `utils/download.ts`'s pattern from Phase 6 rather
  than reintroducing a Blob/object-URL download from scratch).
- Should work fully offline, like everything else in this app.

### Restore (import)

- A "Restore" action that accepts a previously-exported JSON file (a file
  picker; there's no existing file-input pattern in this codebase yet —
  establish one consistent with the app's touch-friendly design) and
  writes its contents back into IndexedDB.
- **This is destructive and needs real thought**, more than any prior
  phase's data-writing logic:
  - Decide: does Restore wipe existing data first, or merge/upsert? Full
    replace is simpler and probably matches an owner's mental model
    ("restore my backup") but destroys anything recorded since the
    backup was made. Merge avoids data loss but raises id-collision and
    duplicate-sale questions. Pick one, document why, and make sure the
    UI is honest with the owner about which one it does before they
    confirm.
  - Restore MUST be behind an explicit confirmation
    (`window.confirm`-style, matching this project's existing delete-
    confirmation convention — see `salesService.ts`'s `deleteSale`
    call-sites) that clearly states data will be overwritten/replaced,
    not a silent one-tap action like most of this app's other actions.
  - Validate the uploaded file before writing anything — check the
    format-version field and that expected keys/shapes are present.
    Reject (with a clear error message, not a crash) a file that doesn't
    look like a real backup, rather than partially importing garbage
    into IndexedDB.
  - Writes across multiple stores should happen inside a single `idb`
    transaction where the schema allows it (same principle as
    `recordSale`/`deleteSale`'s multi-store transactions), so a failed
    restore can't leave the database in a half-restored state.

### Data integrity

- A restored `Sale`'s `SaleItem` price/name snapshots must be written
  back exactly as they were in the backup — never recomputed from
  whatever the (possibly different, post-restore) `products` data says.
  This is the same price-snapshot rule that's applied throughout every
  prior phase; call it out explicitly in your own code comments given how
  central it is.

### Where this lives in the UI

- Decide where a "Backup + Restore" control belongs. There's currently no
  settings/admin screen (`src/pages/` only has POS/History/Reports/
  Products) — consider whether Phase 7 should add a minimal one, or
  whether Backup/Restore fits on the existing Products screen (which
  already does other non-sales administrative things) instead of adding
  a whole new route. Whatever you decide, keep it consistent with the
  app's existing `Button`/`Modal`/`Card` components rather than
  introducing a new interaction pattern.

Do not break existing functionality: Product Management (Phase 1), the POS
grid/cart (Phase 2), sales recording (Phase 3), Sales History + dashboard
(Phase 4), Reports (Phase 5), and Export (Phase 6) must keep working
exactly as they do now.

After completing the phase:

- Add smoke-test coverage for any new pure logic you extract (e.g. backup-
  file validation/shape-checking), following the existing pattern in
  `scripts/smoke-test-db.ts`. The actual restore-into-IndexedDB flow CAN
  be smoke-tested against `fake-indexeddb` (unlike Phase 6's file-download
  step) if your session has npm access — follow section "4" and "5"'s
  pattern (real `getDB()`/service calls) for that part, and keep any pure
  validation logic in its own dependency-free module the same way as
  `reportStats.ts`/`salesExport.ts`, so it's testable even in a session
  without npm access.
- Do the manual click-through described in step 6 above — for Backup/
  Restore specifically (actually export a backup, then restore it, on a
  real/headed browser, and confirm the data matches) — and for Phases
  2–6 if that still hasn't happened by the time you pick this up.
- Run `npx tsc -b`, `npm run build`, `npx oxlint`, and `npm run
  smoke-test`, and fix anything they flag. If your container can't reach
  the npm registry either, say so plainly in your own handoff.
- Update `PROJECT_STATUS.md`.
- Update `HANDOFF.md` (What Has Been Built, Important Files, Completed
  Features, Decisions Already Made, Known Issues, Testing Status).
- Replace this file (`NEXT_PHASE_PROMPT.md`) with instructions for
  PHASE 8 — Offline + PWA.

Do NOT start Phase 8. Stop once Phase 7 is tested and documented, and tell
the project owner Phase 7 is ready for handoff.
