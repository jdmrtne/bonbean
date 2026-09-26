import { EmptyState } from "../components/EmptyState";

export function HistoryPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">Sales History</h1>
        <p className="page-header__subtitle">Every recorded sale, most recent first.</p>
      </div>
      <EmptyState
        icon="🧾"
        title="Sales list coming in Phase 4"
        description="This screen will list saved sales with date, time, total, and payment method, plus view / edit / delete."
      />
    </>
  );
}
