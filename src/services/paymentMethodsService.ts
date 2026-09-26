import { getDB } from "../database/db";
import type { PaymentMethod } from "../types";
import { generateId } from "../utils/id";

export async function listPaymentMethods(includeInactive = true): Promise<PaymentMethod[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("paymentMethods", "by-sortOrder");
  return includeInactive ? all : all.filter((p) => p.active);
}

export async function addPaymentMethod(input: { name: string }): Promise<PaymentMethod> {
  const db = await getDB();
  const existing = await db.getAll("paymentMethods");
  const nextSortOrder = existing.length
    ? Math.max(...existing.map((p) => p.sortOrder)) + 1
    : 0;

  const method: PaymentMethod = {
    id: generateId(),
    name: input.name.trim(),
    active: true,
    sortOrder: nextSortOrder,
  };
  await db.add("paymentMethods", method);
  return method;
}

export async function updatePaymentMethod(
  id: string,
  changes: Partial<Pick<PaymentMethod, "name" | "active" | "sortOrder">>,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("paymentMethods", id);
  if (!existing) throw new Error("Payment method not found");
  await db.put("paymentMethods", { ...existing, ...changes });
}

export async function setPaymentMethodActive(id: string, active: boolean): Promise<void> {
  await updatePaymentMethod(id, { active });
}

export async function movePaymentMethod(id: string, direction: "up" | "down"): Promise<void> {
  const db = await getDB();
  const all = (await db.getAllFromIndex("paymentMethods", "by-sortOrder")).slice();
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) return;

  const a = all[index];
  const b = all[swapWith];
  const tx = db.transaction("paymentMethods", "readwrite");
  await Promise.all([
    tx.store.put({ ...a, sortOrder: b.sortOrder }),
    tx.store.put({ ...b, sortOrder: a.sortOrder }),
  ]);
  await tx.done;
}
