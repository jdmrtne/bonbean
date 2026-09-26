// PHASE 5: date-range resolution + sales aggregation.
//
// Deliberately dependency-free (no IndexedDB, no services) — everything
// here operates on an already-loaded Sale[] array. That makes it cheap to
// unit-test directly (see scripts/smoke-test-db.ts, "Report stats" section)
// without needing fake-indexeddb, and safe to import from both
// HistoryPage.tsx (Phase 4's "Today" dashboard) and ReportsPage.tsx (Phase
// 5's range-based reports) so the "compute stats for a set of sales" logic
// exists in exactly one place instead of being copy-pasted between them.

import type { Sale } from "../types";
import { formatDateKey } from "./date";

export type DateRangePreset = "today" | "yesterday" | "last7" | "thisMonth" | "lastMonth" | "custom";

export interface CustomRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface DateRange {
  start: string; // YYYY-MM-DD, inclusive
  end: string; // YYYY-MM-DD, inclusive
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Resolves a preset (or an explicit custom range) into concrete start/end
// date keys, both inclusive. `now` is injectable so this is testable
// without depending on the real clock.
//
// - "last7" means today plus the 6 days before it (7 calendar days
//   inclusive of today), not a trailing 7-day window that excludes today.
// - "thisMonth" runs from the 1st of the current month through today (not
//   through the end of the month) since there are never future sales to
//   show yet.
// - "lastMonth" is the full previous calendar month, 1st through last day.
// - "custom" swaps start/end if the picker produced them reversed, rather
//   than returning an empty range.
export function resolveDateRange(
  preset: DateRangePreset,
  custom?: CustomRange,
  now: Date = new Date(),
): DateRange {
  const today = formatDateKey(now);

  switch (preset) {
    case "today":
      return { start: today, end: today };
    case "yesterday": {
      const key = formatDateKey(addDays(now, -1));
      return { start: key, end: key };
    }
    case "last7":
      return { start: formatDateKey(addDays(now, -6)), end: today };
    case "thisMonth":
      return { start: formatDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), end: today };
    case "lastMonth": {
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastOfLastMonth = addDays(firstOfThisMonth, -1);
      const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
      return { start: formatDateKey(firstOfLastMonth), end: formatDateKey(lastOfLastMonth) };
    }
    case "custom": {
      if (!custom) throw new Error("resolveDateRange: 'custom' preset requires a custom range");
      return custom.start <= custom.end
        ? { start: custom.start, end: custom.end }
        : { start: custom.end, end: custom.start };
    }
  }
}

// Client-side filter by the sale's `date` key. Date keys are zero-padded
// YYYY-MM-DD strings, so plain string comparison sorts/range-compares
// correctly with no Date parsing needed. The dataset (a small coffee
// cart's sales) is small enough that a full client-side filter over
// listSales()'s result is simpler than adding range-query logic to
// salesService.ts — see NEXT_PHASE_PROMPT.md's Phase 5 brief.
export function filterSalesByRange(sales: Sale[], range: DateRange): Sale[] {
  return sales.filter((s) => s.date >= range.start && s.date <= range.end);
}

export interface SalesStats {
  total: number;
  transactionCount: number;
  itemsSold: number;
  averageSale: number;
  paymentBreakdown: [string, number][]; // [paymentMethod, total], desc by total
}

// Shared by Phase 4's "Today" dashboard and Phase 5's Reports — identical
// shape, different input (today's sales vs. a selected range's sales).
export function computeSalesStats(sales: Sale[]): SalesStats {
  const total = sales.reduce((sum, s) => sum + s.total, 0);
  const transactionCount = sales.length;
  const itemsSold = sales.reduce(
    (sum, s) => sum + s.items.reduce((lineSum, i) => lineSum + i.quantity, 0),
    0,
  );
  const averageSale = transactionCount > 0 ? total / transactionCount : 0;

  const byPaymentMethod = new Map<string, number>();
  for (const sale of sales) {
    byPaymentMethod.set(sale.paymentMethod, (byPaymentMethod.get(sale.paymentMethod) ?? 0) + sale.total);
  }

  return {
    total,
    transactionCount,
    itemsSold,
    averageSale,
    paymentBreakdown: [...byPaymentMethod.entries()].sort((a, b) => b[1] - a[1]),
  };
}

export interface ProductPerformanceRow {
  name: string;
  quantity: number;
  revenue: number;
}

// Aggregates every line item across the given sales by product name
// snapshot, tracking both quantity and revenue together. Phase 4's "top
// products" only needed quantity for a single day; a wider Reports range
// makes "what actually made money" a genuinely different, useful question
// from "what moved the most units" — see HANDOFF.md's Phase 5 section for
// the decision to surface both rather than picking one.
export function computeProductPerformance(sales: Sale[]): ProductPerformanceRow[] {
  const byProduct = new Map<string, { quantity: number; revenue: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = byProduct.get(item.productNameSnapshot) ?? { quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.lineTotal;
      byProduct.set(item.productNameSnapshot, existing);
    }
  }
  return [...byProduct.entries()].map(([name, v]) => ({ name, ...v }));
}

export function topProductsByQuantity(
  rows: ProductPerformanceRow[],
  limit: number,
): ProductPerformanceRow[] {
  return [...rows].sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}

export function topProductsByRevenue(
  rows: ProductPerformanceRow[],
  limit: number,
): ProductPerformanceRow[] {
  return [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}
