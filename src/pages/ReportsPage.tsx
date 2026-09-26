// PHASE 5 — Reports: date-range totals, payment breakdown, and product
// performance. Replaces the Phase 0 placeholder.
//
// Deliberately does not duplicate Phase 4's HistoryPage "Today" dashboard —
// that screen already owns the always-visible "today" view. This page's
// job is exactly what that one left out: choosing a date range (including
// a custom one) and reporting on it. Both pages share their aggregation
// logic via utils/reportStats.ts (see that file's header comment).
import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { listSales } from "../services/salesService";
import { getSettings } from "../services/settingsService";
import type { Sale } from "../types";
import { formatDateKey } from "../utils/date";
import { formatMoney } from "../utils/money";
import {
  computeProductPerformance,
  computeSalesStats,
  filterSalesByRange,
  resolveDateRange,
  topProductsByQuantity,
  topProductsByRevenue,
  type DateRangePreset,
} from "../utils/reportStats";

const TOP_PRODUCTS_LIMIT = 5;

// UI choice: a horizontal-scrolling row of pill tabs (see .range-tabs in
// components.css), not a fixed-width segmented control — documented in
// HANDOFF.md. "Custom" is one of the pills; picking it reveals two date
// inputs below rather than opening a separate picker/modal.
const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "custom", label: "Custom" },
];

type ProductSort = "quantity" | "revenue";

function formatDateLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReportsPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [currency, setCurrency] = useState("₱");
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DateRangePreset>("today");
  const today = useMemo(() => formatDateKey(new Date()), []);
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  // Revenue is the default ranking here (unlike Phase 4's quantity-only
  // "Today" dashboard) since a wider range makes "what actually made
  // money" a more useful question than it is for a single day — see
  // HANDOFF.md. The owner can switch to quantity with the toggle below.
  const [productSort, setProductSort] = useState<ProductSort>("revenue");

  useEffect(() => {
    async function load() {
      try {
        const [saleList, settings] = await Promise.all([listSales(), getSettings()]);
        setSales(saleList);
        setCurrency(settings.currency);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load sales for reports");
      }
    }
    void load();
  }, []);

  const range = useMemo(
    () =>
      resolveDateRange(
        preset,
        preset === "custom" ? { start: customStart, end: customEnd } : undefined,
      ),
    [preset, customStart, customEnd],
  );

  const rangeSales = useMemo(() => filterSalesByRange(sales ?? [], range), [sales, range]);

  const stats = useMemo(() => computeSalesStats(rangeSales), [rangeSales]);

  const productRows = useMemo(() => computeProductPerformance(rangeSales), [rangeSales]);

  const topProducts = useMemo(
    () =>
      productSort === "quantity"
        ? topProductsByQuantity(productRows, TOP_PRODUCTS_LIMIT)
        : topProductsByRevenue(productRows, TOP_PRODUCTS_LIMIT),
    [productRows, productSort],
  );

  const rangeLabel =
    range.start === range.end
      ? formatDateLabel(range.start)
      : `${formatDateLabel(range.start)} – ${formatDateLabel(range.end)}`;

  if (error) {
    return (
      <div className="banner banner--danger" role="alert">
        {error}
      </div>
    );
  }

  if (sales === null) return null;

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">Reports</h1>
        <p className="page-header__subtitle">Sales totals by day, week, or a custom range.</p>
      </div>

      <div className="range-tabs" role="tablist" aria-label="Date range">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={preset === p.id}
            className={`range-tabs__item${preset === p.id ? " is-active" : ""}`}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="custom-range-row">
          <div className="field">
            <label className="field__label" htmlFor="report-range-start">
              From
            </label>
            <input
              id="report-range-start"
              type="date"
              className="field__input"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="report-range-end">
              To
            </label>
            <input
              id="report-range-end"
              type="date"
              className="field__input"
              value={customEnd}
              min={customStart}
              max={today}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        </div>
      )}

      <p className="report-range-label">{rangeLabel}</p>

      {rangeSales.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No sales in this range"
          description="Try a different preset, or widen the custom range."
        />
      ) : (
        <div className="dashboard">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card__value">{formatMoney(stats.total, currency)}</div>
              <div className="stat-card__label">Total sales</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">{stats.transactionCount}</div>
              <div className="stat-card__label">Transactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">{stats.itemsSold}</div>
              <div className="stat-card__label">Items sold</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">{formatMoney(stats.averageSale, currency)}</div>
              <div className="stat-card__label">Average sale</div>
            </div>
          </div>

          {stats.paymentBreakdown.length > 0 && (
            <Card style={{ marginBottom: "var(--space-3)" }}>
              <div className="dashboard__section-title">Payment breakdown</div>
              <div className="breakdown-list">
                {stats.paymentBreakdown.map(([method, total]) => (
                  <div className="breakdown-row" key={method}>
                    <span>{method}</span>
                    <span>{formatMoney(total, currency)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {topProducts.length > 0 && (
            <Card>
              <div className="dashboard__section-header">
                <div className="dashboard__section-title" style={{ marginBottom: 0 }}>
                  Product performance
                </div>
                <div className="segmented" role="tablist" aria-label="Rank products by">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={productSort === "revenue"}
                    className={`segmented__item${productSort === "revenue" ? " is-active" : ""}`}
                    onClick={() => setProductSort("revenue")}
                  >
                    By revenue
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={productSort === "quantity"}
                    className={`segmented__item${productSort === "quantity" ? " is-active" : ""}`}
                    onClick={() => setProductSort("quantity")}
                  >
                    By quantity
                  </button>
                </div>
              </div>
              <div className="top-products-list">
                {topProducts.map((product, index) => (
                  <div className="top-product-row" key={product.name}>
                    <span>
                      <span className="top-product-row__rank">{index + 1}.</span>
                      {product.name}
                    </span>
                    <span>
                      {productSort === "quantity"
                        ? `${product.quantity} sold`
                        : formatMoney(product.revenue, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
