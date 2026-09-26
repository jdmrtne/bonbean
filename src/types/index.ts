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

// POS cart line (in-memory, before a sale is saved)
export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}
