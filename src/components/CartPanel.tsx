import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { CartIcon, TrashIcon } from "./Icon";
import type { UseCartResult } from "../hooks/useCart";
import { formatMoney } from "../utils/money";

interface CartPanelProps {
  cart: UseCartResult;
  currency: string;
  onCheckout: () => void;
}

// Shared between the always-visible desktop cart column and the mobile
// bottom-sheet (opened from the floating "VIEW ORDER" bar) — see
// PosPage.tsx and HANDOFF.md "Decisions Already Made" for why the same
// component is reused in both places instead of two implementations.
export function CartPanel({ cart, currency, onCheckout }: CartPanelProps) {
  const { lines, total, increase, decrease, removeLine, clear } = cart;

  // PHASE 10: confirm before clearing a non-empty cart — this button only
  // ever renders once `lines.length > 0` (see the empty-cart early return
  // right below), so the length check here is just a defensive guard,
  // not the thing that actually prevents an accidental silent clear.
  function handleClear() {
    if (lines.length === 0) {
      clear();
      return;
    }
    const confirmed = window.confirm(
      "Clear current order?\n\nAll items currently in the cart will be removed.",
    );
    if (confirmed) clear();
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<CartIcon size={28} />}
        title="Cart is empty"
        description="Tap a product to add it to the order."
      />
    );
  }

  return (
    <div className="cart-panel">
      <div className="cart-panel__lines">
        {lines.map((line) => (
          <div className="cart-line" key={line.productId}>
            <div className="cart-line__main">
              <div className="cart-line__name">{line.name}</div>
              <div className="cart-line__unit">
                {formatMoney(line.unitPrice, currency)} each
              </div>
            </div>

            <div className="qty-stepper">
              <button
                type="button"
                className="qty-stepper__btn"
                aria-label={
                  line.quantity === 1
                    ? `Remove ${line.name} from cart`
                    : `Decrease quantity of ${line.name}`
                }
                onClick={() => decrease(line.productId)}
              >
                −
              </button>
              <span className="qty-stepper__value">{line.quantity}</span>
              <button
                type="button"
                className="qty-stepper__btn"
                aria-label={`Increase quantity of ${line.name}`}
                onClick={() => increase(line.productId)}
              >
                +
              </button>
            </div>

            <div className="cart-line__total">
              {formatMoney(line.unitPrice * line.quantity, currency)}
            </div>

            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${line.name} from cart`}
              onClick={() => removeLine(line.productId)}
            >
              <TrashIcon size={17} />
            </button>
          </div>
        ))}
      </div>

      <div className="cart-panel__summary">
        <span>Total</span>
        <span className="cart-panel__total-amount">{formatMoney(total, currency)}</span>
      </div>

      <div className="cart-panel__actions">
        <Button variant="secondary" onClick={handleClear}>
          Clear cart
        </Button>
        <Button variant="primary" size="lg" block onClick={onCheckout}>
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}
