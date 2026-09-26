// Sales recording (PHASE 3).
//
// Writes a Sale plus its SaleItems from the current cart. The SaleItem
// price/name snapshots are copied directly from the cart's CartLine at the
// moment of sale — never re-read from the live Product record — so a later
// price or name change on the product never rewrites history. This is the
// master spec's core data rule; see HANDOFF.md "DO NOT CHANGE".
import { getDB } from "../database/db";
import type { CartLine, Sale, SaleItem } from "../types";
import { generateId } from "../utils/id";

export interface RecordSaleInput {
  lines: CartLine[];
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  notes?: string;
}

export async function recordSale(input: RecordSaleInput): Promise<Sale> {
  if (input.lines.length === 0) {
    throw new Error("Cannot record a sale with an empty cart");
  }

  const db = await getDB();
  const now = new Date();
  const saleId = generateId();

  const items: SaleItem[] = input.lines.map((line) => ({
    id: generateId(),
    saleId,
    productId: line.productId,
    productNameSnapshot: line.name,
    unitPriceSnapshot: line.unitPrice,
    quantity: line.quantity,
    lineTotal: line.unitPrice * line.quantity,
  }));

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

  const sale: Sale = {
    id: saleId,
    date: formatDateKey(now),
    time: formatTimeKey(now),
    items,
    total,
    paymentMethod: input.paymentMethod,
    amountReceived: input.amountReceived,
    change: input.change,
    notes: input.notes,
    createdAt: now.toISOString(),
  };

  // Sale.items (embedded) and the flat saleItems store both hold the same
  // records — the embedded copy makes a single sale self-contained, the
  // flat store makes per-product queries (Phase 4 "Top products", Phase 5
  // product performance) cheap without scanning every sale. Written in one
  // transaction so a sale is never saved with only one of the two present.
  const tx = db.transaction(["sales", "saleItems"], "readwrite");
  await Promise.all([
    tx.objectStore("sales").add(sale),
    ...items.map((item) => tx.objectStore("saleItems").add(item)),
  ]);
  await tx.done;

  return sale;
}

// PHASE 4: read/delete/annotate sales. Kept in this file per the Phase 3
// handoff note, alongside recordSale, since they all operate on the same
// sales/saleItems pair.

// Sorted most-recent-first. The by-date index only orders by date (not
// time), so within a day we re-sort by the time string ("HH:mm", safe to
// compare as text since it's zero-padded), then by the full createdAt ISO
// timestamp as a final tiebreaker. That last step matters: two sales
// saved in the same minute have equal date AND time keys, and IndexedDB
// does not guarantee insertion order for equal index keys — without the
// createdAt tiebreaker, ordering between such sales is effectively
// random. createdAt has millisecond precision, so it reliably resolves
// ties without needing a stored sequence number.
export async function listSales(): Promise<Sale[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("sales", "by-date");
  return all.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.time !== b.time) return b.time.localeCompare(a.time);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

// Removes the Sale record AND every SaleItem that belongs to it, in one
// transaction — same multi-store-transaction shape as recordSale, so a
// delete can never leave orphaned saleItems behind (or vice versa).
export async function deleteSale(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["sales", "saleItems"], "readwrite");
  const itemsStore = tx.objectStore("saleItems");
  const items = await itemsStore.index("by-saleId").getAll(id);
  await Promise.all([
    tx.objectStore("sales").delete(id),
    ...items.map((item) => itemsStore.delete(item.id)),
  ]);
  await tx.done;
}

// Phase 4 "editing a transaction": scoped to notes only, deliberately.
// Everything else on a saved sale (items, prices, payment, totals) is a
// record of what actually happened and must stay immutable — see the
// price-snapshot rule at the top of this file. See HANDOFF.md for the
// full reasoning and what was deferred.
export async function updateSaleNotes(id: string, notes: string): Promise<void> {
  const db = await getDB();
  const existing = await db.get("sales", id);
  if (!existing) throw new Error("Sale not found");
  await db.put("sales", { ...existing, notes: notes.trim() || undefined });
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeKey(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}
