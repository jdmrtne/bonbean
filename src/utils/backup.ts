// PHASE 7: the backup file's shape, validation, and filename/serialization
// helpers.
//
// Deliberately dependency-free, same discipline as reportStats.ts and
// salesExport.ts (see their header comments) — this module only imports
// type-only ../types and ./date's formatDateKey (itself dependency-free),
// so it can be unit-tested with a bare `tsx` invocation and zero
// node_modules. All of the actual IndexedDB reading/writing lives in
// services/backupService.ts instead; this file only shapes and validates
// plain data.

import type { Category, PaymentMethod, Product, Sale, SaleItem, Settings } from "../types";
import { formatDateKey } from "./date";

// Bumping this is a deliberate, future decision (see HANDOFF.md) — a
// format-version field from day one means a later phase can add fields or
// change shape without guessing whether an old, unversioned file is safe
// to import. validateBackupFile below rejects anything that isn't exactly
// this version rather than guessing at a migration.
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string; // ISO timestamp
  products: Product[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  sales: Sale[];
  saleItems: SaleItem[];
  settings: Settings;
}

export type BackupValidationResult =
  | { valid: true; data: BackupFile }
  | { valid: false; error: string };

const RECORD_ARRAY_KEYS = [
  "products",
  "categories",
  "paymentMethods",
  "sales",
  "saleItems",
] as const;

function isArrayOfRecordsWithId(value: unknown): value is { id: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "string",
    )
  );
}

// Checks the format-version field and that every expected section is
// present with a plausible shape (an array of objects each carrying an
// `id`, plus a settings object with the two known fields). Deliberately
// NOT a full per-record schema validator — the goal is to reject a file
// that plainly isn't a real backup (wrong app, hand-edited garbage, a
// future/older format-version) with a clear message, not to catch every
// possible malformed record. Nothing is written to IndexedDB until this
// returns `valid: true` — see backupService.ts's restoreBackup.
export function validateBackupFile(raw: unknown): BackupValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { valid: false, error: "This file isn't a valid backup (expected a JSON object)." };
  }
  const obj = raw as Record<string, unknown>;

  if (obj.formatVersion !== BACKUP_FORMAT_VERSION) {
    return {
      valid: false,
      error: `Unsupported backup format (expected version ${BACKUP_FORMAT_VERSION}, found ${JSON.stringify(
        obj.formatVersion,
      )}). This file may be from a different version of the app.`,
    };
  }

  if (typeof obj.exportedAt !== "string" || obj.exportedAt.trim() === "") {
    return { valid: false, error: "Backup is missing a valid \"exportedAt\" timestamp." };
  }

  for (const key of RECORD_ARRAY_KEYS) {
    if (!isArrayOfRecordsWithId(obj[key])) {
      return { valid: false, error: `Backup is missing or has an invalid "${key}" section.` };
    }
  }

  const settings = obj.settings;
  if (
    typeof settings !== "object" ||
    settings === null ||
    typeof (settings as Partial<Settings>).businessName !== "string" ||
    typeof (settings as Partial<Settings>).currency !== "string"
  ) {
    return { valid: false, error: "Backup is missing a valid \"settings\" section." };
  }

  return {
    valid: true,
    data: {
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: obj.exportedAt,
      products: obj.products as Product[],
      categories: obj.categories as Category[],
      paymentMethods: obj.paymentMethods as PaymentMethod[],
      sales: obj.sales as Sale[],
      saleItems: obj.saleItems as SaleItem[],
      settings: settings as Settings,
    },
  };
}

// Pretty-printed JSON — a backup file is small (a single coffee cart's
// data) and human-readability (spot-checking in a text editor, diffing
// two backups) outweighs the byte savings of a minified file here, unlike
// the CSV export which is meant for a spreadsheet, not a person to read.
export function serializeBackup(payload: BackupFile): string {
  return JSON.stringify(payload, null, 2);
}

// Uses today's date, not exportedAt — this names the file being saved
// right now, matching salesExport.ts's buildExportFilename convention of
// a plain, sortable date-stamped name.
export function buildBackupFilename(now: Date = new Date()): string {
  return `bon-and-bean-backup_${formatDateKey(now)}.json`;
}
