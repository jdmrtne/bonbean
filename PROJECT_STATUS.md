Project:
Coffee Cart POS

Current Phase:
PHASE 9 — Polish + Mobile UX

Status:
COMPLETE — verified with the real toolchain AND a real headless-browser
before/after mobile screenshot pass (both were available again this
session, same as Phase 8).

Completed:

* **Mobile branding fix** (the gap Phase 8 left open): `AppShell.tsx`'s
  `.app-topbar` now shows a compact "☕ Coffee Cart" brand mark on
  mobile, replacing the tagline there (both together crowded a 390px
  topbar). Desktop is unchanged — the sidebar's own brand mark still
  covers it there, and the tagline reappears in the topbar above the
  860px breakpoint. New CSS: `.app-topbar__brand-mobile` (mobile only),
  `.app-topbar__page` now `display: none` by default and restored to
  `display: block` inside the existing desktop media query.
* **Touch target sizing**: bumped every interactive control found under
  ~44px during the mobile screenshot pass up to 44px:
  - `.qty-stepper__btn` (cart quantity +/−): 36px → 44px
  - `.modal-sheet__close`: 32px → 44px
  - `.segmented__item`, `.category-tabs__item`, `.range-tabs__item`
    (three separate rules, all previously `min-height: 40px`): → 44px
  - Side effect: the bigger qty-stepper buttons started truncating
    product names in the cart line on a 390px screen (e.g. "Iced
    Latte" → "Iced La…"). Fixed by tightening `.cart-line`'s gap
    (space-3 → space-2) and `.qty-stepper`'s internal gap (space-2 →
    space-1) to give the name column its width back — reconfirmed with
    a second screenshot after the tweak; full names fit again.
* **Loading states**: added `src/components/LoadingState.tsx` — a
  spinner styled to match `EmptyState`'s exact layout/spacing (same
  `.empty-state` wrapper class, same title styling) rather than a new
  pattern, with `role="status"`/`aria-live="polite"` and a
  `prefers-reduced-motion` fallback. Wired into all six places that
  previously `return null`ed during their initial IndexedDB read:
  `PosPage.tsx`, `HistoryPage.tsx`, `ReportsPage.tsx`,
  `ProductsManager.tsx`, `CategoriesManager.tsx`,
  `PaymentMethodsManager.tsx`. (`StatusBanners.tsx`'s `return null` is
  unrelated — that's its correct "nothing to show" state, not a
  loading state, and was left alone.)
* **Empty-state review**: checked every existing empty state (POS grid,
  cart, sales history, reports range, and each Products-page tab) for
  consistent icon/title/description structure and tone — all already
  used `EmptyState` consistently from Phases 1–8; no gaps or
  inconsistencies found, no changes needed.
* `public/sw.js` — `CACHE_VERSION` bumped `v1` → `v2` (required: this
  phase changed `components.css`/`layout.css`, both cached files).
* `scripts/mobile-screens.mjs` — new, NOT wired into `package.json` or
  the build. A one-off Playwright screenshot script used for this
  phase's before/after mobile-viewport pass, kept for a future phase to
  reuse. See its own header comment for the environment quirks
  (playwright-core isn't a project dependency; the prebuilt Chromium at
  `/opt/pw-browsers` needed its `headless_shell` binary specifically,
  not `chrome`, which refuses to launch in old-headless mode).

Verification done (real toolchain + real browser, both available again
this session):

* `npm install` — succeeded (41 packages, 0 vulnerabilities).
* `npx tsc -b` — clean, before and after this phase's changes.
* `npm run build` (`vite build`) — succeeded; confirmed the new
  `LoadingState` component and CSS changes bundle without error.
* `npx oxlint src` — 0 errors before and after. Note: running bare
  `npx oxlint` (no path) also scans `node_modules` and any `dist/`
  present and reports thousands of irrelevant warnings/errors from
  React's own minified/internal code — always scope it to `src` (as
  Phase 8's own smoke-test presumably did, though this wasn't stated
  explicitly in its handoff). 4 pre-existing warnings remain (same
  `setState`-in-effect pattern in `HistoryPage.tsx`,
  `ProductsManager.tsx`, `PaymentMethodsManager.tsx`,
  `CategoriesManager.tsx` — one fewer warning than Phase 8's reported 5,
  likely just a count-at-the-margin difference, not a fix; unrelated to
  this phase either way).
* `npm run smoke-test` — all 58 assertions passed, unchanged from Phase
  8 (this phase touched no IndexedDB/business logic).
* **Real headless-browser mobile screenshot pass**, via Playwright
  (`playwright-core`, installed into a throwaway sibling directory —
  see `scripts/mobile-screens.mjs`'s header for why) against Chromium's
  `headless_shell` binary at `/opt/pw-browsers` (the plain `chrome`
  binary there refuses to launch — "Old Headless mode has been
  removed" — a wrinkle Phase 8 didn't hit and didn't document):
  - Screenshotted all four routes at 390×844 BEFORE any Phase 9 change:
    confirmed the branding gap (no "Coffee Cart" text/mark anywhere on
    a phone screen) and the undersized cart quantity buttons.
  - Screenshotted the same routes AFTER: brand mark now visible on
    every screen's topbar; cart quantity buttons visibly bigger; full
    product names still fit in the cart line after the gap tweak.
  - Confirmed the desktop layout (1280px viewport) is unaffected: the
    sidebar's brand mark and the topbar tagline both still show, no
    duplication.
  - Re-ran Phase 8's offline check (build, serve, go offline, reload)
    against the new build and `CACHE_VERSION: v2` — the offline banner
    still renders correctly alongside the new mobile brand mark, with
    no layout overlap, confirming the SW cache bump didn't break
    offline loading.

Current functionality:

* Everything from Phases 0–8 (POS/cart, sales recording, Sales History
  + dashboard, Reports, CSV + print/PDF export, Backup + Restore,
  offline + PWA install) confirmed unchanged and working, now with the
  mobile UX gaps Phase 8 flagged addressed.
* Every screen shows app branding on mobile (previously only true on
  desktop, and only accidentally/broken on mobile before Phase 8's
  sidebar fix).
* Every interactive control checked is at least 44×44px.
* Every page shows a spinner (not a blank screen) during its initial
  data load.

Known bugs / verification gaps:

* **Real mobile DEVICE testing still hasn't happened** — carried from
  Phase 8, still true. Headless-browser viewport emulation (this
  phase's and Phase 8's verification) is not the same as a real phone;
  touch interactions, real "Add to Home Screen" flows, and real
  intermittent connectivity remain unverified on an actual device.
* **The update-banner flow still hasn't been tested end-to-end with a
  real second deploy** — carried from Phase 8, unchanged this phase
  (Phase 9 didn't touch the service-worker update mechanism itself).
* (Carried from Phase 7) No format-version migration path for backup
  files.
* (Carried from Phase 7) The native file-picker UI hasn't been checked
  on a real mobile browser's file picker specifically.
* (Carried from Phase 6) No PDF-generation library; "PDF export" is
  `window.print()` + a print stylesheet.
* (Carried from Phase 6) CSV export doesn't add a UTF-8 BOM.
* (Carried from Phase 5) "This month"/"Last month" use the local system
  clock's calendar month boundaries (not UTC).
* (Carried from Phase 4) Top products in the "Today" dashboard are
  quantity-only by design.
* (Carried from Phase 3) "Cash" detection is by payment-method name
  match, not a stored flag.
* (Carried from Phase 2) No confirmation dialog before "Clear cart".
* (Carried from Phase 2) Cart state is in-memory only.
* (Carried from Phase 1) No dedicated settings UI beyond Backup/Restore
  on the Products page.
* **New, minor, not fixed this phase**: the cart line's product name
  still truncates with an ellipsis on a very long name at 390px width
  even after the gap tightening (it has more room than before, but a
  sufficiently long name — e.g. "Large Iced Caramel Macchiato" — will
  still truncate). Not a regression (it always truncated), just not
  specifically solved. A future phase could let the name wrap to a
  second line instead of truncating, if this comes up in practice.

Next phase:

PHASE 10 — Final QA + Release
