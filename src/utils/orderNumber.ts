// PHASE 11: short, human-friendly sequential Order IDs (e.g. "ORD-0001"),
// replacing the raw crypto.randomUUID() previously shown as a sale's id
// (see types/index.ts's Sale.orderNumber and database/db.ts's v4
// migration for how this is assigned/backfilled).
//
// Dependency-free by design, same discipline as reportStats.ts/
// salesExport.ts — a plain string <-> number mapping that database/db.ts,
// services/salesService.ts, and utils/salesExport.ts all share, so the
// format can never drift between where an order number is assigned and
// where it's displayed or exported.

const PREFIX = "ORD-";
const MIN_DIGITS = 4;

// Zero-pads to at least MIN_DIGITS (ORD-0001 .. ORD-9999), then grows
// naturally past that (ORD-10000) rather than truncating — an order
// count in the tens of thousands is still formatted correctly, just
// wider, so this never has to reject or wrap a sequence number.
export function formatOrderNumber(sequence: number): string {
  return `${PREFIX}${String(sequence).padStart(MIN_DIGITS, "0")}`;
}

// Extracts the numeric sequence from a well-formed order number, or null
// if the string isn't one (e.g. a legacy long id, or a hand-edited
// import) — used to resync the sequence counter (database/db.ts's
// migration, services/backupService.ts's restoreBackup) without trusting
// a stored counter blindly.
export function parseOrderNumber(value: string): number | null {
  const match = /^ORD-(\d+)$/.exec(value);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}
