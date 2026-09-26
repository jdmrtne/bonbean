# CONTINUE COFFEE CART POS DEVELOPMENT

You are continuing an existing Coffee Cart POS project.

DO NOT rebuild the application from scratch.

First:

1. Read README.md
2. Read PROJECT_STATUS.md
3. Read HANDOFF.md IN FULL — especially "Testing Status" AND the note at
   the top of "Current Phase". Phase 5's session had NO npm registry
   access at all, so `npm install`, `tsc -b`, `build`, `oxlint`, and the
   real `smoke-test` suite were never run against the actual project
   dependencies. Only `utils/reportStats.ts`'s pure logic was actually
   executed (via a standalone script with the globally-available `tsx`,
   which needs no `node_modules`). Treat ALL of Phase 5's TypeScript —
   `ReportsPage.tsx`, the `HistoryPage.tsx` refactor, and the
   `salesService.ts` re-export change — as genuinely unverified by the
   project's toolchain until you've run it yourself in step 6. This is a
   stronger caveat than Phase 4 carried forward from Phases 2–3.
4. Read this file (NEXT_PHASE_PROMPT.md)
5. Inspect the existing source code, especially:
   - `src/utils/reportStats.ts` — dependency-free date-range +
     aggregation logic (`resolveDateRange`, `filterSalesByRange`,
     `computeSalesStats`, `computeProductPerformance`,
     `topProductsByQuantity`, `topProductsByRevenue`). Export very likely
     wants to reuse these rather than recomputing anything — read the
     file's header comment for why it's built the way it is.
   - `src/pages/ReportsPage.tsx` — the range-selection UI and how it
     wires into `reportStats.ts`. A "export the current report" action
     will likely live here or very near here.
   - `src/services/salesService.ts` — `listSales`, still the only way
     sales are read; also note `formatDateKey` now lives in
     `src/utils/date.ts` and is just re-exported here.
6. Run `npm install && npx tsc -b && npm run build && npx oxlint && npm
   run smoke-test`. **This is more important than usual**: if this
   container has working npm registry access (unlike Phase 5's), this is
   the FIRST time Phase 5's code will actually be type-checked, linted,
   and smoke-tested. Fix anything that comes up — don't assume Phase 5's
   code is clean just because its own handoff says it was carefully
   reviewed; carefully-reviewed unverified code is still unverified. If
   your container ALSO lacks npm registry access, say so plainly (as
   Phase 5's handoff did) rather than silently skipping these steps —
   don't let this become a third or fourth consecutive phase where the
   real toolchain never actually runs. Then run `npm run dev` and
   manually click through: a few full sales on the POS screen, Sales
   History (list/detail/search/delete/notes), and every Reports control —
   all 6 date-range presets, both custom date inputs (including entering
   a reversed range to confirm the swap-on-reversed behavior), and the
   revenue/quantity toggle — at both a mobile and a desktop width. This
   manual pass has not been done for ANY phase since Phase 1.

Current phase:

PHASE 6

Previous phases completed:

PHASE 0 — Project Foundation
PHASE 1 — Database + Product Management
PHASE 2 — POS + Cart
PHASE 3 — Sales Recording
PHASE 4 — Sales History + Dashboard
PHASE 5 — Reports

Your task is to implement:

## PHASE 6 — EXCEL + PDF EXPORT

Add the ability to export sales data from the app, for an owner who wants
records outside the app (for their own bookkeeping, an accountant, etc.).

### What to export

- From `ReportsPage.tsx`: an export of the currently-selected date range —
  at minimum, the same numbers the report already shows (totals,
  transaction count, items sold, average sale, payment breakdown, product
  performance), and probably the underlying transaction list too. Decide
  the level of detail and document your choice; reuse
  `utils/reportStats.ts`'s functions rather than recomputing anything.
- From `HistoryPage.tsx`, or as part of the same export flow: consider
  whether a full sales-history export (all-time, not just the selected
  report range) is worth offering here too, or whether it's cleanly
  covered by Reports' "custom" range already being able to span all of a
  cart's history. Document whichever you decide.

### Format(s)

- Build at least a CSV or Excel (.xlsx) export of the transaction list
  (one row per sale, or one row per line item — decide and document which
  is more useful for an owner's bookkeeping, and whether to offer both).
- Build a PDF export of the report summary (the stat-card numbers,
  payment breakdown, product performance) — something presentable enough
  to hand to someone else, not just a data dump.
- This is a client-side, offline-first app (see README's tech stack and
  HANDOFF.md's "Decisions Already Made") — pick libraries/approaches that
  work fully offline once installed, consistent with the rest of the app.
  Check what's already a dependency (`package.json`) before adding a new
  one, and document why any new dependency is needed.

### Where the export lives in the UI

- Decide whether this is a button on `ReportsPage.tsx`, a new small menu,
  or something else. Keep it consistent with the app's existing
  touch-friendly, mobile-first design direction (see README's "Design
  direction" and the existing `Button`/`Modal` components) rather than
  introducing a new interaction pattern for just this one feature.

### Data integrity

- Exports must reflect the price/name **snapshots** stored on each `Sale`/
  `SaleItem` (see the price-snapshot rule throughout HANDOFF.md's "DO NOT
  CHANGE" sections) — never re-look-up current product prices/names for
  historical sales. This should fall out naturally from using
  `listSales()`/`reportStats.ts`, but call it out explicitly in your own
  code comments given how central this rule is to the rest of the app.

Do not break existing functionality: Product Management (Phase 1), the POS
grid/cart (Phase 2), sales recording (Phase 3), Sales History + dashboard
(Phase 4), and Reports (Phase 5) must keep working exactly as they do now.

After completing the phase:

- Add smoke-test coverage for any new pure logic you extract (e.g. a
  row-shaping/formatting helper for the exported data), following the
  existing pattern in `scripts/smoke-test-db.ts`. A full file-generation/
  download flow can't be smoke-tested this way — focus on the data-shaping
  logic, same as prior phases did.
- Do the manual click-through described in step 6 above — for Export
  specifically (actually open the generated CSV/Excel/PDF files and check
  their contents against what the app shows), and for Phases 2–5 if that
  still hasn't happened by the time you pick this up.
- Run `npx tsc -b`, `npm run build`, `npx oxlint`, and `npm run
  smoke-test`, and fix anything they flag. If your container can't reach
  the npm registry either, say so plainly in your own handoff.
- Update `PROJECT_STATUS.md`.
- Update `HANDOFF.md` (What Has Been Built, Important Files, Completed
  Features, Decisions Already Made, Known Issues, Testing Status).
- Replace this file (`NEXT_PHASE_PROMPT.md`) with instructions for
  PHASE 7 — Backup + Restore.

Do NOT start Phase 7. Stop once Phase 6 is tested and documented, and tell
the project owner Phase 6 is ready for handoff.
