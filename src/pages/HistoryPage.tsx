import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { SaleDetailModal } from "../components/SaleDetailModal";
import { formatDateKey, listSales } from "../services/salesService";
import { getSettings } from "../services/settingsService";
import type { Sale } from "../types";
import { formatMoney } from "../utils/money";
import {
  computeProductPerformance,
  computeSalesStats,
  topProductsByQuantity,
} from "../utils/reportStats";

const TOP_PRODUCTS_LIMIT = 5;

export function HistoryPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [currency, setCurrency] = useState("₱");
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [saleList, settings] = await Promise.all([listSales(), getSettings()]);
      setSales(saleList);
      setCurrency(settings.currency);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sales history");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  // Scoped to "today" only for this phase — a custom date range is
  // Phase 5 Reports' job, not this dashboard's. See NEXT_PHASE_PROMPT.md.
  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  const todaysSales = useMemo(
    () => (sales ?? []).filter((s) => s.date === todayKey),
    [sales, todayKey],
  );

  // PHASE 5: this used to duplicate its own total/count/average/breakdown
  // computation inline. That logic (and the "top products" ranking) is now
  // shared with ReportsPage.tsx via utils/reportStats.ts, so both screens
  // compute stats for a set of sales the same way — this just narrows the
  // input to today's sales, same as before.
  //
  // Ranked by quantity sold (not revenue) — a simple "what's moving today"
  // view that matches how a coffee cart owner thinks about stock. Reports
  // (Phase 5) offers both quantity and revenue ranking, since a wider date
  // range makes revenue comparison more useful than it is for a single day.
  const dashboard = useMemo(() => {
    const stats = computeSalesStats(todaysSales);
    const topProducts = topProductsByQuantity(
      computeProductPerformance(todaysSales),
      TOP_PRODUCTS_LIMIT,
    );
    return { ...stats, topProducts };
  }, [todaysSales]);

  // Search matches product names within a sale's line items — the
  // simplest useful filter ("did I sell any croissants today"). Full
  // date-range filtering is Phase 5 Reports' job; this list is already
  // sorted most-recent-first so scrolling covers the rest for now.
  const filteredSales = useMemo(() => {
    const all = sales ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return all;
    return all.filter((sale) =>
      sale.items.some((item) => item.productNameSnapshot.toLowerCase().includes(query)),
    );
  }, [sales, search]);

  if (error) {
    return (
      <div className="banner banner--danger" role="alert">
        {error}
      </div>
    );
  }

  if (sales === null) return <LoadingState label="Loading sales history…" />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">Sales History</h1>
        <p className="page-header__subtitle">Every recorded sale, most recent first.</p>
      </div>

      <div className="dashboard">
        <div className="dashboard__section-title">Today</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card__value">{formatMoney(dashboard.total, currency)}</div>
            <div className="stat-card__label">Today's sales</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{dashboard.transactionCount}</div>
            <div className="stat-card__label">Transactions</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{dashboard.itemsSold}</div>
            <div className="stat-card__label">Items sold</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{formatMoney(dashboard.averageSale, currency)}</div>
            <div className="stat-card__label">Average sale</div>
          </div>
        </div>

        {dashboard.paymentBreakdown.length > 0 && (
          <Card style={{ marginBottom: "var(--space-3)" }}>
            <div className="dashboard__section-title">Payment breakdown</div>
            <div className="breakdown-list">
              {dashboard.paymentBreakdown.map(([method, total]) => (
                <div className="breakdown-row" key={method}>
                  <span>{method}</span>
                  <span>{formatMoney(total, currency)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {dashboard.topProducts.length > 0 && (
          <Card>
            <div className="dashboard__section-title">Top products today</div>
            <div className="top-products-list">
              {dashboard.topProducts.map((product, index) => (
                <div className="top-product-row" key={product.name}>
                  <span>
                    <span className="top-product-row__rank">{index + 1}.</span>
                    {product.name}
                  </span>
                  <span>{product.quantity} sold</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="search-bar">
        <input
          className="field__input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name…"
          aria-label="Search sales by product name"
        />
      </div>

      {filteredSales.length === 0 ? (
        <EmptyState
          icon="🧾"
          title={sales.length === 0 ? "No sales recorded yet" : "No sales match your search"}
          description={
            sales.length === 0
              ? "Sales you record on the POS screen will show up here."
              : "Try a different product name, or clear the search."
          }
        />
      ) : (
        <Card style={{ padding: 0 }}>
          {filteredSales.map((sale) => (
            <button
              type="button"
              className="list-row"
              key={sale.id}
              onClick={() => setSelectedSale(sale)}
            >
              <div className="list-row__main">
                <div className="list-row__title">{formatSaleDate(sale)}</div>
                <div className="list-row__subtitle">
                  {sale.paymentMethod} · {sale.items.length}{" "}
                  {sale.items.length === 1 ? "item" : "items"}
                </div>
              </div>
              <div className="list-row__amount">{formatMoney(sale.total, currency)}</div>
            </button>
          ))}
        </Card>
      )}

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          currency={currency}
          onClose={() => setSelectedSale(null)}
          onDeleted={() => {
            setSelectedSale(null);
            void refresh();
          }}
          onNotesSaved={(updated) => {
            setSelectedSale(updated);
            setSales((prev) => (prev ?? []).map((s) => (s.id === updated.id ? updated : s)));
          }}
        />
      )}
    </>
  );
}

// Uses the sale's full createdAt timestamp (not the separate date/time
// index keys) since it's the accurate source and needs no reassembly.
function formatSaleDate(sale: Sale): string {
  const d = new Date(sale.createdAt);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
