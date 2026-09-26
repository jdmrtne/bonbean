import { useState } from "react";
import { CategoriesManager } from "../components/CategoriesManager";
import { PaymentMethodsManager } from "../components/PaymentMethodsManager";
import { ProductsManager } from "../components/ProductsManager";

type Tab = "products" | "categories" | "payment-methods";

const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "payment-methods", label: "Payment Methods" },
];

export function ProductsPage() {
  const [tab, setTab] = useState<Tab>("products");

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">Products</h1>
        <p className="page-header__subtitle">Manage products, categories, and payment methods.</p>
      </div>

      <div className="segmented" role="tablist" aria-label="Product management sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={["segmented__item", tab === t.id ? "is-active" : ""].join(" ")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" && <ProductsManager />}
      {tab === "categories" && <CategoriesManager />}
      {tab === "payment-methods" && <PaymentMethodsManager />}
    </>
  );
}
