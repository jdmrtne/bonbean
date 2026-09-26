import { EmptyState } from "../components/EmptyState";

export function ProductsPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">Products</h1>
        <p className="page-header__subtitle">Manage products, categories, and payment methods.</p>
      </div>
      <EmptyState
        icon="🗂️"
        title="Product management coming in Phase 1"
        description="This screen will let the owner add, edit, deactivate, and price products and categories."
      />
    </>
  );
}
