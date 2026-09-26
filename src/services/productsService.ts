import { getDB } from "../database/db";
import type { Product } from "../types";
import { generateId } from "../utils/id";

export async function listProducts(includeInactive = true): Promise<Product[]> {
  const db = await getDB();
  const all = await db.getAll("products");
  const sorted = all.sort((a, b) => a.name.localeCompare(b.name));
  return includeInactive ? sorted : sorted.filter((p) => p.active);
}

export async function listProductsByCategory(categoryId: string): Promise<Product[]> {
  const db = await getDB();
  return db.getAllFromIndex("products", "by-categoryId", categoryId);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const db = await getDB();
  return db.get("products", id);
}

export interface ProductInput {
  name: string;
  categoryId: string;
  price: number;
  image?: string;
}

export async function addProduct(input: ProductInput): Promise<Product> {
  const db = await getDB();
  const now = new Date().toISOString();
  const product: Product = {
    id: generateId(),
    name: input.name.trim(),
    categoryId: input.categoryId,
    price: input.price,
    image: input.image,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.add("products", product);
  return product;
}

// Editing a product (including its price) only ever changes this record.
// Past sales store their own productNameSnapshot/unitPriceSnapshot in
// SaleItem and must never be recalculated from live product data — see
// HANDOFF.md "DO NOT CHANGE".
export async function updateProduct(
  id: string,
  changes: Partial<ProductInput>,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("products", id);
  if (!existing) throw new Error("Product not found");
  await db.put("products", {
    ...existing,
    ...changes,
    updatedAt: new Date().toISOString(),
  });
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  const db = await getDB();
  const existing = await db.get("products", id);
  if (!existing) throw new Error("Product not found");
  await db.put("products", { ...existing, active, updatedAt: new Date().toISOString() });
}
