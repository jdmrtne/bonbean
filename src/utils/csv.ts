// PHASE 6: minimal, dependency-free CSV encoding.
//
// Deliberately not a library (Papaparse etc.) — the shape we need (escape
// a field, join a header + rows) is a handful of lines, and every new npm
// dependency in this project has to be weighed against this environment's
// spotty npm registry access (see HANDOFF.md's Phase 2/3/5 sessions). A
// hand-rolled CSV encoder is easy to unit-test with zero installs (see
// scripts/smoke-test-db.ts, "CSV export" section) and has no version to
// pin or upgrade later.
//
// Follows RFC 4180's escaping rule: a field is wrapped in double quotes
// only if it contains a comma, a double quote, or a newline, and any
// double quote inside it is doubled.

export function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// CRLF line endings (per RFC 4180) — Excel on Windows in particular is
// pickier about bare "\n" than most spreadsheet apps.
export function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  return lines.join("\r\n");
}
