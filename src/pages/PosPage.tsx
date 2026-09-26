import { EmptyState } from "../components/EmptyState";

export function PosPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">POS</h1>
        <p className="page-header__subtitle">Tap products to start an order.</p>
      </div>
      <EmptyState
        icon="☕"
        title="Product grid coming in Phase 2"
        description="This screen will show category tabs, a touch-friendly product grid, and a cart with a running total."
      />
    </>
  );
}
