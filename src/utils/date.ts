// Small date-key helper shared across services/utils.
//
// Extracted from salesService.ts (PHASE 5) so pure aggregation/range logic
// in reportStats.ts can use the exact same date-key format without pulling
// in salesService.ts's IndexedDB imports — that keeps reportStats.ts a
// dependency-free module that's cheap to unit-test (see
// scripts/smoke-test-db.ts and the PHASE 5 section there).
//
// salesService.ts re-exports this so existing imports of `formatDateKey`
// from "../services/salesService" (e.g. HistoryPage.tsx) keep working
// unchanged.

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
