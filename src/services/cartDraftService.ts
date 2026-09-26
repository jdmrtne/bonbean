// PHASE 10: persists the single in-progress POS cart to IndexedDB so a
// refresh, an accidental tab close, or the app being reopened later
// restores the unfinished order instead of silently losing it.
//
// Deliberately a flat CartLine[] under one fixed key (like settings.ts's
// SETTINGS_KEY) — there is only ever one "current order" per device, the
// same reasoning as database/db.ts's `cartDraft` store comment. This is
// intentionally separate from sales/saleItems: an unfinished cart is not
// a sale, must never appear in History/Reports, and must never be
// touched by backup/restore's full-replace (see backupService.ts) — it
// isn't part of what a backup is meant to capture.
import { getDB } from "../database/db";
import type { CartLine } from "../types";

const CART_DRAFT_KEY = "current";

export async function getCartDraft(): Promise<CartLine[]> {
  const db = await getDB();
  const draft = await db.get("cartDraft", CART_DRAFT_KEY);
  return draft ?? [];
}

export async function saveCartDraft(lines: CartLine[]): Promise<void> {
  const db = await getDB();
  await db.put("cartDraft", lines, CART_DRAFT_KEY);
}

export async function clearCartDraft(): Promise<void> {
  const db = await getDB();
  await db.delete("cartDraft", CART_DRAFT_KEY);
}
