import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { CheckCircleIcon } from "./Icon";
import { recordSale } from "../services/salesService";
import type { UseCartResult } from "../hooks/useCart";
import type { PaymentMethod } from "../types";
import { formatMoney } from "../utils/money";

interface CheckoutModalProps {
  cart: UseCartResult;
  currency: string;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
  // Called once the sale is fully saved AND the owner has dismissed the
  // confirmation screen. The caller (PosPage) is responsible for closing
  // this modal; cart.clear() is called from here right before that, so a
  // fresh order can start immediately.
  onDone: () => void;
}

// A payment method is treated as "cash" (and gets the cash-received /
// change fields) purely by matching its name, case-insensitively — there's
// no separate "isCash" flag in the PaymentMethod type. This is a
// deliberate simplification for Phase 3: it covers the seeded "Cash"
// default correctly, but an owner who renames it (e.g. to a local term)
// would stop seeing the cash fields. See HANDOFF.md "Known Issues" — a
// dedicated flag on PaymentMethod would be the more robust fix, left for
// a later phase if this turns out to matter in practice.
function isCashMethod(method: PaymentMethod | undefined): boolean {
  return (method?.name ?? "").trim().toLowerCase() === "cash";
}

export function CheckoutModal({
  cart,
  currency,
  paymentMethods,
  onClose,
  onDone,
}: CheckoutModalProps) {
  const [selectedMethodId, setSelectedMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [cashReceived, setCashReceived] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedSale, setSavedSale] = useState<{ total: number; change?: number } | null>(null);

  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId);
  const cashRequired = isCashMethod(selectedMethod);

  const parsedCash = Number(cashReceived);
  const hasValidCash = cashReceived.trim() !== "" && Number.isFinite(parsedCash);
  const changePreview = cashRequired && hasValidCash ? parsedCash - cart.total : null;

  async function handleSave() {
    if (!selectedMethod) {
      setFormError("Choose a payment method.");
      return;
    }

    let amountReceived: number | undefined;
    let change: number | undefined;

    if (cashRequired) {
      if (!hasValidCash || parsedCash < cart.total) {
        setFormError("Cash received must be at least the total.");
        return;
      }
      amountReceived = parsedCash;
      change = parsedCash - cart.total;
    }

    setSaving(true);
    setFormError(null);
    try {
      const sale = await recordSale({
        lines: cart.lines,
        paymentMethod: selectedMethod.name,
        amountReceived,
        change,
      });
      setSavedSale({ total: sale.total, change: sale.change });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the sale");
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    cart.clear();
    onDone();
  }

  if (savedSale) {
    return (
      <Modal title="Sale saved" onClose={finish}>
        <div className="checkout-confirm">
          <div className="checkout-confirm__icon" aria-hidden="true">
            <CheckCircleIcon size={30} />
          </div>
          <div className="checkout-confirm__total">
            {formatMoney(savedSale.total, currency)}
          </div>
          {savedSale.change !== undefined && (
            <div className="checkout-confirm__change">
              Change due: {formatMoney(savedSale.change, currency)}
            </div>
          )}
          <Button size="lg" block onClick={finish}>
            New sale
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Select payment" onClose={onClose}>
      <div className="checkout-total">
        <span>Total due</span>
        <span className="checkout-total__amount">{formatMoney(cart.total, currency)}</span>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="banner banner--danger" role="alert">
          No active payment methods. Add one in the Products tab first.
        </div>
      ) : (
        <div className="field">
          <span className="field__label">Payment method</span>
          <div className="payment-method-list">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                className={[
                  "payment-method-btn",
                  method.id === selectedMethodId ? "is-active" : "",
                ].join(" ")}
                onClick={() => setSelectedMethodId(method.id)}
              >
                {method.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {cashRequired && (
        <div className="field">
          <label className="field__label" htmlFor="cash-received">
            Cash received
          </label>
          <input
            id="cash-received"
            className="field__input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
          {changePreview !== null && changePreview >= 0 && (
            <span className="field__hint">
              Change due: {formatMoney(changePreview, currency)}
            </span>
          )}
        </div>
      )}

      {formError && <div className="field__error">{formError}</div>}

      <div className="form-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Back to order
        </Button>
        <Button onClick={handleSave} disabled={saving || paymentMethods.length === 0}>
          {saving ? "Saving…" : "Save sale"}
        </Button>
      </div>
    </Modal>
  );
}
