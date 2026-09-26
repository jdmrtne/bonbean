// PHASE 6: triggers a browser file download for generated text content
// (CSV today; could take a different mimeType later).
//
// Deliberately NOT covered by scripts/smoke-test-db.ts — it only touches
// DOM/Blob/URL APIs (no pure logic to assert on), same as every other
// browser-only helper in this project (e.g. utils/id.ts's crypto usage).
// Works fully offline: Blob + a same-document object URL, no network
// request and no external library.
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// PHASE 13: same object-URL/anchor-click dance as downloadTextFile above,
// just for an already-built ExcelJS workbook instead of a plain string —
// used by the register closing report (see utils/registerReportExcel.ts).
// `workbook.xlsx.writeBuffer()` is the only async step in the whole
// export path; everything that builds the workbook's rows/formatting is
// synchronous and DOM-free.
export async function downloadExcelWorkbook(filename: string, workbook: import("exceljs").Workbook): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
