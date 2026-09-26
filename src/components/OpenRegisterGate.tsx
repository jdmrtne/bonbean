// PHASE 12 — shown in place of the POS grid/cart whenever there is no
// open register session (see PosPage.tsx). Blocks sales entirely until
// the cashier enters an Opening Cash Fund — the cash placed in the
// drawer to make change, not a sale or a starting balance.
import { useState } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { CoffeeIcon } from "./Icon";
import { openRegister } from "../services/registerService";
import type { RegisterSession } from "../types";
import { formatMoney } from "../utils/money";

interface OpenRegisterGateProps {
  currency: string;
  onOpened: (session: RegisterSession) => void;
}

export function OpenRegisterGate({ currency, onOpened }: OpenRegisterGateProps) {
  const [fund, setFund] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedFund = Number(fund);
  const hasValidFund = fund.trim() !== "" && Number.isFinite(parsedFund) && parsedFund >= 0;

  async function handleOpen() {
    if (!hasValidFund) {
      setError("Enter a valid opening cash fund.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const session = await openRegister(parsedFund);
      onOpened(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the register.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        <CoffeeIcon size={28} />
      </div>
      <div className="empty-state__title">Open the register to start selling</div>
      <p>Enter the Opening Cash Fund — the cash placed in the drawer for giving change.</p>
      <Card className="open-register-card">
        <div className="field">
          <label className="field__label" htmlFor="opening-fund">
            Opening Cash Fund
          </label>
          <input
            id="opening-fund"
            className="field__input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={fund}
            onChange={(e) => setFund(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </div>
        {error && <div className="field__error">{error}</div>}
        <Button size="lg" block onClick={handleOpen} disabled={saving}>
          {saving
            ? "Opening…"
            : hasValidFund
              ? `Open Register — ${formatMoney(parsedFund, currency)}`
              : "Open Register"}
        </Button>
      </Card>
    </div>
  );
}
