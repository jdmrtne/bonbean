// Domain types for bon&bean.
// These mirror the IndexedDB stores that will be built in PHASE 1.
// Defined now so components/routes built in later phases share one source of truth.

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  image?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  // PHASE 10: whether this method should show the cash-received/change
  // fields at checkout. Previously this was inferred by matching the
  // method's name against the literal string "Cash" (see
  // CheckoutModal.tsx's old isCashMethod helper) — fragile, since
  // renaming the seeded "Cash" method silently broke cash handling.
  // Existing installs are migrated in database/db.ts's upgrade() so
  // every payment method created before this field existed gets a
  // sensible default (true only for a method literally named "Cash").
  isCash: boolean;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  // PHASE 11: short, human-friendly sequential Order ID (e.g.
  // "ORD-0001"), assigned once at creation and never regenerated — this
  // is what's shown to the cashier/owner everywhere (checkout
  // confirmation, Sales History, Reports, CSV export, Sale details).
  // `id` above stays as the internal IndexedDB primary key (and
  // saleItems' foreign key) and is never renamed, so old data and
  // existing references to it remain valid. See database/db.ts's v4
  // migration for how every pre-existing sale is backfilled with one.
  orderNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  notes?: string;
  createdAt: string;
}

export interface Settings {
  businessName: string;
  currency: string;
}

// PHASE 12 — Open/Close Register with a cash fund. One record per shift.
// `closedAt`/`physicalCashCounted` are only set once the shift is closed
// (see services/registerService.ts's closeRegister) — a session with no
// `closedAt` is the currently open one, and there is never more than one
// of those at a time (openRegister guards against opening a second).
// The Opening Cash Fund is change-drawer float, never a sale or an
// expense — it is only ever used to back out the physical count into
// Cash Sales at close time (see utils/registerStats.ts), never added to
// or subtracted from Total Sales directly.
export interface RegisterSession {
  id: string;
  openingFund: number;
  openedAt: string; // ISO timestamp
  closedAt?: string; // ISO timestamp; absent while the session is open
  physicalCashCounted?: number;
}

// POS cart line (in-memory, before a sale is saved)
export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}
