import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { deleteSale, updateSaleNotes } from "../services/salesService";
import type { Sale } from "../types";
import { formatMoney } from "../utils/money";

interface SaleDetailModalProps {
  sale: Sale;
  currency: string;
  onClose: () => void;
  // Called after a successful delete, so the caller (HistoryPage) can
  // refresh its list and close this modal — deleting always closes it,
  // there's nothing left to show.
  onDeleted: () => void;
  // Called after a successful notes save, with the updated sale, so the
  // caller's list stays in sync without a full reload.
  onNotesSaved: (updated: Sale) => void;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SaleDetailModal({
  sale,
  currency,
  onClose,
  onDeleted,
  onNotesSaved,
}: SaleDetailModalProps) {
  const [notes, setNotes] = useState(sale.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notesChanged = notes.trim() !== (sale.notes ?? "");

  async function handleSaveNotes() {
    setSavingNotes(true);
    setError(null);
    try {
      await updateSaleNotes(sale.id, notes);
      onNotesSaved({ ...sale, notes: notes.trim() || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the note");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this sale? This removes it permanently and cannot be undone.",
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteSale(sale.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the sale");
      setDeleting(false);
    }
  }

  return (
    <Modal title={`Order ${sale.orderNumber}`} onClose={onClose}>
      <div className="sale-detail__meta">
        <span>{formatTimestamp(sale.createdAt)}</span>
        <span className="badge badge--payment">{sale.paymentMethod}</span>
      </div>

      <div className="cart-panel__lines">
        {sale.items.map((item) => (
          <div className="cart-line" key={item.id}>
            <div className="cart-line__main">
              <div className="cart-line__name">{item.productNameSnapshot}</div>
              <div className="cart-line__unit">
                {item.quantity} × {formatMoney(item.unitPriceSnapshot, currency)}
              </div>
            </div>
            <div className="cart-line__total">{formatMoney(item.lineTotal, currency)}</div>
          </div>
        ))}
      </div>

      <div className="cart-panel__summary">
        <span>Total</span>
        <span className="cart-panel__total-amount">{formatMoney(sale.total, currency)}</span>
      </div>

      {sale.amountReceived !== undefined && (
        <div className="sale-detail__cash-row">
          <span>Cash received</span>
          <span>{formatMoney(sale.amountReceived, currency)}</span>
        </div>
      )}
      {sale.change !== undefined && (
        <div className="sale-detail__cash-row">
          <span>Change given</span>
          <span>{formatMoney(sale.change, currency)}</span>
        </div>
      )}

      <div className="field">
        <label className="field__label" htmlFor="sale-notes">
          Notes
        </label>
        <textarea
          id="sale-notes"
          className="field__input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional note about this sale…"
        />
        {notesChanged && (
          <Button
            variant="secondary"
            size="md"
            onClick={handleSaveNotes}
            disabled={savingNotes}
            style={{ marginTop: "var(--space-2)" }}
          >
            {savingNotes ? "Saving…" : "Save note"}
          </Button>
        )}
      </div>

      {error && <div className="field__error">{error}</div>}

      <div className="form-actions">
        <Button variant="secondary" onClick={onClose} disabled={deleting}>
          Close
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete sale"}
        </Button>
      </div>
    </Modal>
  );
}
