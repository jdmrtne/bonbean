# CONTINUE COFFEE CART POS DEVELOPMENT

You are continuing an existing Coffee Cart POS project.

DO NOT rebuild the application from scratch.

First:

1. Read README.md
2. Read PROJECT_STATUS.md
3. Read HANDOFF.md — especially "Testing Status": neither Phase 2 nor
   Phase 3's code has ever been installed, built, type-checked, or linted
   (no network egress was available in either of those sessions). Treat
   both as unverified until you've run the checks in step 6 yourself.
4. Read this file (NEXT_PHASE_PROMPT.md)
5. Inspect the existing source code, especially `src/services/salesService.ts`
   (what a saved `Sale` looks like, and where Phase 3 left a note that
   sale-reading functions should live in this same file),
   `src/types/index.ts`'s `Sale`/`SaleItem` types, and
   `src/pages/HistoryPage.tsx` (the Phase 0 placeholder you're replacing).
6. Run `npm install && npm run build && npx oxlint && npm run
   smoke-test`. Fix anything they surface — this will be the first time
   Phase 3's extended smoke test (the sales round-trip / price-snapshot
   check) has ever actually been executed. Then run `npm run dev` and
   manually complete a few full sales through the POS screen (different
   payment methods, different products/quantities, at least one attempt
   with insufficient cash to confirm it's blocked) before changing
   anything — this is real manual QA that hasn't been possible in this
   sandboxed environment.

Current phase:

PHASE 4

Previous phases completed:

PHASE 0 — Project Foundation
PHASE 1 — Database + Product Management
PHASE 2 — POS + Cart
PHASE 3 — Sales Recording

Your task is to implement:

## PHASE 4 — SALES HISTORY + DASHBOARD

Build the Sales History screen in `src/pages/HistoryPage.tsx`, replacing
its current placeholder, plus the dashboard stats called for in the master
spec.

### Sales History

- **List saved sales, most recent first** — add `listSales()` to
  `src/services/salesService.ts` (query the `sales` store via its existing
  `by-date` index; you'll likely also want to sort by `time` within a day,
  since the index is only on `date`)
- **Transaction detail view** — tapping a sale shows its full line items
  (name/quantity/unit price/line total, from the sale's embedded `items`
  array — no need to re-query `saleItems` for this), payment method, cash
  received/change if applicable, and timestamp
- **Search** — decide what's searchable (date range? product name within a
  sale? transaction id?) and document your choice; a simple text filter
  over product names in each sale's line items is probably enough for a
  first pass
- **Delete a transaction** — add `deleteSale(id)` to `salesService.ts`
  (must remove both the `sales` record AND its `saleItems` — use a
  multi-store transaction like `recordSale` does). **This one DOES need a
  confirmation dialog before deleting** — unlike the reversible
  deactivate/clear-cart actions in earlier phases, deleting a saved sale
  is destructive and irreversible, and the master spec's brief explicitly
  distinguishes this case. A native `window.confirm(...)` is fine for now;
  a nicer confirm dialog can wait for Phase 9 polish unless it's easy to
  do now.
- Editing a transaction is listed in the master spec's Phase 4 section but
  is vaguer than delete — a minimal option (e.g. editing `notes` only, or
  skipping edit entirely for this phase and just documenting that as a
  deferred decision) is acceptable; use your judgment and document what
  you did.

### Dashboard

Decide where this lives (a section at the top of `HistoryPage`, or its own
area) and document the choice. Must show, computed from the `sales` you
just built list access for:

- Today's sales (total ₱ and count)
- Transaction count
- Items sold (sum of all `SaleItem.quantity` across sales in the period
  shown)
- Average sale (total ÷ transaction count)
- Payment method breakdown (total per payment method)
- Top products (by quantity or by revenue — your call, document which)

It's fine for this first pass to scope the dashboard to "today" only, with
a note that date-range selection is Phase 5's job (Reports) — don't build
a full custom-range picker here if it duplicates what Phase 5 is supposed
to own; check the original master spec's Phase 5 section (in the very
first prompt of this project, or ask the project owner if it's not in
context) before deciding how much range-picking belongs in Phase 4 vs. 5.

Do not break existing functionality: Product Management (Phase 1), the POS
product grid/cart (Phase 2), sales recording (Phase 3), and the Reports
placeholder (Phase 0) must keep working exactly as they do now.

After completing the phase:

- Extend `scripts/smoke-test-db.ts` with tests for `listSales` and
  `deleteSale` (record a couple of sales, confirm `listSales` returns them
  in the right order, delete one, confirm both its `sales` record and its
  `saleItems` are gone while the other sale is untouched).
- Test everything manually: record several sales via the POS screen first
  (you'll need real data to see a real history list), then check the list,
  detail view, search, delete (with and without confirming), and the
  dashboard numbers against what you actually entered — at both a mobile
  and a desktop width.
- Run `npx tsc -b`, `npm run build`, `npx oxlint`, and `npm run
  smoke-test`, and fix anything they flag. (If your session also has no
  network egress, see HANDOFF.md's Phase 2/3 entries for how to at least
  syntax/import-check new code with `esbuild` as a partial substitute, and
  say so plainly in your own handoff rather than claiming untested code
  passed checks it didn't run through.)
- Update `PROJECT_STATUS.md`.
- Update `HANDOFF.md` (What Has Been Built, Important Files, Database
  Structure if anything changed, Completed Features, Decisions Already
  Made, Known Issues, Testing Status).
- Replace this file (`NEXT_PHASE_PROMPT.md`) with instructions for
  PHASE 5 — Reports.

Do NOT start Phase 5. Stop once Phase 4 is tested and documented, and tell
the project owner Phase 4 is ready for handoff.
