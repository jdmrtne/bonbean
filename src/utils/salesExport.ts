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
        saleId: sale.id,
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
  "Sale ID",
  "Payment method",
  "Product",
  "Unit price",
  "Quantity",
  "Line total",
  "Sale total",
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
