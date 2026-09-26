import { useEffect, useMemo, useState } from "react";
import { CartPanel } from "../components/CartPanel";
import { CheckoutModal } from "../components/CheckoutModal";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { Modal } from "../components/Modal";
import { CoffeeIcon } from "../components/Icon";
import { listCategories } from "../services/categoriesService";
import { listPaymentMethods } from "../services/paymentMethodsService";
import { listProducts } from "../services/productsService";
import { getSettings } from "../services/settingsService";
import { useCart } from "../hooks/useCart";
import type { Category, PaymentMethod, Product } from "../types";
import { formatMoney } from "../utils/money";

const ALL_CATEGORIES = "all";

export function PosPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currency, setCurrency] = useState("₱");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cart = useCart();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [categoryList, productList, methodList, settings] = await Promise.all([
          listCategories(false),
          listProducts(false),
          listPaymentMethods(false),
          getSettings(),
        ]);
        if (cancelled) return;
        setCategories(categoryList);
        setProducts(productList);
        setPaymentMethods(methodList);
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

  // Opening checkout always closes the mobile cart sheet first, so the two
  // modals never stack. On desktop the cart sheet is never open anyway
  // (there's no trigger for it above 860px), so this is a no-op there.
  function openCheckout() {
    setCartSheetOpen(false);
    setCheckoutOpen(true);
  }

  if (error) {
    return (
      <div className="banner banner--danger" role="alert">
        {error}
      </div>
    );
  }

  if (categories === null || products === null) return <LoadingState label="Loading products…" />;

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
              icon={<CoffeeIcon size={28} />}
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
                    {product.image ? <img src={product.image} alt="" /> : <CoffeeIcon size={20} />}
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
          <CartPanel cart={cart} currency={currency} onCheckout={openCheckout} />
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
          <CartPanel cart={cart} currency={currency} onCheckout={openCheckout} />
        </Modal>
      )}

      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          currency={currency}
          paymentMethods={paymentMethods}
          onClose={() => setCheckoutOpen(false)}
          onDone={() => setCheckoutOpen(false)}
        />
      )}
    </>
  );
}
