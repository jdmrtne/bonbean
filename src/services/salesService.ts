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

function formatDateKey(d: Date): string {
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
