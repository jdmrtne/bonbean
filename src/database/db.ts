// IndexedDB initialization for Coffee Cart POS.
//
// PHASE 0 NOTE: this file is a placeholder that only proves the database
// dependency (`idb`) is wired up correctly. The real object stores
// (products, categories, paymentMethods, sales, saleItems, settings),
// indexes, and CRUD services belong to PHASE 1 — see NEXT_PHASE_PROMPT.md.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export const DB_NAME = "coffee-cart-pos";
export const DB_VERSION = 1;

// Minimal schema so the DB can open without errors before Phase 1 defines
// the full data layer. Phase 1 will replace this with the complete schema
// (products, categories, paymentMethods, sales, saleItems) and migrations.
interface CoffeeCartDBSchema extends DBSchema {
  settings: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<CoffeeCartDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<CoffeeCartDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<CoffeeCartDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
      },
    });
  }
  return dbPromise;
}
