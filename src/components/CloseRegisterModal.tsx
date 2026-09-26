// PHASE 12 — Close Register: shows the current shift's payment summary,
// takes the Physical Cash Counted figure, and computes Cash Sales / Total
// Sales per the brief's exact rule (Opening Cash Fund only ever backs the
// physical count out into Cash Sales — never subtracted from Total
// Sales, never labeled as a sale/expense/deduction).
import { useEffect, useMemo, useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { CheckCircleIcon } from "./Icon";
import { closeRegister } from "../services/registerService";
import { listSales } from "../services/salesService";
import type { PaymentMethod, RegisterSession, Sale } from "../types";
import { downloadExcelWorkbook } from "../utils/download";
import { formatMoney } from "../utils/money";
import {
  computeRegisterClosingSummary,
  filterSalesBySession,
  type RegisterClosingSummary,
} from "../utils/registerStats";
import { computeSalesStats } from "../utils/reportStats";

interface CloseRegisterModalProps {
  session: RegisterSession;
  currency: string;
  // PHASE 13: shows on the Excel closing report's header, same as
  // ReportsPage.tsx's print header. Optional/defaults to "" so this
  // component still type-checks anywhere it isn't threaded through yet.
  businessName?: string;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
  // Called once the register is fully closed AND the cashier has
  // dismissed the confirmation screen — mirrors CheckoutModal's onDone.
  onClosed: () => void;
}

export function CloseRegisterModal({
  session,
  currency,
  businessName = "",
  paymentMethods,
  onClose,
  onClosed,
}: CloseRegisterModalProps) {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [physicalCash, setPhysicalCash] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [closedSummary, setClosedSummary] = useState<RegisterClosingSummary | null>(null);
  const [closedSession, setClosedSession] = useState<RegisterSession | null>(null);
  // The shift's sales at the moment of closing — kept alongside
  // closedSummary/closedSession so "Download closing report" can rebuild
  // the exact same Excel workbook later without depending on `sales`
  // (which keeps loading/updating in the background) or `shiftSales`
  // (memoized off the *current* session, not the one just closed).
  const [closedShiftSales, setClosedShiftSales] = useState<Sale[]>([]);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSales()
      .then((all) => {
        if (!cancelled) setSales(all);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load this shift's sales.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shiftSales = useMemo(
    () => (sales ? filterSalesBySession(sales, session) : []),
    [sales, session],
  );

  const shiftStats = useMemo(() => computeSalesStats(shiftSales), [shiftSales]);

  const parsedCash = Number(physicalCash);
  const hasValidCash = physicalCash.trim() !== "" && Number.isFinite(parsedCash) && parsedCash >= 0;

  const preview = useMemo(
    () =>
      hasValidCash
        ? computeRegisterClosingSummary(shiftSales, paymentMethods, session.openingFund, parsedCash)
        : null,
    [hasValidCash, shiftSales, paymentMethods, session.openingFund, parsedCash],
  );

  async function downloadReport(
    forSession: RegisterSession,
    forSummary: RegisterClosingSummary,
    forShiftSales: Sale[],
  ) {
    setDownloadError(null);
    try {
      // Dynamically imported so ExcelJS (only needed at register-close
      // time, and fairly heavy) never lands in the app's main bundle —
      // see registerReportExcel.ts's header comment.
      const { buildRegisterReportFilename, buildRegisterReportWorkbook } = await import(
        "../utils/registerReportExcel"
      );
      const workbook = await buildRegisterReportWorkbook({
        session: forSession,
        summary: forSummary,
        shiftSales: forShiftSales,
        businessName,
        currency,
      });
      await downloadExcelWorkbook(buildRegisterReportFilename(forSession), workbook);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Could not generate the closing report file.",
      );
    }
  }

  async function handleClose() {
    if (!hasValidCash) {
      setFormError("Enter the physical cash counted in the drawer.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const updated = await closeRegister(session.id, parsedCash);
      const summary = computeRegisterClosingSummary(
        shiftSales,
        paymentMethods,
        session.openingFund,
        parsedCash,
      );
      await downloadReport(updated, summary, shiftSales);
      setClosedSession(updated);
      setClosedSummary(summary);
      setClosedShiftSales(shiftSales);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not close the register.");
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadAgain() {
    if (!closedSession || !closedSummary) return;
    void downloadReport(closedSession, closedSummary, closedShiftSales);
  }

  if (closedSummary) {
    return (
      <Modal title="Register closed" onClose={onClosed}>
        <div className="checkout-confirm">
          <div className="checkout-confirm__icon" aria-hidden="true">
            <CheckCircleIcon size={30} />
          </div>
          <div className="checkout-confirm__total">
            {formatMoney(closedSummary.totalSales, currency)}
          </div>
          <div className="checkout-confirm__change">Total Sales this shift</div>

          <div className="register-summary-card">
            <div className="register-summary-row">
              <span>Opening Cash Fund</span>
              <span>{formatMoney(closedSummary.openingFund, currency)}</span>
            </div>
            <div className="register-summary-row">
              <span>Physical Cash Counted</span>
              <span>{formatMoney(closedSummary.physicalCashCounted, currency)}</span>
            </div>
            <div className="register-summary-row register-summary-row--highlight">
              <span>Cash Sales</span>
              <span>{formatMoney(closedSummary.cashSales, currency)}</span>
            </div>
            {closedSummary.nonCashBreakdown.map(([name, total]) => (
              <div className="register-summary-row" key={name}>
                <span>{name} Sales</span>
                <span>{formatMoney(total, currency)}</span>
              </div>
            ))}
            <div className="register-summary-row register-summary-row--total">
              <span>Total Sales</span>
              <span>{formatMoney(closedSummary.totalSales, currency)}</span>
            </div>
          </div>

          {downloadError && (
            <div className="banner banner--danger" role="alert">
              {downloadError}
            </div>
          )}
          <Button variant="secondary" block onClick={handleDownloadAgain}>
            Download closing report
          </Button>
          <Button size="lg" block onClick={onClosed}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Close Register" onClose={onClose}>
      {loadError && (
        <div className="banner banner--danger" role="alert">
          {loadError}
        </div>
      )}

      {sales === null && !loadError ? (
        <p>Loading this shift's sales…</p>
      ) : (
        <>
          <div className="field__label">This shift's payment summary</div>
          {shiftStats.paymentBreakdown.length === 0 ? (
            <p className="field__hint">No sales recorded yet this shift.</p>
          ) : (
            <div className="breakdown-list register-shift-summary">
              {shiftStats.paymentBreakdown.map(([method, total]) => (
                <div className="breakdown-row" key={method}>
                  <span>{method}</span>
                  <span>{formatMoney(total, currency)}</span>
                </div>
              ))}
              <div className="breakdown-row">
                <span>Total transactions</span>
                <span>{shiftStats.transactionCount}</span>
              </div>
            </div>
          )}

          <div className="register-summary-card">
            <div className="register-summary-row">
              <span>Opening Cash Fund</span>
              <span>{formatMoney(session.openingFund, currency)}</span>
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="physical-cash">
              Physical Cash Counted
            </label>
            <input
              id="physical-cash"
              className="field__input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={physicalCash}
              onChange={(e) => setPhysicalCash(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            <span className="field__hint">
              Count all cash currently in the drawer, including the opening fund.
            </span>
          </div>

          {preview && (
            <div className="register-summary-card">
              <div className="register-summary-row register-summary-row--highlight">
                <span>Cash Sales</span>
                <span>{formatMoney(preview.cashSales, currency)}</span>
              </div>
              {preview.nonCashBreakdown.map(([name, total]) => (
                <div className="register-summary-row" key={name}>
                  <span>{name} Sales</span>
                  <span>{formatMoney(total, currency)}</span>
                </div>
              ))}
              <div className="register-summary-row register-summary-row--total">
                <span>Total Sales</span>
                <span>{formatMoney(preview.totalSales, currency)}</span>
              </div>
              {Math.abs(preview.cashVariance) > 0.004 && (
                <div className="register-variance-note">
                  {preview.cashVariance > 0
                    ? `${formatMoney(preview.cashVariance, currency)} over the recorded cash sales.`
                    : `${formatMoney(Math.abs(preview.cashVariance), currency)} short of the recorded cash sales.`}
                </div>
              )}
            </div>
          )}

          {formError && <div className="field__error">{formError}</div>}

          <div className="form-actions">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Back
            </Button>
            <Button onClick={handleClose} disabled={saving || sales === null}>
              {saving ? "Closing…" : "Close Register"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
