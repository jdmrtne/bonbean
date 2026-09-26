# CONTINUE COFFEE CART POS DEVELOPMENT

You are continuing an existing Coffee Cart POS project.

DO NOT rebuild the application from scratch.

First:

1. Read README.md
2. Read PROJECT_STATUS.md
3. Read HANDOFF.md — especially "Testing Status": Phase 4's automated
   checks (`tsc -b`, `build`, `oxlint`, `smoke-test`) all actually ran and
   passed this time. What's still outstanding is manual click-through in a
   real/headed browser — nobody has clicked through the POS, checkout, or
   Sales History screens yet. Treat all UI as functionally unverified
   until you've done this yourself in step 6.
4. Read this file (NEXT_PHASE_PROMPT.md)
5. Inspect the existing source code, especially `src/services/salesService.ts`
   (`listSales`, `deleteSale`, `formatDateKey` — Reports will likely need a
   date-range variant of the "today" filtering `HistoryPage.tsx` already
   does), `src/pages/HistoryPage.tsx` (the dashboard computation you'll
   probably generalize), and `src/pages/ReportsPage.tsx` (the Phase 0
   placeholder you're replacing).
6. Run `npm install && npx tsc -b && npm run build && npx oxlint && npm
   run smoke-test`. This container should have working npm registry
   access (it did for Phase 4) — if yours doesn't, say so plainly in your
   own handoff rather than silently skipping these. Then run `npm run dev`
   and manually click through: a few full sales on the POS screen (cash
   and non-cash), the Sales History list/detail/search/delete/notes, and
   whatever you build for Reports — at both a mobile and a desktop width.
   This manual pass has not been done for Phases 2, 3, or 4 yet either;
   doing it now, before adding Reports on top, is worth the time.

Current phase:

PHASE 5

Previous phases completed:

PHASE 0 — Project Foundation
PHASE 1 — Database + Product Management
PHASE 2 — POS + Cart
PHASE 3 — Sales Recording
PHASE 4 — Sales History + Dashboard

Your task is to implement:

## PHASE 5 — REPORTS

Build out `src/pages/ReportsPage.tsx`, replacing its current placeholder.

### Date range selection

- Support at least: Today, Yesterday, Last 7 days, This month, Last month,
  and a custom range (two date pickers). Decide the UI (segmented control
  + custom option, or a dropdown) and document your choice.
- Reuse `salesService.listSales()` and filter client-side by the sale's
  `date` field for the chosen range — the dataset is small (a small coffee
  cart's sales), so a full client-side filter is simpler than adding
  date-range query logic to the service layer. If you find a real
  performance reason to push filtering into `salesService.ts` instead,
  document why.

### Report contents

For the selected range, show:

- Sales total and transaction count (same shape as Phase 4's dashboard,
  but for the chosen range instead of just "today")
- Payment method breakdown (total per method)
- Product performance — decide whether this is by quantity, by revenue,
  or both, and document your choice. (Phase 4's "top products" was
  quantity-only, scoped to today; consider whether Reports should offer
  revenue too, since a wider date range makes that comparison more useful
  than it was for a single day.)

### Relationship to Phase 4's dashboard

Phase 4's `HistoryPage` dashboard already covers "today" — don't duplicate
that exact view here. If it's useful, `ReportsPage` can reuse the same
computation logic (consider extracting a shared helper if the "compute
stats for a set of sales" logic in `HistoryPage.tsx` would otherwise be
copy-pasted) but Reports' job is the *range selection* Phase 4
deliberately left out.

Do not break existing functionality: Product Management (Phase 1), the POS
grid/cart (Phase 2), sales recording (Phase 3), and Sales History +
dashboard (Phase 4) must keep working exactly as they do now.

After completing the phase:

- Add smoke-test coverage for any new pure logic you extract (e.g. a
  date-range filter helper), following the existing pattern in
  `scripts/smoke-test-db.ts`. A full UI can't be smoke-tested this way —
  focus on the data/calculation logic, same as Phases 3–4 did.
- Do the manual click-through described in step 6 above — for Reports
  specifically, and for Phases 2–4 if that still hasn't happened by the
  time you pick this up.
- Run `npx tsc -b`, `npm run build`, `npx oxlint`, and `npm run
  smoke-test`, and fix anything they flag.
- Update `PROJECT_STATUS.md`.
- Update `HANDOFF.md` (What Has Been Built, Important Files, Completed
  Features, Decisions Already Made, Known Issues, Testing Status).
- Replace this file (`NEXT_PHASE_PROMPT.md`) with instructions for
  PHASE 6 — Excel + PDF Export.

Do NOT start Phase 6. Stop once Phase 5 is tested and documented, and tell
the project owner Phase 5 is ready for handoff.
