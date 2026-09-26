// PHASE 9: a lightweight loading indicator for the initial IndexedDB
// read every page does on mount. Previously these screens rendered
// `null` while that read was in flight — invisible on a fast device,
// but a blank screen (with the nav already showing) on a slower one or
// on the very first load that has to populate the offline cache (see
// Phase 8's HANDOFF.md). Styled to match EmptyState (same layout/
// spacing/icon size) rather than inventing a new visual pattern.
interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <div className="empty-state__title">{label}</div>
    </div>
  );
}
