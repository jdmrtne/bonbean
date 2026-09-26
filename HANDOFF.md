# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 2 — COMPLETE (code-complete; real-browser/device verification still outstanding — see "Testing Status")

## Overall Project Progress

```
PHASE 0  — Project Foundation           — COMPLETE
PHASE 1  — Database + Product Mgmt      — COMPLETE
PHASE 2  — POS + Cart                   — COMPLETE (pending human verification)
PHASE 3  — Sales Recording              — NOT STARTED
PHASE 4  — Sales History + Dashboard    — NOT STARTED
PHASE 5  — Reports                      — NOT STARTED
PHASE 6  — Excel + PDF Export           — NOT STARTED
PHASE 7  — Backup + Restore             — NOT STARTED
PHASE 8  — Offline + PWA                — NOT STARTED
PHASE 9  — Polish + Mobile UX           — NOT STARTED
PHASE 10 — Final QA + Release           — NOT STARTED
```

## What Has Been Built

Everything from Phases 0–1 (app shell, routing, design tokens, IndexedDB
schema, Product/Category/Payment Method management), **plus**, from Phase 2:

- A working POS screen (`src/pages/PosPage.tsx`) with category tabs, a
  touch-friendly product grid, and a cart with an always-correct running
  total.
- A new `useCart` hook (`src/hooks/useCart.ts`) holding in-memory cart
  state, built on the `CartLine` type that already existed in
  `src/types/index.ts` since Phase 0.
- A new shared `CartPanel` component (`src/components/CartPanel.tsx`) that
  renders the cart's contents, used identically by the desktop cart column
  and the mobile bottom sheet.
- Resolution of the one open question left at the end of Phase 1: a
  product whose category has been deactivated is now filtered out of the
  POS grid, the same as an inactive product.
- New CSS in `src/styles/components.css` for all of the above, built
  entirely from the existing design tokens (no new colors, fonts, or
  breakpoints introduced — reuses the 860px breakpoint from `layout.css`).

Still not built: payment selection, saving a sale, sales history,
dashboard, reports, exports, backup/restore, offline/PWA support. Those are
Phases 3–8, in order.

## Current Architecture

Unchanged from Phases 0–1 (React 19 + TypeScript + Vite, `idb` over
IndexedDB, `HashRouter`, plain CSS with design tokens, self-hosted Manrope
font). Additions this phase:

- **Cart state:** `src/hooks/useCart.ts` is a plain hook (`useState` +
  `useMemo`), following the "no state management library" pattern set in
  Phase 1 — no Redux/Zustand introduced. It exposes `lines`, `itemCount`,
  `total`, and `addProduct`/`increase`/`decrease`/`removeLine`/`clear`.
  `addProduct` takes a minimal `CartableProduct` shape (`id`, `name`,
  `price`) rather than the full `Product` type, so the hook doesn't need to
  import database/service types — any object with those three fields
  works, including a real `Product`.
- **Cart is in-memory only, not persisted to IndexedDB.** The Phase 2 brief
  explicitly allowed this ("your call, document it either way"). Decision:
  keep it in memory for now. A page reload during an order loses the draft
  cart. Revisit only if a real owner reports this being a problem in
  practice — don't add IndexedDB persistence speculatively.
- **`CartPanel` is shared, not duplicated**, between the desktop column and
  the mobile bottom sheet. It takes `{ cart: UseCartResult; currency:
  string }` and renders the same markup either way; the *container* around
  it (a plain sticky `<div>` on desktop, the existing Phase 1 `Modal` on
  mobile) is what differs, controlled entirely by CSS media queries plus
  one piece of React state (`cartSheetOpen`) that only matters below the
  860px breakpoint.
- **Reused the Phase 1 `Modal` component for the mobile cart sheet**,
  exactly as HANDOFF.md suggested it might be reused for — no second modal
  implementation was built.
- **Category tabs are a horizontal scroller of pill buttons**, not the
  fixed `.segmented` control from Phase 1's Products tab — chosen because
  the owner can add an unbounded number of categories over time, and a
  scroller degrades better than a fixed-width control at, say, 8+
  categories. An "All" tab is included and is the default selection.

## Important Files

Everything listed in Phases 0–1's handoff still applies. New/changed this
phase:

`src/pages/PosPage.tsx`
→ **Rewritten.** Loads active categories, active products (further filtered
to only those whose category is also active), and settings (for the
currency symbol) on mount. Renders category tabs, the product grid, the
desktop cart column, the mobile floating bar, and the mobile cart sheet
modal. Tapping a product calls `cart.addProduct(product)`. The "Continue to
Payment" button inside `CartPanel` is a disabled placeholder — Phase 3 must
wire it to payment selection and sale-saving; it does not yet call
anything.

`src/hooks/useCart.ts`
→ New. `useCart()` → `{ lines, itemCount, total, addProduct, increase,
decrease, removeLine, clear }`. See "Current Architecture" above. Phase 3
should probably keep using this same hook for the active order rather than
inventing new cart state, and only add sale-saving logic (in a new
`salesService.ts`, per Phase 1's HANDOFF.md guidance) that *reads* the
cart's `lines`/`total` at the moment "Save Sale" is tapped, then calls
`cart.clear()` on success.

`src/components/CartPanel.tsx`
→ New. Renders an `EmptyState` when the cart is empty, otherwise the line
list (name, unit price, quantity stepper, line total, remove button), the
total, a "Clear cart" button, and the disabled "Continue to Payment"
placeholder. Takes `{ cart: UseCartResult; currency: string }`. Phase 3
will likely need to add a real `onCheckout` callback prop here (or replace
the placeholder button with a working one) rather than editing this file's
internals — keep the line-list rendering as-is if it still works.

`src/styles/components.css`
→ Extended (not rewritten) with a new section: `.pos-layout`,
`.category-tabs*`, `.product-grid`, `.product-tile*`, `.pos-cart-panel*`,
`.cart-panel*`, `.cart-line*`, `.qty-stepper*`, `.pos-floating-bar`. All
new rules sit together in one block, right before the pre-existing "Page
header" section — see the file for the exact boundary if you need to find
where Phase 2's CSS starts and ends.

## Database Structure

Unchanged from Phase 1. The cart itself has no database representation —
see "Current Architecture" above for why. `sales`/`saleItems` stores still
exist (empty) waiting for Phase 3.

## Completed Features

- POS product grid with category tabs (including an "All" tab), active
  filtering (product AND its category must both be active), touch-friendly
  tiles showing name/price/photo
- Cart: add (tap product), increase, decrease (removes line at 0), remove
  directly, clear, per-line and running totals, all always in sync
- Mobile floating "VIEW ORDER — {total}" bar + bottom-sheet cart review
- Desktop always-visible cart column, no floating bar
- Visible but non-functional "Continue to Payment" placeholder (Phase 3
  makes it real)
- (Carried from Phases 0–1) product/category/payment-method management,
  responsive app shell, IndexedDB schema, error boundary

## Known Issues

- **This phase's code has not been run, built, type-checked, or linted.**
  This session's container has no network egress — `npm install` failed
  outright with a 403 from the npm registry (see "Testing Status" below
  for the exact command/error). None of `npm run dev`, `npm run build`,
  `npx tsc -b`, `npx oxlint`, or `npm run smoke-test` could be executed.
  **The next session (or the project owner, locally) must run these before
  trusting this phase.** If any of them surface an error, fix it before
  starting Phase 3 — don't assume this phase's code is correct just
  because it's now documented as "COMPLETE".
- As a partial substitute, every new/changed file (`useCart.ts`,
  `CartPanel.tsx`, `PosPage.tsx`) was passed through `esbuild` (found
  already installed as a transitive dependency of the `tsx` devDependency
  in this environment) for a syntax check, and the entire app was
  bundle-resolved from `src/main.tsx` with only real npm packages
  (`react`, `react-dom`, `react-router-dom`, `idb`, `@fontsource/*`)
  externalized, confirming every relative import path and export/import
  name lines up across the whole app. This is **not** equivalent to
  `tsc`'s type-checking (it doesn't catch type mismatches) and is not a
  substitute for a real browser — treat it as a weak signal only.
- Manual click-through (switch categories, tap products, adjust quantities
  every way, verify totals, check both mobile- and desktop-width windows,
  check long product names / larger peso amounts) as requested by the
  Phase 2 brief has **not been done** — no headed browser or real device is
  available in this environment. Do this before/during Phase 3.
- No confirmation dialog before "Clear cart" — deliberate, see "Decisions
  Already Made" below.
- Cart state is lost on page reload (in-memory only) — deliberate for now,
  see "Current Architecture" above.
- (Carried from Phase 1) No UI yet for editing `settings`
  (businessName/currency).

## Decisions Already Made

Carried from Phases 0–1 (still true, don't change without good reason):
IndexedDB over localStorage; `HashRouter` over `BrowserRouter`; plain CSS
over Tailwind; self-hosted Manrope; the `SaleItem` snapshot pattern;
soft-delete-only for products/categories/payment methods; no confirmation
dialogs for reversible one-tap actions.

New in Phase 2:

- **Inactive-category products are filtered out of the POS grid**, exactly
  like inactive products — decided in favor of the recommendation left in
  Phase 1's HANDOFF.md. Their stored data (including any historical sales
  referencing them) is untouched; they simply don't show up to be
  re-ordered.
- **Cart state stays in memory, not IndexedDB, for this phase.** Simplest
  option that satisfies "review order with an accurate total" without
  adding persistence machinery for a phase that doesn't save anything yet.
- **The Phase 1 `Modal` component is reused as-is for the mobile cart
  sheet**, rather than building a dedicated cart-sheet component. Its
  generic `title`/`onClose`/`children` shape fit without modification.
- **`CartPanel` is one component used in two containers** (desktop sticky
  column vs. mobile `Modal`), switched by CSS (`display: none` /
  `display: block` at the 860px breakpoint) plus the `cartSheetOpen` piece
  of state that only gates the mobile `Modal`. This avoids maintaining two
  cart-rendering implementations that could drift apart.
- **Category tabs are a horizontal scroller**, not the Phase 1 `.segmented`
  control — see "Current Architecture" above for why.
- **No confirmation dialog for "Clear cart".** The cart is an unsaved
  draft, not committed data (unlike a saved sale, which Phase 4's delete
  flow will require confirmation for) — consistent with Phase 1's
  reasoning for not confirming deactivation.
- **"Continue to Payment" is a disabled placeholder button inside
  `CartPanel`**, not a separate unwired screen — chosen over the brief's
  other allowed option (leaving checkout out entirely) because it makes
  the intended Phase 3 entry point visible and unambiguous to whoever
  builds it next.

## DO NOT CHANGE

Everything listed in Phases 0–1's version of this section (HashRouter,
`SaleItem` snapshot fields, design tokens, top-level folder structure,
soft-delete-only pattern, store names/keyPaths, `DB_VERSION` migration
discipline) — still applies. Additionally, as of Phase 2:

- The `CartLine` type's shape (`productId`, `name`, `unitPrice`,
  `quantity`) — defined back in Phase 0, now actually used. Don't rename
  its fields; `useCart.ts` and `CartPanel.tsx` both depend on this exact
  shape.
- The active-category-AND-active-product filter in `PosPage.tsx` — this is
  now the documented, deliberate resolution of Phase 1's open question.
  Don't quietly revert to showing all active products regardless of their
  category's status.
- Don't fork `CartPanel` into two separate components for desktop/mobile —
  if Phase 3 needs different behavior in one context, prefer a prop over a
  duplicate component.

## Next Phase

**PHASE 3 — Sales Recording.** See `NEXT_PHASE_PROMPT.md` for the exact
brief.

## Recommended First Steps

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. **Run `npm install && npm run build && npx oxlint && npm run
   smoke-test` before writing any Phase 3 code.** This phase's code has
   never been through any of these — treat that as step zero, not
   optional, and fix anything they surface before proceeding.
3. Run `npm run dev`, open the POS tab, and manually click through: switch
   categories (including "All"), tap several products, increase/decrease/
   remove/clear the cart every way, confirm the total is always right, and
   check both a mobile-width and a desktop-width browser window. This is
   real manual QA that could not be done this session.
4. Read `src/types/index.ts`'s `Sale`/`SaleItem` types (unchanged since
   Phase 0) and `src/hooks/useCart.ts` (new this phase) — Phase 3 needs
   both: it saves a `Sale` + its `SaleItem`s (with price snapshots) from
   whatever's currently in the cart hook's `lines`.
5. Build a `src/services/salesService.ts` following the same plain-
   async-function pattern as `productsService.ts` etc. (see Phase 1's
   HANDOFF.md "Current Architecture").
6. Wire the "Continue to Payment" button in `CartPanel.tsx` to an actual
   flow (likely a new modal/screen for payment method selection + cash
   received + change calculation), then call `salesService` to save, then
   `cart.clear()` on success.
7. Update `PROJECT_STATUS.md`, `HANDOFF.md`, and replace
   `NEXT_PHASE_PROMPT.md` with Phase 4 instructions before stopping.

## Testing Status

| Check | Result |
|---|---|
| `npm install` | ❌ Failed — `403 Forbidden` from `registry.npmjs.org` (no network egress in this container) |
| `npx tsc -b` (type-check) | ⛔ Not run — no `node_modules` (install failed) |
| `npm run build` | ⛔ Not run |
| `npx oxlint` | ⛔ Not run |
| `npm run smoke-test` | ⛔ Not run (also: cart is UI-only state, not IndexedDB-backed, so it wasn't extended this phase — matches the Phase 2 brief's "optional, use your judgment") |
| `esbuild` syntax check on `useCart.ts`, `CartPanel.tsx`, `PosPage.tsx` | ✅ Pass, 0 errors (using the `esbuild` binary bundled with the `tsx` devDependency already present in this environment) |
| `esbuild --bundle` from `src/main.tsx`, externalizing only real npm packages | ✅ Pass — every relative import across the whole app resolves, 0 errors |
| Manual click-through in a real/headed browser | ❌ Not done — no headed browser available in this environment |
| Real mobile device check | ❌ Not done |
| Confirmed Phase 0–1 functionality (Product Management, History/Reports placeholders) untouched | ✅ Verified by inspection — only `PosPage.tsx` and `components.css` were modified; `useCart.ts`/`CartPanel.tsx` are new, isolated files |
