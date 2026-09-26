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
