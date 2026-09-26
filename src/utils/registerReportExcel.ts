// PHASE 13 — the register's closing report, reworked from a small CSV
// into a professional Excel (.xlsx) workbook with three sections, in
// this fixed order (as three worksheet tabs, in tab order — see the
// note below on why tabs rather than one stacked sheet):
//
//   1. REGISTER / SHIFT SUMMARY  — the cash reconciliation for this
//      session (see registerStats.ts's computeRegisterClosingSummary,
//      untouched by this file — every figure below is read straight off
//      that summary, never recomputed here).
//   2. ORDERS SUMMARY            — one row per order this shift.
//   3. ORDER ITEMS               — one row per product line this shift.
//
// Each section is its own worksheet, not three tables stacked in one
// sheet. All three tables use column A/B/C/... for completely different
// fields (e.g. column B is "Amount" in the summary, "Date" in Orders
// Summary, "Time" in Order Items) — stacked in one sheet, that forces
// every table to share one column-width setting per letter, so whichever
// section is written last silently wins and the others end up too narrow
// or too wide. Separate worksheets give each table its own column model,
// which is the actual fix, and it's the more standard way to lay out a
// multi-table workbook in Excel besides — a bookkeeper can click straight
// to the tab they want instead of scrolling past two other tables.
//
// Deliberately built on top of utils/salesExport.ts's existing, already
//-tested row builders (buildOrderSummaryRows / buildTransactionLineRows /
// computeOverallTotal) rather than re-deriving that shape here — this
// file only lays those same rows out on worksheets. salesExport.ts's own
// CSV-producing functions are untouched; nothing about the underlying
// sales/order data changes, only how the register's closing report is
// presented.
//
// Replaces utils/registerExport.ts's buildRegisterClosingCsv as what
// CloseRegisterModal.tsx downloads on close — see that file's header
// comment for why the CSV version existed in the first place (still true
// here, just now producing a real spreadsheet instead of plain text).
import ExcelJS from "exceljs";
import type { RegisterSession, Sale } from "../types";
import type { RegisterClosingSummary } from "./registerStats";
import { buildOrderSummaryRows, buildTransactionLineRows, computeOverallTotal } from "./salesExport";

const NAVY = "FF1F2937"; // title band background
const NAVY_TEXT = "FFFFFFFF";
const LIGHT_BAND = "FFF3F4F6"; // table header background
const BORDER_COLOR = "FFD1D5DB";
const TOTAL_BAND = "FFEFF6FF";
const SHORT_RED = "FFB91C1C";
const OVER_GREEN = "FF15803D";
const MUTED_TEXT = "FF6B7280";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

export interface RegisterReportParams {
  session: RegisterSession;
  summary: RegisterClosingSummary;
  shiftSales: Sale[];
  businessName: string;
  currency: string;
}

function moneyFormat(currency: string): string {
  // Currency literal embedded in the number format code itself, so the
  // cell stays a real number (sortable/summable in Excel) while still
  // displaying the shop's configured currency symbol. Escapes any
  // double-quote the symbol might contain, though none of the app's
  // seeded/typical currency symbols do.
  const escaped = currency.replace(/"/g, '\\"');
  return `"${escaped}"#,##0.00`;
}

function formatSessionTimestamp(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Every sheet opens with the same small header block — business name,
 * sheet title, generated time — so a tab opened on its own (e.g. printed,
 * or emailed as a single tab's screenshot) still identifies itself. */
function writeSheetHeader(
  sheet: ExcelJS.Worksheet,
  businessName: string,
  sheetTitle: string,
  span: number,
): void {
  const titleRow = sheet.addRow([businessName || "bon&bean"]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, span);
  titleRow.getCell(1).font = { bold: true, size: 14 };

  const bandRow = sheet.addRow([sheetTitle]);
  sheet.mergeCells(bandRow.number, 1, bandRow.number, span);
  bandRow.height = 22;
  const bandCell = bandRow.getCell(1);
  bandCell.font = { bold: true, size: 12, color: { argb: NAVY_TEXT } };
  bandCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  bandCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  const generatedRow = sheet.addRow([`Generated ${new Date().toLocaleString()}`]);
  generatedRow.getCell(1).font = { size: 9, italic: true, color: { argb: "FF9CA3AF" } };

  sheet.addRow([]);
}

function tableHeaderRow(sheet: ExcelJS.Worksheet, headers: string[]): void {
  const row = sheet.addRow(headers);
  row.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BAND } };
    cell.border = thinBorder;
    cell.alignment = { vertical: "middle" };
  });
}

function setColumnWidths(sheet: ExcelJS.Worksheet, widths: number[]): void {
  // sheet.columns.forEach(...) does not reliably persist per-column
  // widths in ExcelJS (the getter can return transient Column objects) —
  // sheet.getColumn(i) is the form that actually writes into the
  // worksheet's <cols> definition, so every column here is sized through
  // that call rather than via sheet.columns/sheet.columns=.
  //
  // Separately: ExcelJS treats a column width of EXACTLY 9 as equal to
  // its own internal default and silently drops it from the file (the
  // column then renders at Excel's own default width instead) — verified
  // by round-tripping a written file back through ExcelJS. Nudging by
  // 0.1 keeps the intended width without tripping that default-equality
  // check; every width below is nudged rather than left at a bare 9.
  widths.forEach((width, idx) => {
    sheet.getColumn(idx + 1).width = width === 9 ? 9.1 : width;
  });
}

/** Sheet 1 — Register / Shift Summary: a two-column Field/Amount table,
 * following the brief's exact row order and reconciliation rule (Opening
 * Cash Fund only ever backs Physical Cash Counted out into Cash Sales —
 * it is never subtracted from, or added into, Total Sales). */
function buildRegisterSummarySheet(
  workbook: ExcelJS.Workbook,
  session: RegisterSession,
  summary: RegisterClosingSummary,
  businessName: string,
  currency: string,
): void {
  const sheet = workbook.addWorksheet("Register Summary", { views: [{ showGridLines: false }] });
  writeSheetHeader(sheet, businessName, "REGISTER / SHIFT SUMMARY", 2);

  const meta1 = sheet.addRow(["Register opened", formatSessionTimestamp(session.openedAt)]);
  meta1.getCell(1).font = { bold: true };
  const meta2 = sheet.addRow(["Register closed", formatSessionTimestamp(session.closedAt)]);
  meta2.getCell(1).font = { bold: true };
  sheet.addRow([]);

  const fmt = moneyFormat(currency);

  const addFieldRow = (label: string, amount: number, opts?: { bold?: boolean; band?: boolean }) => {
    const row = sheet.addRow([label, amount]);
    row.getCell(2).numFmt = fmt;
    if (opts?.bold) {
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { bold: true };
    }
    if (opts?.band) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BAND } };
      });
    }
    row.eachCell((cell) => (cell.border = thinBorder));
    return row;
  };

  addFieldRow("Opening Cash Fund", summary.openingFund);
  addFieldRow("Cash Sales", summary.cashSales);
  for (const [name, total] of summary.nonCashBreakdown) {
    addFieldRow(`${name} Sales`, total);
  }
  addFieldRow("Total Sales", summary.totalSales, { bold: true, band: true });

  sheet.addRow([]);

  addFieldRow("Physical Cash Counted", summary.physicalCashCounted);
  addFieldRow("Less: Opening Cash Fund", summary.openingFund);
  addFieldRow("Cash Sales from Drawer", summary.cashSales);

  const overShortRow = addFieldRow("Cash Over/Short", summary.cashVariance, { bold: true, band: true });
  if (Math.abs(summary.cashVariance) > 0.004) {
    overShortRow.getCell(2).font = {
      bold: true,
      color: { argb: summary.cashVariance > 0 ? OVER_GREEN : SHORT_RED },
    };
  } else {
    overShortRow.getCell(2).font = { bold: true };
  }

  setColumnWidths(sheet, [30, 20]);
}

/** Sheet 2 — Orders Summary: exactly one row per order, ending in an
 * OVERALL TOTAL row equal to the sum of every Order Total above it. Built
 * directly from salesExport.ts's buildOrderSummaryRows/computeOverallTotal
 * so this can never drift from the app's own definition of an order. */
function buildOrdersSummarySheet(
  workbook: ExcelJS.Workbook,
  shiftSales: Sale[],
  businessName: string,
  currency: string,
): void {
  const headers = [
    "Order ID",
    "Date",
    "Time",
    "Items",
    "Total Qty",
    "Payment Method",
    "Amount Received",
    "Change",
    "Order Total",
  ];
  const sheet = workbook.addWorksheet("Orders Summary", { views: [{ showGridLines: false }] });
  writeSheetHeader(sheet, businessName, "ORDERS SUMMARY", headers.length);
  tableHeaderRow(sheet, headers);

  const fmt = moneyFormat(currency);
  const rows = buildOrderSummaryRows(shiftSales);

  for (const r of rows) {
    const row = sheet.addRow([
      r.orderId,
      r.date,
      r.time,
      r.itemCount,
      r.totalQty,
      r.paymentMethod,
      r.amountReceived,
      r.change,
      r.orderTotal,
    ]);
    row.getCell(7).numFmt = fmt;
    row.getCell(8).numFmt = fmt;
    row.getCell(9).numFmt = fmt;
    row.eachCell((cell) => (cell.border = thinBorder));
  }

  const overallTotal = computeOverallTotal(shiftSales);
  const totalRow = sheet.addRow(["", "", "", "", "", "", "", "OVERALL TOTAL", overallTotal]);
  totalRow.getCell(8).font = { bold: true };
  totalRow.getCell(8).alignment = { horizontal: "right" };
  totalRow.getCell(9).font = { bold: true };
  totalRow.getCell(9).numFmt = fmt;
  totalRow.eachCell((cell) => {
    cell.border = thinBorder;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BAND } };
  });

  if (rows.length === 0) {
    const emptyRow = sheet.addRow(["No orders recorded this shift."]);
    sheet.mergeCells(emptyRow.number, 1, emptyRow.number, headers.length);
    emptyRow.getCell(1).font = { italic: true, color: { argb: MUTED_TEXT } };
  }

  setColumnWidths(sheet, [14, 13, 9.5, 8, 10, 16, 15, 12, 13]);
}

/** Sheet 3 — Order Items: one row per product line, sharing the same
 * Order ID whenever several products belong to one order — built from
 * salesExport.ts's buildTransactionLineRows so the item-level detail
 * matches the CSV export's long-standing definition exactly. */
function buildOrderItemsSheet(
  workbook: ExcelJS.Workbook,
  shiftSales: Sale[],
  businessName: string,
  currency: string,
): void {
  const headers = [
    "Date",
    "Time",
    "Order ID",
    "Payment Method",
    "Product",
    "Unit Price",
    "Quantity",
    "Line Total",
    "Order Total",
    "Notes",
  ];
  const sheet = workbook.addWorksheet("Order Items", { views: [{ showGridLines: false }] });
  writeSheetHeader(sheet, businessName, "ORDER ITEMS", headers.length);
  tableHeaderRow(sheet, headers);

  const fmt = moneyFormat(currency);
  const rows = buildTransactionLineRows(shiftSales);

  for (const r of rows) {
    const row = sheet.addRow([
      r.date,
      r.time,
      r.saleId,
      r.paymentMethod,
      r.productName,
      r.unitPrice,
      r.quantity,
      r.lineTotal,
      r.saleTotal,
      r.notes,
    ]);
    row.getCell(6).numFmt = fmt;
    row.getCell(8).numFmt = fmt;
    row.getCell(9).numFmt = fmt;
    row.eachCell((cell) => (cell.border = thinBorder));
  }

  if (rows.length === 0) {
    const emptyRow = sheet.addRow(["No items recorded this shift."]);
    sheet.mergeCells(emptyRow.number, 1, emptyRow.number, headers.length);
    emptyRow.getCell(1).font = { italic: true, color: { argb: MUTED_TEXT } };
  }

  setColumnWidths(sheet, [13, 9.5, 14, 16, 22, 12, 10, 12, 13, 22]);
}

// Builds the whole workbook — three worksheets, in tab order, matching
// the brief's numbered structure exactly. Kept as its own function
// (rather than inlined at the download call site) so it stays easy to
// unit-test later the same way salesExport.ts/registerStats.ts are —
// everything here is deterministic given its inputs, no clock/DOM access
// except for `new Date()` in each sheet's "Generated" line, which mirrors
// ReportsPage.tsx's existing print header convention.
export async function buildRegisterReportWorkbook(
  params: RegisterReportParams,
): Promise<ExcelJS.Workbook> {
  const { session, summary, shiftSales, businessName, currency } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = businessName || "bon&bean POS";
  workbook.created = new Date();

  buildRegisterSummarySheet(workbook, session, summary, businessName, currency);
  buildOrdersSummarySheet(workbook, shiftSales, businessName, currency);
  buildOrderItemsSheet(workbook, shiftSales, businessName, currency);

  return workbook;
}

// Same date stamp (close moment, falling back to the open moment) as the
// old buildRegisterClosingFilename in registerExport.ts, just with the
// .xlsx extension this workbook actually needs.
export function buildRegisterReportFilename(session: RegisterSession): string {
  const stamp = (session.closedAt ?? session.openedAt).slice(0, 10);
  return `register-closing_${stamp}.xlsx`;
}
