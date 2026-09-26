// In-memory cart state for the POS screen (PHASE 2).
//
// Deliberately NOT persisted to IndexedDB: the master spec's Phase 2 brief
// says a draft cart may stay in memory only, and there's no requirement yet
// for the cart to survive a reload mid-order. Revisit only if a real owner
// reports losing an in-progress order (e.g. from an accidental refresh) —
// see HANDOFF.md "Decisions Already Made".
import { useMemo, useState } from "react";
import type { CartLine } from "../types";

// Minimal shape needed to add a product to the cart — decoupled from the
// full `Product` type so this hook doesn't need to import services/DB types.
export interface CartableProduct {
  id: string;
  name: string;
  price: number;
}

export interface UseCartResult {
  lines: CartLine[];
  itemCount: number;
  total: number;
  addProduct: (product: CartableProduct) => void;
  increase: (productId: string) => void;
  decrease: (productId: string) => void;
  removeLine: (productId: string) => void;
  clear: () => void;
}

export function useCart(): UseCartResult {
  const [lines, setLines] = useState<CartLine[]>([]);

  function addProduct(product: CartableProduct) {
    setLines((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: 1,
        },
      ];
    });
  }

  function increase(productId: string) {
    setLines((prev) =>
      prev.map((line) =>
        line.productId === productId
          ? { ...line, quantity: line.quantity + 1 }
          : line,
      ),
    );
  }

  // Decreasing to 0 removes the line, per the Phase 2 brief.
  function decrease(productId: string) {
    setLines((prev) =>
      prev
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: line.quantity - 1 }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((line) => line.productId !== productId));
  }

  function clear() {
    setLines([]);
  }

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [lines],
  );

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  return { lines, itemCount, total, addProduct, increase, decrease, removeLine, clear };
}
