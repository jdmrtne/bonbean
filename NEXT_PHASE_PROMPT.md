# CONTINUE COFFEE CART POS DEVELOPMENT

You are continuing an existing Coffee Cart POS project.

DO NOT rebuild the application from scratch.

First:

1. Read README.md
2. Read PROJECT_STATUS.md
3. Read HANDOFF.md
4. Read this file (NEXT_PHASE_PROMPT.md)
5. Inspect the existing source code, especially `src/types/index.ts`
   (note the `CartLine` type, already shaped for this phase),
   `src/services/productsService.ts`, and `src/services/categoriesService.ts`
6. Run `npm install && npm run dev`. Add a category, a payment method, and
   a couple of products through the Products tab; confirm they persist
   after a refresh, before changing anything.
7. Run `npm run smoke-test` to confirm the data layer is healthy.

Current phase:

PHASE 2

Previous phases completed:

PHASE 0 — Project Foundation
PHASE 1 — Database + Product Management

Your task is to implement:

## PHASE 2 — POS + CART

Build the main POS screen in `src/pages/PosPage.tsx`, replacing its
current placeholder.

The POS must have:

- Product categories (tabs or a horizontal scroller) — read active
  categories via `categoriesService.listCategories(false)`
- A product grid filtered to the selected category — read active products
  via `productsService.listProducts(false)` (or
  `listProductsByCategory`), further filtered to products whose category
  is also active (see "Known Issues" in HANDOFF.md — this wasn't decided
  in Phase 1, decide and document it now)
- Large, touch-friendly product buttons showing name, price (use
  `utils/money.ts`'s `formatMoney` with the seeded currency symbol from
  `settingsService.getSettings()`), and respecting `active`
- Tapping a product adds it to the cart (or increments quantity if already
  in the cart)

Cart must support:

- Increase quantity
- Decrease quantity (removing the line at 0)
- Remove item directly
- Clear cart
- Show subtotal per line and a running total

Build cart state as a small reusable hook (e.g. `src/hooks/useCart.ts`)
using the existing `CartLine` type from `src/types/index.ts` — don't
invent a new shape. Cart state can live in memory only for this phase
(no need to persist a draft cart to IndexedDB yet, unless you judge it
useful for Phase 3's "New Sale" reset flow — your call, document it either
way).

Layout, per the master spec:

- **Mobile:** product grid fills the screen; a floating bar pinned above
  the bottom tab bar reads `VIEW ORDER — {total}` and opens the cart
  (as a bottom sheet — reuse the existing `Modal` component from Phase 1,
  or build a dedicated cart sheet if `Modal`'s shape doesn't fit; your
  call, document which you picked and why)
- **Desktop:** products on the left, cart visible at all times on the
  right (no floating bar needed at this width)

Do not implement payment selection or saving the sale yet — this phase
stops at "review order with an accurate total." Payment selection and
saving belong to Phase 3. It's fine (expected) for the cart's checkout
button to be a visible placeholder that does nothing yet, or to be
deferred entirely to Phase 3 — your call, just be explicit in the docs
about what's real vs. not yet wired up.

Do not break existing functionality: Product Management (Phase 1) and the
History/Reports placeholders (Phase 0) must keep working exactly as they
do now.

After completing the phase:

- Test everything manually: switch categories, tap products, adjust
  quantities every way (increase/decrease/remove/clear), confirm the
  total is always correct, check both a mobile-width and desktop-width
  browser window, and confirm long product names and larger peso amounts
  don't break the layout.
- Extend `scripts/smoke-test-db.ts` if you add any new service-layer logic
  (e.g. a cart-total helper worth unit-testing outside a component) —
  optional, use your judgment; the cart itself is UI state, not
  IndexedDB-backed, so it may not need a headless test.
- Run `npx tsc -b`, `npm run build`, `npx oxlint`, and `npm run
  smoke-test`, and fix anything they flag.
- Update `PROJECT_STATUS.md`.
- Update `HANDOFF.md` (What Has Been Built, Important Files, Completed
  Features, Decisions Already Made, Known Issues, Testing Status).
- Replace this file (`NEXT_PHASE_PROMPT.md`) with instructions for
  PHASE 3 — Sales Recording.

Do NOT start Phase 3. Stop once Phase 2 is tested and documented, and tell
the project owner Phase 2 is ready for handoff.
