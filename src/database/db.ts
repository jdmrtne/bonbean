// IndexedDB initialization for bon&bean.
//
// PHASE 1: real schema. All 6 stores from the master spec now exist:
// products, categories, paymentMethods, sales, saleItems, settings.
//
// Sales/saleItems stores are created here (so the schema is stable and
// migrations are cheap later), but are not written to until PHASE 3.
//
// PHASE 10: added a 7th store, `cartDraft`, holding the single
// in-progress POS cart (see services/cartDraftService.ts) so an
// unfinished order survives a refresh/reopen. Also backfills the new
// `isCash` field (types/index.ts) onto any payment method created
// before it existed.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  CartLine,
  Category,
  PaymentMethod,
  Product,
  Sale,
  SaleItem,
  Settings,
} from "../types";
import { generateId } from "../utils/id";
import { formatOrderNumber, parseOrderNumber } from "../utils/orderNumber";

export const DB_NAME = "coffee-cart-pos";
export const DB_VERSION = 4;

export const SETTINGS_KEY = "app";

// PHASE 11: single persisted counter backing Sale.orderNumber (see
// types/index.ts). Keyed like `settings`/`cartDraft` — one fixed key,
// there is only ever one running sequence per device. The stored value
// is the highest order sequence number already issued; the next sale
// gets stored+1 (see services/salesService.ts's recordSale).
export const ORDER_SEQUENCE_KEY = "orderSequence";

interface CoffeeCartDBSchema extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { "by-categoryId": string; "by-active": number };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { "by-sortOrder": number };
  };
  paymentMethods: {
    key: string;
    value: PaymentMethod;
    indexes: { "by-sortOrder": number };
  };
  sales: {
    key: string;
    value: Sale;
    indexes: { "by-date": string };
  };
  saleItems: {
    key: string;
    value: SaleItem;
    indexes: { "by-saleId": string; "by-productId": string };
  };
  settings: {
    key: string;
    value: Settings;
  };
  // PHASE 10: a single persisted draft of the current POS cart, keyed
  // like `settings` (one fixed key, see CART_DRAFT_KEY in
  // services/cartDraftService.ts) rather than by id — there is only
  // ever one "current order" per device.
  cartDraft: {
    key: string;
    value: CartLine[];
  };
  // PHASE 11: the running Order ID sequence counter (see
  // ORDER_SEQUENCE_KEY above). A single number, not an object — nothing
  // else needs to live alongside it.
  orderSequence: {
    key: string;
    value: number;
  };
}

let dbPromise: Promise<IDBPDatabase<CoffeeCartDBSchema>> | null = null;

const DEFAULT_PAYMENT_METHODS: Omit<PaymentMethod, "id">[] = [
  { name: "Cash", active: true, sortOrder: 0, isCash: true },
  { name: "GCash", active: true, sortOrder: 1, isCash: false },
  { name: "Maya", active: true, sortOrder: 2, isCash: false },
  { name: "Bank Transfer", active: true, sortOrder: 3, isCash: false },
  { name: "Other", active: true, sortOrder: 4, isCash: false },
];

const DEFAULT_SETTINGS: Settings = {
  businessName: "My bon&bean",
  currency: "₱",
};

export function getDB(): Promise<IDBPDatabase<CoffeeCartDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<CoffeeCartDBSchema>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        // v0 -> v1 (PHASE 0 placeholder): a bare "settings" store existed
        // with no keyPath. We drop and recreate it below with the real
        // shape, since it never held real data in Phase 0.
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains("settings")) {
            db.deleteObjectStore("settings");
          }

          const products = db.createObjectStore("products", { keyPath: "id" });
          products.createIndex("by-categoryId", "categoryId");
          products.createIndex("by-active", "active");

          const categories = db.createObjectStore("categories", { keyPath: "id" });
          categories.createIndex("by-sortOrder", "sortOrder");

          const paymentMethods = db.createObjectStore("paymentMethods", {
            keyPath: "id",
          });
          paymentMethods.createIndex("by-sortOrder", "sortOrder");

          const sales = db.createObjectStore("sales", { keyPath: "id" });
          sales.createIndex("by-date", "date");

          const saleItems = db.createObjectStore("saleItems", { keyPath: "id" });
          saleItems.createIndex("by-saleId", "saleId");
          saleItems.createIndex("by-productId", "productId");

          db.createObjectStore("settings");

          // Seed defaults so the app is usable immediately, without
          // forcing the owner through empty-state setup screens first.
          for (const method of DEFAULT_PAYMENT_METHODS) {
            void tx.objectStore("paymentMethods").add({ ...method, id: generateId() });
          }
          void tx.objectStore("settings").put(DEFAULT_SETTINGS, SETTINGS_KEY);
        }

        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("cartDraft")) {
            db.createObjectStore("cartDraft");
          }

          // Backfill `isCash` on any payment method created before this
          // flag existed. Preserves current behavior exactly: a method
          // literally named "Cash" (case-insensitive, the only name the
          // old hard-coded check matched) becomes isCash=true; every
          // other existing method defaults to false and can be flipped
          // in the Payment Methods editor. Records freshly seeded above
          // (brand-new installs) already carry `isCash` explicitly, so
          // this is a no-op for them.
          if (db.objectStoreNames.contains("paymentMethods")) {
            const pmStore = tx.objectStore("paymentMethods");
            const methods = await pmStore.getAll();
            for (const method of methods) {
              if (typeof (method as Partial<PaymentMethod>).isCash !== "boolean") {
                await pmStore.put({
                  ...method,
                  isCash: method.name.trim().toLowerCase() === "cash",
                });
              }
            }
          }
        }

        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains("orderSequence")) {
            db.createObjectStore("orderSequence");
          }

          // Backfill every pre-existing sale with a short, sequential
          // orderNumber (see types/index.ts's Sale.orderNumber). Assigned
          // oldest-first so the numbering reads the same way a paper
          // order pad would have — sale #1 really was the first sale
          // ever recorded on this device. `id` (the primary key) is never
          // touched, so nothing that already references it (saleItems,
          // any external note of an old id) breaks.
          //
          // Sort key mirrors salesService.ts's listSales (date, then
          // time, then createdAt as the final tiebreaker for same-minute
          // sales), just ascending instead of descending.
          if (db.objectStoreNames.contains("sales")) {
            const salesStore = tx.objectStore("sales");
            const allSales = (await salesStore.getAll()) as Sale[];
            allSales.sort((a, b) => {
              if (a.date !== b.date) return a.date.localeCompare(b.date);
              if (a.time !== b.time) return a.time.localeCompare(b.time);
              return a.createdAt.localeCompare(b.createdAt);
            });

            let sequence = 0;
            for (const sale of allSales) {
              sequence += 1;
              if (!sale.orderNumber) {
                await salesStore.put({ ...sale, orderNumber: formatOrderNumber(sequence) });
              } else {
                // Already has one (e.g. re-running an interrupted
                // upgrade) — trust the highest number actually in use,
                // not just the row count, so the counter below can never
                // be set lower than an order number already issued.
                sequence = Math.max(sequence, parseOrderNumber(sale.orderNumber) ?? sequence);
              }
            }

            await tx.objectStore("orderSequence").put(sequence, ORDER_SEQUENCE_KEY);
          } else {
            await tx.objectStore("orderSequence").put(0, ORDER_SEQUENCE_KEY);
          }
        }
      },
    });
  }
  return dbPromise;
}
