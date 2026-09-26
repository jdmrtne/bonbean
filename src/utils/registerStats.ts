// PHASE 12 — Register close-out math.
//
// Deliberately dependency-free, same spirit as reportStats.ts — takes
// Sale[]/PaymentMethod[]/plain numbers as parameters rather than reaching
// into IndexedDB, so it's cheap to unit-test in isolation (see
// scripts/smoke-test-db.ts) and impossible to get subtly wrong by mixing
// data-loading concerns into the arithmetic.
//
// The core rule this file exists to enforce (see the brief this feature
// was built from): the Opening Cash Fund is ONLY ever used to back the
// Physical Cash Counted figure out into Cash Sales. It is never added to
// or subtracted from Total Sales, and it is never itself labeled as a
// sale, an expense, or a deduction.
import type { PaymentMethod, RegisterSession, Sale } from "../types";
import { computeSalesStats } from "./reportStats";

// Every sale recorded during a register session, by comparing each
// sale's full ISO `createdAt` timestamp against the session's own
// openedAt/closedAt — precise to the millisecond, unlike the `date`/
// `time` display keys reportStats.ts's filterSalesByRange uses, so a
// session that opens and closes within the same minute still scopes
// correctly. `now` is injectable (mirrors resolveDateRange's pattern in
// reportStats.ts) so this is testable without depending on the real
// clock; it's only consulted for a session that hasn't closed yet.
export function filterSalesBySession(
  sales: Sale[],
  session: Pick<RegisterSession, "openedAt" | "closedAt">,
  now: string = new Date().toISOString(),
): Sale[] {
  const end = session.closedAt ?? now;
  return sales.filter((s) => s.createdAt >= session.openedAt && s.createdAt <= end);
}

export interface RegisterClosingSummary {
  openingFund: number;
  physicalCashCounted: number;
  // Physical Cash Counted − Opening Cash Fund. Never computed the other
  // way, and the Opening Cash Fund is NEVER subtracted from totalSales
  // below — it only appears in this one line.
  cashSales: number;
  // Every non-cash payment method's shift total, one entry per method
  // name, desc by total (same ordering as computeSalesStats'
  // paymentBreakdown) — GCash/Card/Other/etc., whatever payment methods
  // are actually configured (see types/index.ts's PaymentMethod.isCash).
  nonCashBreakdown: [string, number][];
  // Cash Sales + every non-cash payment method's total. The Opening Cash
  // Fund never appears in this sum.
  totalSales: number;
  // Informational only: what the shift's own cash-method sale records
  // say was taken in as cash, for comparing against cashSales above to
  // spot an over/short drawer. Never fed into totalSales.
  recordedCashSales: number;
  // cashSales − recordedCashSales. Positive means more cash was counted
  // than the receipts account for; negative means the drawer is short.
  cashVariance: number;
}

export function computeRegisterClosingSummary(
  shiftSales: Sale[],
  paymentMethods: PaymentMethod[],
  openingFund: number,
  physicalCashCounted: number,
): RegisterClosingSummary {
  const cashMethodNames = new Set(paymentMethods.filter((m) => m.isCash).map((m) => m.name));

  const { paymentBreakdown } = computeSalesStats(shiftSales);
  const nonCashBreakdown = paymentBreakdown.filter(([name]) => !cashMethodNames.has(name));
  const recordedCashSales = paymentBreakdown
    .filter(([name]) => cashMethodNames.has(name))
    .reduce((sum, [, total]) => sum + total, 0);

  const cashSales = physicalCashCounted - openingFund;
  const nonCashTotal = nonCashBreakdown.reduce((sum, [, total]) => sum + total, 0);
  const totalSales = cashSales + nonCashTotal;

  return {
    openingFund,
    physicalCashCounted,
    cashSales,
    nonCashBreakdown,
    totalSales,
    recordedCashSales,
    cashVariance: cashSales - recordedCashSales,
  };
}
