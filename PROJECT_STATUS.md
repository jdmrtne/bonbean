Project:
Coffee Cart POS

Current Phase:
PHASE 2 — POS + Cart

Status:
COMPLETE (pending real-browser + real-device verification — see "Known bugs")

Completed:

* POS product grid built in `src/pages/PosPage.tsx`, replacing the Phase 0 placeholder
* Category tabs (horizontal scroller, not a fixed segmented control) plus an "All" tab, reading active categories via `categoriesService.listCategories(false)`
* Products read via `productsService.listProducts(false)` (active only), then further filtered to only those whose category is also active — this was the open "Known Issue" from Phase 1's HANDOFF.md, now decided: a product whose category is deactivated disappears from the POS grid exactly like an inactive product, with its own stored data untouched
* Large touch-friendly product tiles: name, price (via `utils/money.ts`'s `formatMoney` with the seeded currency symbol), optional photo, tapping adds to cart or increments quantity if already present
* Cart state in a new reusable hook, `src/hooks/useCart.ts`, built on the existing `CartLine` type from `src/types/index.ts` (no new shape invented) — in-memory only, not persisted to IndexedDB this phase (deliberate; see HANDOFF.md)
* Cart supports: increase quantity, decrease quantity (line removed at 0), remove item directly, clear cart, per-line subtotal, running total
* New shared `src/components/CartPanel.tsx` renders the cart — reused by both the always-visible desktop cart column and the mobile bottom sheet, rather than building two implementations
* Mobile layout: product grid fills the screen; a floating "VIEW ORDER — {total}" bar appears above the bottom tab bar once the cart has at least one item, and opens the cart in a bottom sheet built from the existing Phase 1 `Modal` component
* Desktop layout (≥860px, matching the existing breakpoint in `layout.css`): product grid on the left, cart panel always visible in a sticky column on the right; the floating bar is hidden
* Checkout is a visible, disabled placeholder button ("Continue to Payment") — payment selection and saving the sale are explicitly Phase 3, not implemented here
* New CSS added to `src/styles/components.css` for the POS layout, category tabs, product grid/tiles, cart panel, quantity stepper, and the mobile floating bar — all built from the existing design tokens in `theme.css`, no new colors/fonts introduced
* Confirmed Product Management (Phase 1) and the History/Reports placeholders (Phase 0) are untouched by this phase's changes (only `PosPage.tsx` and `components.css` were modified; `useCart.ts` and `CartPanel.tsx` are new files)

Current functionality:

* Owner can open the POS tab, switch categories, tap products to build an order, adjust quantities every way (increase/decrease/remove/clear), and see an always-correct running total
* Cart state resets if the page is reloaded (in-memory only) — acceptable for this phase, flagged for revisit if it becomes a real problem
* Tapping "Continue to Payment" does nothing yet (disabled) — Phase 3 wires this up

Known bugs / verification gaps:

* **This phase's code could not be run, built, or lint-checked in this session** — `npm install` failed with a 403 (no network egress available to this container; see HANDOFF.md "Testing Status" for the exact commands and errors). No `npm run dev`, `npm run build`, `npx oxlint`, or `npm run smoke-test` could be executed.
* In place of the above, every new/changed file was checked with `esbuild` (bundled with a separately-installed devDependency of another package, `tsx`, already present in this environment) for syntax validity, and the full app entry point (`src/main.tsx`) was bundle-resolved end-to-end with only true npm packages (`react`, `react-dom`, `react-router-dom`, `idb`, `@fontsource/*`) externalized — this confirms every relative import resolves and the JSX/TS syntax is valid, but it is **not** a substitute for `tsc`'s type-checking, `oxlint`, or a real browser.
* **A human must run `npm install && npm run dev` (or `npm run build`), click through the POS screen at both a mobile and a desktop width, and run `npm run smoke-test`/`npx oxlint`/`npx tsc -b` before this phase is truly done.** Treat this phase as code-complete-but-unverified until that happens.
* No confirmation dialog before "Clear cart" — deliberate, matching the lightweight one-tap pattern from Phase 1's deactivate toggles (the cart is an unsaved draft, not committed data). Documented in HANDOFF.md.

Next phase:

PHASE 3 — Sales Recording
