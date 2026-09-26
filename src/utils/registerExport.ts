// PHASE 12 — the register's own closing report: a small CSV, separate
// from utils/salesExport.ts's date-range sales report (which is left
// completely untouched — see this feature's brief), that a cashier/owner
// downloads right after closing a shift. Reuses utils/csv.ts's
// rowsToCsv/escapeCsvField, same as salesExport.ts, so both exports share
// one escaping implementation.
import type { RegisterSession } from "../types";
import type { RegisterClosingSummary } from "./registerStats";
import { rowsToCsv } from "./csv";

const REGISTER_CLOSING_CSV_HEADERS = ["Field", "Amount"];

// Every non-cash payment method gets its own labeled row (e.g. "GCash
// Sales", "Card Sales") — never merged into a single "non-cash" figure —
// so the report matches what the cashier saw on the Close Register screen
// line for line. Opening Cash Fund is its own row, clearly labeled, and
// is never part of the Total Sales row's arithmetic.
export function buildRegisterClosingCsv(
  session: RegisterSession,
  summary: RegisterClosingSummary,
): string {
  const rows: (string | number)[][] = [
    ["Register opened", session.openedAt],
    ["Register closed", session.closedAt ?? ""],
    ["Opening Cash Fund", summary.openingFund.toFixed(2)],
    ["Physical Cash Counted", summary.physicalCashCounted.toFixed(2)],
    ["Cash Sales", summary.cashSales.toFixed(2)],
    ...summary.nonCashBreakdown.map(
      ([name, total]): (string | number)[] => [`${name} Sales`, total.toFixed(2)],
    ),
    ["Total Sales", summary.totalSales.toFixed(2)],
  ];
  return rowsToCsv(REGISTER_CLOSING_CSV_HEADERS, rows);
}

// Dated by the close moment (falls back to the open moment for a
// not-yet-closed session, though callers only build this after closing).
export function buildRegisterClosingFilename(session: RegisterSession): string {
  const stamp = (session.closedAt ?? session.openedAt).slice(0, 10);
  return `register-closing_${stamp}.csv`;
}
