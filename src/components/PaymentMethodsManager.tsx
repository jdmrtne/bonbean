import { useEffect, useState } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";
import { Modal } from "./Modal";
import {
  addPaymentMethod,
  listPaymentMethods,
  movePaymentMethod,
  updatePaymentMethod,
} from "../services/paymentMethodsService";
import type { PaymentMethod } from "../types";

export function PaymentMethodsManager() {
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [editing, setEditing] = useState<PaymentMethod | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setMethods(await listPaymentMethods());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payment methods");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (error) {
    return (
      <div className="banner banner--danger" role="alert">
        {error}
      </div>
    );
  }

  if (methods === null) return null;

  return (
    <>
      <div className="list-toolbar">
        <Button onClick={() => setEditing("new")}>+ Add payment method</Button>
      </div>

      {methods.length === 0 ? (
        <EmptyState
          icon="💳"
          title="No payment methods yet"
          description="Add at least one payment method so sales can be recorded."
        />
      ) : (
        <Card style={{ padding: 0 }}>
          {methods.map((method, index) => (
            <div className="list-row" key={method.id}>
              <div className="list-row__main">
                <div className="list-row__title">
                  {method.name}
                  {!method.active && <span className="badge badge--inactive"> Inactive</span>}
                </div>
              </div>
              <div className="list-row__actions">
                <button
                  className="icon-btn"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => movePaymentMethod(method.id, "up").then(refresh)}
                >
                  ↑
                </button>
                <button
                  className="icon-btn"
                  aria-label="Move down"
                  disabled={index === methods.length - 1}
                  onClick={() => movePaymentMethod(method.id, "down").then(refresh)}
                >
                  ↓
                </button>
                <button
                  className="icon-btn"
                  aria-label="Edit payment method"
                  onClick={() => setEditing(method)}
                >
                  ✎
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing && (
        <PaymentMethodFormModal
          method={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
    </>
  );
}

function PaymentMethodFormModal({
  method,
  onClose,
  onSaved,
}: {
  method: PaymentMethod | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(method?.name ?? "");
  const [active, setActive] = useState(method?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setFormError("Payment method name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (method) {
        await updatePaymentMethod(method.id, { name: name.trim(), active });
      } else {
        await addPaymentMethod({ name: name.trim() });
      }
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save payment method");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={method ? "Edit payment method" : "Add payment method"} onClose={onClose}>
      <div className="field">
        <label className="field__label" htmlFor="method-name">
          Name
        </label>
        <input
          id="method-name"
          className="field__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. GCash"
          autoFocus
        />
      </div>

      {method && (
        <div className="field">
          <div className="toggle-row">
            <span className="field__label">Available at checkout</span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
          </div>
          <span className="field__hint">
            Turning this off hides it from the payment screen without deleting past sales
            that used it.
          </span>
        </div>
      )}

      {formError && <div className="field__error">{formError}</div>}

      <div className="form-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}
