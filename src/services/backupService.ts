// PHASE 7: reads every IndexedDB store into a BackupFile, and writes a
// validated BackupFile back into every store.
//
// The plain data shape (BackupFile), its validation, and filename/
// serialization all live in utils/backup.ts (dependency-free, unit-tested
// via scripts/smoke-test-db.ts without touching IndexedDB at all). This
// file is deliberately the only place that imports both utils/backup.ts
// AND database/db.ts — same separation reportStats.ts/salesExport.ts keep
// from their own "pure logic vs. IndexedDB" halves.
import { getDB, SETTINGS_KEY } from "../database/db";
import type { PaymentMethod, Settings } from "../types";
import { BACKUP_FORMAT_VERSION, type BackupFile } from "../utils/backup";

const FALLBACK_SETTINGS: Settings = { businessName: "My bon&bean", currency: "₱" };

// Reads every store as-is (no filtering of inactive products/categories/
// payment methods — a backup is meant to be a complete, restorable copy,
// not a report). Sale.items are each Sale's OWN embedded copy — see
// salesService.ts's recordSale for why sales/saleItems hold the same
// records twice — and are backed up/restored exactly as stored, since
// they're already each SaleItem's price/name snapshot at time of sale.
export async function buildBackupFile(): Promise<BackupFile> {
  const db = await getDB();
  const [products, categories, paymentMethods, sales, saleItems, settings] = await Promise.all([
    db.getAll("products"),
    db.getAll("categories"),
    db.getAll("paymentMethods"),
    db.getAll("sales"),
    db.getAll("saleItems"),
    db.get("settings", SETTINGS_KEY),
  ]);

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    products,
    categories,
    paymentMethods,
    sales,
    saleItems,
    settings: settings ?? FALLBACK_SETTINGS,
  };
}

// FULL REPLACE, not a merge — this is the Phase 7 brief's central decision
// (see HANDOFF.md "Decisions Already Made" for the full reasoning). Every
// store is cleared, then repopulated entirely from the backup file. This
// was chosen over a merge because:
//   - it matches an owner's mental model of "restore my backup" (what's in
//     the file is what you get back, with no ambiguity about what
//     happened to records not in it);
//   - a merge raises id-collision and duplicate-sale questions with no
//     good default answer (if a sale with the same id exists on both
//     sides but differs, which wins?), where full replace has none;
//   - the caller (BackupManager.tsx) puts an explicit, honestly-worded
//     `window.confirm` in front of this — matching this project's existing
//     delete-confirmation convention (see salesService.ts's deleteSale
//     call-sites) — specifically BECAUSE this is destructive, so the
//     owner is never surprised by what "restore" did afterward.
//
// The caller is responsible for validating `payload` (utils/backup.ts's
// validateBackupFile) BEFORE calling this — this function assumes it has
// already been shape-checked and writes it as-is. In particular, every
// Sale's embedded items and every SaleItem's productNameSnapshot/
// unitPriceSnapshot are written back EXACTLY as they appear in the backup
// — never recomputed from whatever the (possibly different, post-restore)
// `products` data says. This is the same price/name-snapshot rule applied
// throughout every prior phase (see HANDOFF.md "DO NOT CHANGE") — a
// restored sale must keep showing what was actually paid at the time, not
// today's prices.
//
// All six stores are cleared and repopulated inside ONE idb transaction
// (same multi-store-transaction shape as salesService.ts's recordSale/
// deleteSale), so a failure partway through can't leave the database in a
// half-restored state — IndexedDB rolls the whole transaction back.
//
// `cartDraft` (PHASE 10) is deliberately NOT one of these six stores: an
// in-progress, unsaved cart isn't part of what a backup is meant to
// capture (see services/cartDraftService.ts), so restoring a backup
// leaves whatever draft cart is currently on this device untouched.
export async function restoreBackup(payload: BackupFile): Promise<void> {
  const db = await getDB();
  const storeNames = [
    "products",
    "categories",
    "paymentMethods",
    "sales",
    "saleItems",
    "settings",
  ] as const;

  const tx = db.transaction(storeNames, "readwrite");

  await Promise.all(storeNames.map((name) => tx.objectStore(name).clear()));

  await Promise.all([
    ...payload.products.map((p) => tx.objectStore("products").put(p)),
    ...payload.categories.map((c) => tx.objectStore("categories").put(c)),
    // PHASE 10: a backup made before the `isCash` field existed (see
    // types/index.ts) won't have it on its payment methods at all —
    // BACKUP_FORMAT_VERSION wasn't bumped for this, since
    // validateBackupFile's shape check doesn't inspect individual
    // PaymentMethod fields either way. Backfilled here with the exact
    // same rule as database/db.ts's own migration, so restoring an old
    // backup behaves identically to upgrading an old database: only a
    // method literally named "Cash" (case-insensitive) comes back as
    // cash-accepting. A backup that already has the field (current
    // format) is written through untouched.
    ...payload.paymentMethods.map((m) =>
      tx.objectStore("paymentMethods").put({
        ...m,
        isCash:
          typeof (m as Partial<PaymentMethod>).isCash === "boolean"
            ? m.isCash
            : m.name.trim().toLowerCase() === "cash",
      }),
    ),
    ...payload.sales.map((s) => tx.objectStore("sales").put(s)),
    ...payload.saleItems.map((i) => tx.objectStore("saleItems").put(i)),
    tx.objectStore("settings").put(payload.settings, SETTINGS_KEY),
  ]);

  await tx.done;
}
