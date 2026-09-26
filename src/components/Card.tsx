import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div className={["card", className ?? ""].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
