import type { SVGProps } from "react";

// A small, self-contained icon set (no external icon library dependency).
// Every icon shares the same 24x24 stroke grid so they can be swapped in
// wherever the app used to render an emoji character as an "icon".
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function CoffeeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 9h13a1 1 0 0 1 1 1v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
      <path d="M18 10h1.5a2.5 2.5 0 0 1 0 5H18" />
      <path d="M7.5 4c-.8.8-.8 1.6 0 2.4M11.5 4c-.8.8-.8 1.6 0 2.4" />
    </svg>
  );
}

export function ReceiptIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.5V3Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

export function BarChartIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function FolderIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v8.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-11Z" />
    </svg>
  );
}

export function CardIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 14.5h4" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function ArrowDownIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 5v14M18 13l-6 6-6-6" />
    </svg>
  );
}

export function PencilIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 20l.9-4L16.5 4.4a1.5 1.5 0 0 1 2.1 0l1 1a1.5 1.5 0 0 1 0 2.1L8 19l-4 1Z" />
      <path d="M14 6.5 17.5 10" />
    </svg>
  );
}

export function CloseIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function WifiOffIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M2 2l20 20" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M5 13a10 10 0 0 1 3.5-2.5M19 13a10 10 0 0 0-4.7-2.7" />
      <path d="M2 8.5A15.9 15.9 0 0 1 8 5.3M22 8.5a15.9 15.9 0 0 0-3-1.9" />
      <path d="M12 19.5h.01" />
    </svg>
  );
}

export function CartIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <path d="M3 4h2.2l1.9 10.5a2 2 0 0 0 2 1.7h8a2 2 0 0 0 2-1.6L20.8 8H6.4" />
    </svg>
  );
}

export function TrashIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.4 2.4L16 9.8" />
    </svg>
  );
}

export function PauseIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function PlayIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M7 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  );
}
