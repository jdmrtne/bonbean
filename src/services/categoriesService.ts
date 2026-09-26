import { getDB } from "../database/db";
import type { Category } from "../types";
import { generateId } from "../utils/id";

export async function listCategories(includeInactive = true): Promise<Category[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("categories", "by-sortOrder");
  return includeInactive ? all : all.filter((c) => c.active);
}

export async function addCategory(input: { name: string }): Promise<Category> {
  const db = await getDB();
  const existing = await db.getAll("categories");
  const nextSortOrder = existing.length
    ? Math.max(...existing.map((c) => c.sortOrder)) + 1
    : 0;

  const category: Category = {
    id: generateId(),
    name: input.name.trim(),
    active: true,
    sortOrder: nextSortOrder,
  };
  await db.add("categories", category);
  return category;
}

export async function updateCategory(
  id: string,
  changes: Partial<Pick<Category, "name" | "active" | "sortOrder">>,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("categories", id);
  if (!existing) throw new Error("Category not found");
  await db.put("categories", { ...existing, ...changes });
}

export async function setCategoryActive(id: string, active: boolean): Promise<void> {
  await updateCategory(id, { active });
}

// Swaps sortOrder with the neighboring category to move it up/down one spot.
export async function moveCategory(id: string, direction: "up" | "down"): Promise<void> {
  const db = await getDB();
  const all = (await db.getAllFromIndex("categories", "by-sortOrder")).slice();
  const index = all.findIndex((c) => c.id === id);
  if (index === -1) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) return;

  const a = all[index];
  const b = all[swapWith];
  const tx = db.transaction("categories", "readwrite");
  await Promise.all([
    tx.store.put({ ...a, sortOrder: b.sortOrder }),
    tx.store.put({ ...b, sortOrder: a.sortOrder }),
  ]);
  await tx.done;
}
