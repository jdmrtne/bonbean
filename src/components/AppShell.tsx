import { NavLink, Outlet } from "react-router-dom";
import { StatusBanners } from "./StatusBanners";

const NAV_ITEMS = [
  { to: "/", label: "POS", icon: "☕", end: true },
  { to: "/history", label: "History", icon: "🧾" },
  { to: "/reports", label: "Reports", icon: "📊" },
  { to: "/products", label: "Products", icon: "🗂️" },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <div className="app-topbar__mark" aria-hidden="true">
            ☕
          </div>
          <span className="app-topbar__title">Coffee Cart</span>
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
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </aside>

      <header className="app-topbar">
        <div className="app-topbar__brand">
          <span className="app-topbar__page">Sales recording, made simple</span>
        </div>
      </header>

      <main className="app-main">
        <StatusBanners />
        <div className="app-main__inner">
          <Outlet />
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
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
