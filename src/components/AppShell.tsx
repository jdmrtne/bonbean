import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { StatusBanners } from "./StatusBanners";
import { HeaderActionsProvider } from "../context/HeaderActionsContext";
import { BarChartIcon, CoffeeIcon, FolderIcon, ReceiptIcon } from "./Icon";
import logoFull from "../assets/logo-full.png";
import logoMark from "../assets/logo-mark.png";

const NAV_ITEMS = [
  { to: "/", label: "POS", icon: CoffeeIcon, end: true },
  { to: "/history", label: "History", icon: ReceiptIcon },
  { to: "/reports", label: "Reports", icon: BarChartIcon },
  { to: "/products", label: "Products", icon: FolderIcon },
];

export function AppShell() {
  // Target for HeaderActionsProvider below — a page-specific action
  // (currently just the Close Register button) portals into this node,
  // which sits in the header's top-right corner (see .app-topbar's
  // space-between in layout.css). `useState` rather than `useRef` so
  // that setting it re-renders and the Provider picks up the real node
  // instead of null on first paint.
  const [headerActionsNode, setHeaderActionsNode] = useState<HTMLDivElement | null>(null);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <img className="app-sidebar__logo" src={logoFull} alt="bon&bean — stovetop espresso" />
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              ["app-sidebar__link", isActive ? "is-active" : ""].filter(Boolean).join(" ")
            }
          >
            <item.icon size={19} aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </aside>

      <header className="app-topbar">
        <div className="app-topbar__brand">
          {/* Compact brand mark, mobile only (see layout.css) — the
              sidebar's own brand mark (.app-sidebar__brand) already
              covers desktop, and the sidebar is hidden on mobile (Phase
              8 bug fix), so this was the only way to show identity on a
              phone screen. Reuses the same mark/title classes as the
              sidebar brand rather than inventing new ones. */}
          <div className="app-topbar__brand-mobile">
            <img className="app-topbar__mark" src={logoMark} alt="bon&bean" />
            <span className="app-topbar__title">bon&amp;bean</span>
          </div>
          <span className="app-topbar__page">Stovetop espresso, sold simply</span>
        </div>
        <div className="app-topbar__actions" ref={setHeaderActionsNode} />
      </header>

      <main className="app-main">
        <StatusBanners />
        <div className="app-main__inner">
          <HeaderActionsProvider node={headerActionsNode}>
            <Outlet />
          </HeaderActionsProvider>
        </div>
      </main>

      <nav className="app-tabbar" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              ["app-tabbar__item", isActive ? "is-active" : ""].filter(Boolean).join(" ")
            }
          >
            <span className="app-tabbar__icon" aria-hidden="true">
              <item.icon size={20} />
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
