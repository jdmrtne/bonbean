import type { ReactNode } from "react";
import { CoffeeIcon } from "./Icon";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = <CoffeeIcon size={28} />, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="empty-state__title">{title}</div>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
