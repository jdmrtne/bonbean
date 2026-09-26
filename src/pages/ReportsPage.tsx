// PHASE 5 — Reports: date-range totals, payment breakdown, and product
// performance. Replaces the Phase 0 placeholder.
//
// Deliberately does not duplicate Phase 4's HistoryPage "Today" dashboard —
// that screen already owns the always-visible "today" view. This page's
// job is exactly what that one left out: choosing a date range (including
// a custom one) and reporting on it. Both pages share their aggregation
// logic via utils/reportStats.ts (see that file's header comment).
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { BarChartIcon } from "../components/Icon";
import { LoadingState } from "../components/LoadingState";
import { listSales } from "../services/salesService";
import { getSettings } from "../services/settingsService";
import type { Sale } from "../types";
import { downloadTextFile } from "../utils/download";
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
import { buildExportFilename, buildTransactionLineRows, transactionRowsToCsv } from "../utils/salesExport";

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
  const [businessName, setBusinessName] = useState("");
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
        setBusinessName(settings.businessName);
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

  // PHASE 6 — CSV export: one row per line item across the selected
  // range (see utils/salesExport.ts for why one-row-per-item rather than
  // one-row-per-sale). Built from the same rangeSales the on-screen stats
  // already use, so the export can never disagree with what's on screen.
  function handleDownloadCsv() {
    const rows = buildTransactionLineRows(rangeSales);
    const csv = transactionRowsToCsv(rows);
    downloadTextFile(buildExportFilename(range, "csv"), csv, "text/csv;charset=utf-8;");
  }

  // PHASE 6 — PDF export: no PDF-generation library was added (see
  // HANDOFF.md's Phase 6 section for why — this environment could not
  // verify a new dependency via a real npm install this session, and a
  // browser-print stylesheet needs zero dependencies and works fully
  // offline). Printing the *same* on-screen report — via the print-only
  // header below plus components.css's `@media print` rules, which hide
  // navigation/controls and show that header — means the PDF can never
  // drift from what the owner already sees. "Save as PDF" is a standard
  // destination in every modern browser's print dialog.
  function handlePrint() {
    window.print();
  }

  if (error) {
    return (
      <div className="banner banner--danger" role="alert">
        {error}
      </div>
    );
  }

  if (sales === null) return <LoadingState label="Loading reports…" />;

  return (
    <>
      <div className="page-header no-print">
        <h1 className="page-header__title">Reports</h1>
        <p className="page-header__subtitle">Sales totals by day, week, or a custom range.</p>
      </div>

      {/* Print/PDF-only: components.css's @media print rules hide the app
          nav and the controls above/below (marked .no-print) and show
          this instead, so a printed/"Saved as PDF" report reads as a
          standalone document rather than a screenshot of the app UI. */}
      <div className="print-only print-report-header">
        <div className="print-report-header__business">{businessName || "bon&bean"}</div>
        <div className="print-report-header__title">Sales report — {rangeLabel}</div>
        <div className="print-report-header__meta">Generated {new Date().toLocaleString()}</div>
      </div>

      <div className="range-tabs no-print" role="tablist" aria-label="Date range">
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
        <div className="custom-range-row no-print">
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

      <p className="report-range-label no-print">{rangeLabel}</p>

      {rangeSales.length === 0 ? (
        <EmptyState
          icon={<BarChartIcon size={28} />}
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
                  <span className="print-only-inline">
                    {" "}
                    (by {productSort === "quantity" ? "quantity" : "revenue"})
                  </span>
                </div>
                <div className="segmented no-print" role="tablist" aria-label="Rank products by">
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

          <Card className="no-print">
            <div className="dashboard__section-title">Export</div>
            <p className="export-card__hint">
              CSV has one row per item sold — for a bookkeeper or spreadsheet. The PDF/print export
              is the report summary above, formatted to hand to someone else.
            </p>
            <div className="export-actions">
              <Button variant="secondary" onClick={handleDownloadCsv}>
                Download CSV
              </Button>
              <Button variant="secondary" onClick={handlePrint}>
                Print / Save as PDF
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
