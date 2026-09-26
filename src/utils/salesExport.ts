// PHASE 6: turns a Sale[] (already resolved to a date range by
// reportStats.ts) into rows for a bookkeeping-friendly CSV export.
//
// Deliberately dependency-free, same spirit as reportStats.ts — takes
// Sale[] as a plain parameter rather than importing salesService.ts/db.ts,
// so this can be unit-tested with a bare `tsx` invocation (see
// scripts/smoke-test-db.ts, "CSV export" section) with no node_modules at
// all. Only downloadCsvFile (utils/download.ts) touches the DOM/Blob APIs
// and is therefore NOT covered by the smoke test, same as every other
// browser-only helper in this project.

import type { DateRange } from "./reportStats";
import type { Sale } from "../types";
import { escapeCsvField, rowsToCsv } from "./csv";

export interface TransactionLineRow {
  date: string;
  time: string;
  // PHASE 11: the sale's short, human-friendly Order ID (e.g.
  // "ORD-0001" — see types/index.ts's Sale.orderNumber), NOT the
  // internal UUID `id`. Field name kept as `saleId` for backward
  // compatibility with existing callers/tests; it always holds the
  // order number now.
  saleId: string;
  paymentMethod: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  saleTotal: number;
  notes: string;
}

// One row per SALE ITEM, not one row per sale.
//
// Decision (documented per the Phase 6 brief): an owner's accountant/
// bookkeeper wants product-level detail — what sold, at what price, how
// many — not just a per-transaction total, since Reports' own stat cards
// (on-screen, and in the PDF/print export) already cover the
// totals/averages/payment-breakdown view. A sale with 3 line items
// becomes 3 CSV rows that all share the same saleId/date/time/
// paymentMethod/saleTotal, so the original transaction is still fully
// reconstructable by grouping rows on saleId — nothing is lost.
//
// unitPrice/lineTotal come from each SaleItem's price/name SNAPSHOT
// (productNameSnapshot/unitPriceSnapshot), never from a live Product
// look-up — this is the price-snapshot rule from HANDOFF.md's "DO NOT
// CHANGE", and it falls out naturally here since Sale/SaleItem only ever
// store the snapshot in the first place.
export function buildTransactionLineRows(sales: Sale[]): TransactionLineRow[] {
  const rows: TransactionLineRow[] = [];
  for (const sale of sales) {
    for (const item of sale.items) {
      rows.push({
        date: sale.date,
        time: sale.time,
        saleId: sale.orderNumber,
        paymentMethod: sale.paymentMethod,
        productName: item.productNameSnapshot,
        unitPrice: item.unitPriceSnapshot,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        saleTotal: sale.total,
        notes: sale.notes ?? "",
      });
    }
  }
  return rows;
}

const TRANSACTION_CSV_HEADERS = [
  "Date",
  "Time",
  "Order ID",
  "Payment method",
  "Product",
  "Unit price",
  "Quantity",
  "Line total",
  "Order total",
  "Notes",
];

// Amounts are plain numbers with no currency symbol (e.g. "150.00", not
// "₱150.00") — a bookkeeping spreadsheet/accounting tool wants to sum a
// numeric column, and a currency symbol would force every importer to
// strip it back out first. The app's currency symbol is a display-layer
// concern (see utils/money.ts's formatMoney), not part of the export.
export function transactionRowsToCsv(rows: TransactionLineRow[]): string {
  const dataRows = rows.map((r) => [
    r.date,
    r.time,
    r.saleId,
    r.paymentMethod,
    r.productName,
    r.unitPrice.toFixed(2),
    r.quantity,
    r.lineTotal.toFixed(2),
    r.saleTotal.toFixed(2),
    r.notes,
  ]);
  return rowsToCsv(TRANSACTION_CSV_HEADERS, dataRows);
}

// PHASE 11 — Orders Summary: one row per SALE (not per item), the
// complement to buildTransactionLineRows' one-row-per-item shape. This is
// what makes "one completed sale = one Order ID" obvious at a glance in
// the export — a multi-product order that produces several rows above
// collapses back down to a single row here, with its own item/quantity
// counts and payment details, never double-counted.
export interface OrderSummaryRow {
  orderId: string;
  date: string;
  time: string;
  itemCount: number;
  totalQty: number;
  paymentMethod: string;
  amountReceived: number | null;
  change: number | null;
  orderTotal: number;
}

export function buildOrderSummaryRows(sales: Sale[]): OrderSummaryRow[] {
  return sales.map((sale) => ({
    orderId: sale.orderNumber,
    date: sale.date,
    time: sale.time,
    itemCount: sale.items.length,
    totalQty: sale.items.reduce((sum, item) => sum + item.quantity, 0),
    paymentMethod: sale.paymentMethod,
    amountReceived: sale.amountReceived ?? null,
    change: sale.change ?? null,
    orderTotal: sale.total,
  }));
}

const ORDER_SUMMARY_CSV_HEADERS = [
  "Order ID",
  "Date",
  "Time",
  "Items",
  "Total qty",
  "Payment method",
  "Amount received",
  "Change",
  "Order total",
];

function orderSummaryRowToCsvRow(r: OrderSummaryRow): (string | number)[] {
  return [
    r.orderId,
    r.date,
    r.time,
    r.itemCount,
    r.totalQty,
    r.paymentMethod,
    r.amountReceived !== null ? r.amountReceived.toFixed(2) : "",
    r.change !== null ? r.change.toFixed(2) : "",
    r.orderTotal.toFixed(2),
  ];
}

// Sum of every completed order's total, counted exactly once per Order
// ID — `sales` already holds one record per completed sale (not per line
// item, unlike TransactionLineRow above), so this is a plain sum with no
// grouping needed and no risk of a multi-product order being added twice.
// There is no cancelled/failed/incomplete sale state in this app (every
// record in the `sales` store is a completed transaction — see
// salesService.ts), so nothing needs to be filtered out here; if that
// ever changes, filter `sales` before calling this, the same way the
// caller already filters by date range.
export function computeOverallTotal(sales: Sale[]): number {
  return sales.reduce((sum, sale) => sum + sale.total, 0);
}

export function orderSummaryRowsToCsv(sales: Sale[]): string {
  const rows = buildOrderSummaryRows(sales).map(orderSummaryRowToCsvRow);
  const overallTotal = computeOverallTotal(sales);
  const columnCount = ORDER_SUMMARY_CSV_HEADERS.length;

  // A dash separator row, then the OVERALL TOTAL row itself with the
  // label and amount in their own cells (nothing else on the row) — the
  // clearest a plain CSV can make a total row stand out from the order
  // rows above it, short of real spreadsheet bold formatting.
  const separatorRow = Array(columnCount).fill("---");
  const overallRow = Array(columnCount).fill("");
  overallRow[columnCount - 2] = "OVERALL TOTAL";
  overallRow[columnCount - 1] = overallTotal.toFixed(2);

  return rowsToCsv(ORDER_SUMMARY_CSV_HEADERS, [...rows, separatorRow, overallRow]);
}

// PHASE 11: the full sales report — Order Items (one row per line item,
// grouped and kept together by Order ID) followed by an Orders Summary
// (one row per order, ending in an OVERALL TOTAL row) — as two sections
// in a single CSV file. Kept as one file rather than two downloads so an
// owner handing this to a bookkeeper only has one thing to send; a real
// multi-sheet Excel workbook would separate these onto their own tabs,
// but this project deliberately stays CSV-only rather than adding a
// spreadsheet-writing dependency (see this file's header comment and
// utils/csv.ts's).
export function buildSalesReportCsv(sales: Sale[]): string {
  const itemRows = buildTransactionLineRows(sales);
  const itemsCsv = transactionRowsToCsv(itemRows);
  const summaryCsv = orderSummaryRowsToCsv(sales);

  return ["Order Items", itemsCsv, "", "Orders Summary", summaryCsv].join("\r\n");
}

// Shared filename convention for both the CSV and (future) print/PDF
// export, so the two stay consistent if a person saves both for the same
// range. A single-day range (e.g. "today") collapses to one date instead
// of "2026-03-18_to_2026-03-18".
export function buildExportFilename(range: DateRange, ext: string): string {
  const rangePart = range.start === range.end ? range.start : `${range.start}_to_${range.end}`;
  return `sales-report_${rangePart}.${ext}`;
}

// Re-exported so callers only need to import from this one module for the
// CSV path, without reaching into utils/csv.ts directly.
export { escapeCsvField, rowsToCsv };
