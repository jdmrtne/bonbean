import { useEffect, useMemo, useState } from "react";
import { CartPanel } from "../components/CartPanel";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { listCategories } from "../services/categoriesService";
import { listProducts } from "../services/productsService";
import { getSettings } from "../services/settingsService";
import { useCart } from "../hooks/useCart";
import type { Category, Product } from "../types";
import { formatMoney } from "../utils/money";

const ALL_CATEGORIES = "all";

export function PosPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [currency, setCurrency] = useState("₱");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cart = useCart();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [categoryList, productList, settings] = await Promise.all([
          listCategories(false),
          listProducts(false),
          getSettings(),
        ]);
        if (cancelled) return;
        setCategories(categoryList);
        setProducts(productList);
        setCurrency(settings.currency);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load the product catalog");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // A product whose category has been deactivated is filtered out of the
  // POS grid, same as an inactive product — its stored data is untouched.
  // This decides the "Known Issue" left open at the end of Phase 1.
  const activeCategoryIds = useMemo(
    () => new Set((categories ?? []).map((c) => c.id)),
    [categories],
  );

  const visibleProducts = useMemo(
    () => (products ?? []).filter((p) => activeCategoryIds.has(p.categoryId)),
    [products, activeCategoryIds],
  );

  const gridProducts = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) return visibleProducts;
    return visibleProducts.filter((p) => p.categoryId === selectedCategory);
  }, [visibleProducts, selectedCategory]);

  if (error) {
    return (
      <div className="banner banner--danger" role="alert">
        {error}
      </div>
    );
  }

  if (categories === null || products === null) return null;

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">POS</h1>
        <p className="page-header__subtitle">Tap products to start an order.</p>
      </div>

      <div className="pos-layout">
        <div className="pos-products">
          {categories.length > 0 && (
            <div className="category-tabs" role="tablist" aria-label="Product categories">
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === ALL_CATEGORIES}
                className={[
                  "category-tabs__item",
                  selectedCategory === ALL_CATEGORIES ? "is-active" : "",
                ].join(" ")}
                onClick={() => setSelectedCategory(ALL_CATEGORIES)}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === category.id}
                  className={[
                    "category-tabs__item",
                    selectedCategory === category.id ? "is-active" : "",
                  ].join(" ")}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {gridProducts.length === 0 ? (
            <EmptyState
              icon="☕"
              title="No products available"
              description={
                products.length === 0
                  ? "Add products in the Products tab to start taking orders."
                  : "No active products in this category right now."
              }
            />
          ) : (
            <div className="product-grid">
              {gridProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="product-tile"
                  onClick={() => cart.addProduct(product)}
                >
                  <div className="product-tile__thumb" aria-hidden="true">
                    {product.image ? <img src={product.image} alt="" /> : "☕"}
                  </div>
                  <div className="product-tile__name">{product.name}</div>
                  <div className="product-tile__price">
                    {formatMoney(product.price, currency)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: cart always visible alongside the product grid.
            Hidden on mobile via CSS — see styles/components.css. */}
        <div className="pos-cart-panel">
          <div className="pos-cart-panel__header">Your Order</div>
          <CartPanel cart={cart} currency={currency} />
        </div>
      </div>

      {/* Mobile: floating bar above the bottom tab bar, opens the cart as a
          bottom sheet. Hidden on desktop via CSS. */}
      {cart.itemCount > 0 && (
        <button
          type="button"
          className="pos-floating-bar"
          onClick={() => setCartSheetOpen(true)}
        >
          <span>VIEW ORDER</span>
          <span>{formatMoney(cart.total, currency)}</span>
        </button>
      )}

      {cartSheetOpen && (
        <Modal title="Your Order" onClose={() => setCartSheetOpen(false)}>
          <CartPanel cart={cart} currency={currency} />
        </Modal>
      )}
    </>
  );
}
