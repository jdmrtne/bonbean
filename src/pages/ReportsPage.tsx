import { EmptyState } from "../components/EmptyState";

export function ReportsPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">Reports</h1>
        <p className="page-header__subtitle">Sales totals by day, week, or a custom range.</p>
      </div>
      <EmptyState
        icon="📊"
        title="Reports coming in Phase 5"
        description="This screen will show totals, payment breakdown, and product performance for a selected date range."
      />
    </>
  );
}
