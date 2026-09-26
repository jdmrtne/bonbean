import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../components/Button";
import { CartPanel } from "../components/CartPanel";
import { CheckoutModal } from "../components/CheckoutModal";
import { CloseRegisterModal } from "../components/CloseRegisterModal";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { Modal } from "../components/Modal";
import { OpenRegisterGate } from "../components/OpenRegisterGate";
import { CoffeeIcon } from "../components/Icon";
import { useHeaderActionsNode } from "../context/HeaderActionsContext";
import { listCategories } from "../services/categoriesService";
import { clearCartDraft, getCartDraft, saveCartDraft } from "../services/cartDraftService";
import { listPaymentMethods } from "../services/paymentMethodsService";
import { listProducts } from "../services/productsService";
import { getOpenSession } from "../services/registerService";
import { getSettings } from "../services/settingsService";
import { useCart } from "../hooks/useCart";
import type { Category, PaymentMethod, Product, RegisterSession } from "../types";
import { formatMoney } from "../utils/money";

const ALL_CATEGORIES = "all";

export function PosPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currency, setCurrency] = useState("₱");
  // PHASE 13: only needed for the Close Register Excel report's header
  // (see CloseRegisterModal.tsx / utils/registerReportExcel.ts) — nothing
  // else on this page reads it.
  const [businessName, setBusinessName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // PHASE 12: undefined while the initial load below is in flight, null
  // once loaded if no register session is currently open, otherwise the
  // open session. Sales cannot be made (see the render branch below)
  // until this is a RegisterSession.
  const [registerSession, setRegisterSession] = useState<RegisterSession | null | undefined>(
    undefined,
  );
  const [closeRegisterOpen, setCloseRegisterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards the cart-persistence effect below so it never fires (and
  // overwrites the persisted draft with an empty cart) before the draft
  // below has actually had a chance to load — see that effect's comment.
  const [cartHydrated, setCartHydrated] = useState(false);

  const cart = useCart();
  const headerActionsNode = useHeaderActionsNode();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [categoryList, productList, methodList, settings, openSession] = await Promise.all([
          listCategories(false),
          listProducts(false),
          listPaymentMethods(false),
          getSettings(),
          getOpenSession(),
        ]);
        if (cancelled) return;
        setCategories(categoryList);
        setProducts(productList);
        setPaymentMethods(methodList);
        setCurrency(settings.currency);
        setBusinessName(settings.businessName);
        setRegisterSession(openSession);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load the product catalog");
        }
        return;
      }

      // Restore an unfinished cart left over from before a refresh, an
      // accidental tab close, or the app simply being reopened later.
      // Deliberately kept out of the Promise.all/try above and given its
      // own try/catch: a problem reading the draft should never block
      // the product catalog from loading — worst case the cart just
      // starts empty, same as any first-ever visit.
      try {
        const draftLines = await getCartDraft();
        if (!cancelled && draftLines.length > 0) {
          cart.restore(draftLines);
        }
      } catch {
        // Non-fatal — start with an empty cart.
      } finally {
        if (!cancelled) setCartHydrated(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirrors the live cart to IndexedDB on every change, so it survives a
  // refresh/reopen. Gated on cartHydrated so this can never fire with an
  // empty initial cart before the effect above has had a chance to
  // restore a previously-persisted draft (which would otherwise wipe it
  // out on every fresh page load, including one that just restored it).
  // A cleared cart (checkout success, or an explicit "Clear cart") is
  // exactly the empty-lines case here, so it's handled the same way —
  // completed sales/history are untouched, this only ever writes to the
  // separate `cartDraft` store.
  useEffect(() => {
    if (!cartHydrated) return;
    if (cart.lines.length === 0) {
      void clearCartDraft();
    } else {
      void saveCartDraft(cart.lines);
    }
  }, [cart.lines, cartHydrated]);

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

  if (categories === null || products === null || registerSession === undefined) {
    return <LoadingState label="Loading products…" />;
  }

  // PHASE 12: no sale can be made until a register session is open — the
  // product grid and cart never render in this state, only the Opening
  // Cash Fund prompt.
  if (registerSession === null) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-header__title">POS</h1>
          <p className="page-header__subtitle">Open the register to start taking orders.</p>
        </div>
        <OpenRegisterGate currency={currency} onOpened={setRegisterSession} />
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">POS</h1>
        <p className="page-header__subtitle">Tap products to start an order.</p>
      </div>

      <div className="register-bar">
        <span className="register-bar__status">
          Register open · Opening fund {formatMoney(registerSession.openingFund, currency)}
        </span>
      </div>

      {/* Close Register lives here so it stays with the state it needs
          (registerSession, closeRegisterOpen), but it's visually rendered
          in the shared header's top-right corner via a portal — see
          HeaderActionsContext.tsx. */}
      {headerActionsNode &&
        createPortal(
          <Button variant="secondary" onClick={() => setCloseRegisterOpen(true)}>
            Close Register
          </Button>,
          headerActionsNode,
        )}

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

      {closeRegisterOpen && (
        <CloseRegisterModal
          session={registerSession}
          currency={currency}
          businessName={businessName}
          paymentMethods={paymentMethods}
          onClose={() => setCloseRegisterOpen(false)}
          onClosed={() => {
            setCloseRegisterOpen(false);
            // Back to the Open Register gate — the next sale needs a
            // fresh Opening Cash Fund for the new shift.
            setRegisterSession(null);
          }}
        />
      )}
    </>
  );
}
