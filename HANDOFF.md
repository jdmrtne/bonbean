# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 9 — COMPLETE. This session again had working npm registry access
AND a headless Chromium available (same combination Phase 8 had), so
the full toolchain ran clean and a real before/after mobile-viewport
screenshot pass verified this phase's own goal (mobile UX) directly,
not just by code review. See "Testing Status" for full detail.

## Overall Project Progress

```
PHASE 0  — Project Foundation           — COMPLETE
PHASE 1  — Database + Product Mgmt      — COMPLETE
PHASE 2  — POS + Cart                   — COMPLETE (pending human verification; headless click-through done Phase 8)
PHASE 3  — Sales Recording              — COMPLETE (automated checks passed; headless click-through done Phase 8)
PHASE 4  — Sales History + Dashboard    — COMPLETE (automated checks passed; headless click-through done Phase 8)
PHASE 5  — Reports                      — COMPLETE (automated checks passed; pending human click-through)
PHASE 6  — Excel + PDF Export           — COMPLETE (automated checks passed; pending human click-through of actual CSV/print output)
PHASE 7  — Backup + Restore             — COMPLETE (automated checks AND a real-IndexedDB restore round-trip both passed, Phase 8)
PHASE 8  — Offline + PWA                — COMPLETE (full toolchain + real headless-browser offline click-through, Phase 8)
PHASE 9  — Polish + Mobile UX           — COMPLETE (full toolchain + real headless-browser before/after mobile screenshot pass, this session)
PHASE 10 — Final QA + Release            — NOT STARTED
```

**Environment note, carried forward from Phase 8's own note:** this
session again had both working `npm install` AND a headless Chromium
pre-installed at `/opt/pw-browsers`. Don't assume this persists into
Phase 10 — check both at the start, same as every phase's
"Recommended First Steps" says. One new wrinkle this session found (see
"Testing Status"): the pre-installed Chromium's plain `chrome` binary
refuses to launch in old-headless mode ("Old Headless mode has been
removed from the Chrome binary"). Use the sibling
`chromium_headless_shell-*/chrome-linux/headless_shell` binary instead
— Phase 8 didn't hit this because its own click-through script must
have already pointed at the right binary, but it wasn't documented, so
recording it here for Phase 10.

## What Has Been Built

Everything from Phases 0–8 (app shell, routing, design tokens,
IndexedDB schema, Product/Category/Payment Method management, POS grid
and cart, sales recording, Sales History + dashboard, Reports, CSV +
print/PDF export, Backup + Restore, offline + PWA install), **plus**,
from Phase 9:

- **Mobile brand mark in the topbar.** `src/components/AppShell.tsx`'s
  `.app-topbar` now renders a `.app-topbar__brand-mobile` block (the
  same "☕" mark + "Coffee Cart" title markup/classes the desktop
  sidebar already used) that's visible only below the 860px breakpoint,
  replacing the tagline there. Desktop is untouched: the sidebar's
  brand mark still covers it, and the topbar's tagline (`.app-topbar__page`)
  reappears via the existing desktop media query.
- **`src/components/LoadingState.tsx`** — new. A spinner-based loading
  indicator styled to reuse `.empty-state`'s exact layout (icon slot →
  spinner, title styling unchanged) rather than a new visual pattern.
  `role="status"`, `aria-live="polite"`, and a `prefers-reduced-motion`
  fallback that removes the spin animation. Takes an optional `label`
  prop (defaults to "Loading…"; each call site below passes a more
  specific one).
- **Six loading-state call sites**, replacing a bare `return null`
  during the initial IndexedDB read: `PosPage.tsx` ("Loading
  products…"), `HistoryPage.tsx` ("Loading sales history…"),
  `ReportsPage.tsx` ("Loading reports…"), `ProductsManager.tsx`
  ("Loading products…"), `CategoriesManager.tsx` ("Loading
  categories…"), `PaymentMethodsManager.tsx` ("Loading payment
  methods…"). `StatusBanners.tsx`'s own `return null` (its correct
  "nothing to show" state, not a loading state) was intentionally left
  alone.
- **Touch-target sizing**, all in `src/styles/components.css`:
  `.qty-stepper__btn` 36→44px, `.modal-sheet__close` 32→44px, and three
  separate `min-height: 40px` rules (`.segmented__item`,
  `.category-tabs__item`, `.range-tabs__item`) → 44px. Side effect
  fixed in the same file: `.cart-line`'s gap (space-3→space-2) and
  `.qty-stepper`'s internal gap (space-2→space-1) were tightened, since
  the bigger stepper buttons had started crowding out the product name
  column on a 390px cart line (verified with a screenshot before and
  after this specific tweak — see "Testing Status").
- `public/sw.js` — `CACHE_VERSION` bumped `"v1"` → `"v2"` (both changed
  CSS files are cached by the service worker).
- `scripts/mobile-screens.mjs` — new, NOT an npm script, NOT a project
  dependency-user (see its own header comment for the full "how to run
  this" detail, including the `playwright-core`/Chromium wrinkles
  above). A reusable screenshot harness for any future phase that wants
  a real before/after mobile pass.

Still not built: real mobile device testing (touch, real "Add to Home
Screen", real intermittent connectivity) — see "Known Issues", carried
from Phase 8, unchanged. Final cross-phase QA is Phase 10's job.

## Current Architecture

Unchanged from Phases 0–8 except where noted above. Nothing about
routing, the database, the service worker's caching *strategy*, or the
update flow's *mechanism* changed this phase — only `CACHE_VERSION`
(a version bump, not a strategy change) and the CSS/component
additions listed above.

- **The mobile topbar brand mark is a second copy of the same
  mark/title markup the sidebar uses**, shown/hidden by media query
  rather than the two being merged into one shared subcomponent. This
  was a deliberate lean choice (two small, obviously-related JSX blocks
  vs. extracting a `<BrandMark />` for a one-phase, two-call-site need)
  — a future phase touching branding again should consider extracting
  it if a third call site appears.
- **`LoadingState` deliberately does not distinguish "slow load" from
  "instant load"** — it always renders for at least one paint before
  data arrives (there's no minimum-display-time debounce). On a fast
  device/warm cache this is visually a single flash; nobody reported
  this as a problem in the mobile screenshot pass, but a future phase
  could add a short delay-before-showing if it proves distracting in
  practice.

## DO NOT CHANGE

Everything in Phases 0–8's version of this section still applies
(price/name snapshot rule, `utils/reportStats.ts`/`utils/csv.ts`/
`utils/salesExport.ts`/`utils/backup.ts` not importing
`database/db.ts`, `restoreBackup`'s full-replace behavior, the backup
JSON's top-level key names, no `self.skipWaiting()`, cache-first
strategy, the `.app-sidebar { display: none; }` mobile rule). Additionally, as of Phase 9:

- Don't remove `.app-topbar__page { display: none; }`'s base (mobile)
  rule or the media-query override that restores it on desktop — doing
  either reintroduces either a missing desktop tagline or a crowded
  mobile topbar (brand mark + tagline both visible on a 390px screen).
- Don't forget to bump `CACHE_VERSION` in `public/sw.js` on any future
  change to a cached file — this phase is the second time this has
  needed doing (Phase 8 documented the rule; this phase is the first
  time it actually mattered).
- Don't shrink `.qty-stepper__btn`, `.modal-sheet__close`,
  `.segmented__item`, `.category-tabs__item`, or `.range-tabs__item`
  back below ~44px — they were found undersized by a real mobile
  screenshot, not a guideline lookup.

## Next Phase

**PHASE 10 — Final QA + Release.** See `NEXT_PHASE_PROMPT.md` for the
exact brief.

## Recommended First Steps

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. Check environment capabilities first: `npm ping`/`npm install`, and
   `echo $PLAYWRIGHT_BROWSERS_PATH` + look for a prebuilt Chromium
   there. If you find one, remember the `chrome` vs `headless_shell`
   binary wrinkle noted above under "Overall Project Progress" —
   `chrome` alone may refuse to launch headless.
3. If npm access works, run `npm install && npx tsc -b && npm run
   build && npx oxlint src && npm run smoke-test` before writing any
   Phase 10 code. **Use `npx oxlint src`, not bare `npx oxlint`** — the
   bare form also lints `node_modules`/`dist` and buries real output in
   thousands of irrelevant warnings (discovered this session — see
   PROJECT_STATUS.md's "Testing Status"). Everything was clean as of
   this handoff.
4. If a headless browser is available, use it for final device/viewport
   QA across every page, both online and offline, plus a "does this
   feel done" pass — Phase 10 is explicitly about final QA before
   release, so this is the phase's core activity, not a bonus check.
   `scripts/mobile-screens.mjs` (see its header) can be adapted/reused
   rather than rewritten from scratch.
5. Check the original master spec's Phase 10 section for its exact
   scope (likely: a full regression pass across every phase's feature,
   README/user-facing polish, a release checklist, and whatever
   "release" means for a project with no backend/deployment pipeline of
   its own — e.g. confirming the built `dist/` folder is a complete,
   correct static site ready to host anywhere).
6. Update `PROJECT_STATUS.md` and `HANDOFF.md` to mark the project
   fully complete, and leave a final closing note in
   `NEXT_PHASE_PROMPT.md` (or remove it, if Phase 10 is intended to be
   the last phase) rather than drafting a Phase 11 brief that doesn't
   exist in the master spec.

## Testing Status

| Check | Result |
|---|---|
| `npm install` | ✅ Succeeded — 41 packages, 0 vulnerabilities |
| `npx tsc -b` | ✅ Clean, before and after this phase's changes |
| `npm run build` (`vite build`) | ✅ Succeeded, both before and after the mid-phase cart-line gap tweak |
| `npx oxlint src` | ✅ 0 errors, 4 pre-existing warnings (same `setState`-in-effect pattern as Phase 8, one fewer instance counted — not a fix, just how the count landed). **Note:** bare `npx oxlint` (no path arg) also scans `node_modules` and any stale `dist/`, producing ~18,000 irrelevant warnings/errors from React's own code — always scope to `src`. |
| `npm run smoke-test` | ✅ All 58 assertions passed, unchanged from Phase 8 (no business logic touched this phase) |
| Real headless-browser mobile screenshot pass (390×844, before Phase 9 changes) | ✅ Done — confirmed the branding gap (no "Coffee Cart" text anywhere on a phone screen) and the undersized cart +/− buttons, both previously only reasoned about from Phase 8's "Known Issues" |
| Real headless-browser mobile screenshot pass (390×844, after Phase 9 changes) | ✅ Done — brand mark now visible on every screen; touch targets visibly bigger; caught the cart-line name-truncation side effect and re-verified the fix with a *third* screenshot pass |
| Desktop layout check (1280px, after Phase 9 changes) | ✅ Done — sidebar brand mark + topbar tagline both still render, no duplication introduced by the new mobile-only brand mark |
| Offline reload check (after Phase 9 changes + `CACHE_VERSION: v2`) | ✅ Done — build, serve, go offline, reload: offline banner still renders correctly alongside the new mobile brand mark, no layout overlap, confirming the cache-version bump didn't break offline loading |
| Real mobile DEVICE testing | ❌ Not done — carried from Phase 8, still outstanding |
| Update-banner flow with a real second deploy | ❌ Not done — carried from Phase 8, this phase didn't touch the update mechanism |
| Confirmed Phase 0–8 functionality unbroken | ✅ Smoke-test suite passing + the offline/desktop screenshot checks actually exercising POS, navigation, and the offline banner live in a browser |

## Known Issues

- **Real mobile DEVICE testing remains outstanding** (carried from
  Phase 8) — headless-browser viewport emulation is not the same as a
  real phone; touch interactions, real "Add to Home Screen" flows, and
  real intermittent connectivity remain unverified.
- **The update-banner flow still hasn't been tested end-to-end with a
  real second deploy** (carried from Phase 8) — this phase didn't touch
  the service-worker update mechanism.
- **Cart line product names can still truncate at 390px** for a
  sufficiently long name (e.g. "Large Iced Caramel Macchiato"), even
  after this phase's gap-tightening fix gave the name column more
  room. Not a regression — it always truncated — just not fully solved.
  A future phase could let the name wrap to two lines instead.
- **`LoadingState` has no minimum-display-time debounce** — see
  "Current Architecture". Not observed to be a problem, but worth
  knowing if a future phase adds a slower data source.
- (Carried from Phase 7) No format-version migration path for backup
  files.
- (Carried from Phase 7) The native file-picker UI hasn't been checked
  on a real mobile browser's file picker.
- (Carried from Phase 6) No PDF-generation library; "PDF export" is
  `window.print()` + a print stylesheet.
- (Carried from Phase 6) CSV export doesn't add a UTF-8 BOM.
- (Carried from Phase 5) "This month"/"Last month" use local calendar
  month boundaries (not UTC).
- (Carried from Phase 4) Top products in the "Today" dashboard are
  quantity-only by design.
- (Carried from Phase 3) "Cash" detection is by payment-method name
  match, not a stored flag.
- (Carried from Phase 2) No confirmation dialog before "Clear cart".
- (Carried from Phase 2) Cart state is in-memory only.
- (Carried from Phase 1) No dedicated settings UI beyond Backup/Restore.

## Decisions Already Made

Carried from Phases 0–8 (still true, don't change without good reason):
IndexedDB over localStorage; `HashRouter`; plain CSS; self-hosted
Manrope; `SaleItem` snapshot pattern; soft-delete-only; no confirmation
dialogs for reversible one-tap actions; cart stays in memory; cash
detection by name match; range-aggregation logic in
`utils/reportStats.ts`; no PDF-generation library; Backup/Restore is a
full replace; hand-written service worker (no `vite-plugin-pwa`);
cache-first app shell; manual update flow (banner + explicit reload,
never silent `skipWaiting()`).

New in Phase 9:

- **The mobile brand mark duplicates the sidebar's markup rather than
  sharing a component.** See "Current Architecture" — a deliberate
  lean choice for a two-call-site need, revisit if a third appears.
- **Loading states reuse `EmptyState`'s visual language
  (`.empty-state` wrapper, same title class) via a new sibling
  component (`LoadingState`) rather than modifying `EmptyState` itself
  to take a "loading" mode.** Keeps `EmptyState`'s prop surface
  (icon/title/description/action) untouched and its own meaning
  (nothing here) distinct from "still finding out what's here."
- **Touch targets were bumped based on real screenshot evidence, not a
  blanket sweep.** Only the five specific rules found visibly undersized
  were changed; controls already at or above 44px (e.g. `.btn`,
  `.icon-btn`, `.field__input`, `.payment-method-btn`, all already
  using `--tap-target-min: 48px`) were left alone.
- **The cart-line gap tightening is scoped to just `.cart-line` and
  `.qty-stepper`**, not applied as a general "reduce all gaps" pass —
  only the one row that visibly broke from the touch-target change was
  touched.

## Important Files

Everything in Phases 0–8's handoff still applies. New/changed this
phase:

`src/components/AppShell.tsx`
→ Extended: `.app-topbar` now includes a `.app-topbar__brand-mobile`
block (mobile-only brand mark), alongside the existing tagline.

`src/components/LoadingState.tsx`
→ New. Spinner-based loading indicator, styled to match `EmptyState`.

`src/pages/PosPage.tsx`, `src/pages/HistoryPage.tsx`,
`src/pages/ReportsPage.tsx`, `src/components/ProductsManager.tsx`,
`src/components/CategoriesManager.tsx`,
`src/components/PaymentMethodsManager.tsx`
→ Extended: initial-load `return null` replaced with
`<LoadingState label="…" />`.

`src/styles/layout.css`
→ Extended: `.app-topbar__brand-mobile` rules + `.app-topbar__page`
`display: none` base / `display: block` desktop-override.

`src/styles/components.css`
→ Extended: `.loading-spinner` + `@keyframes loading-spin`; touch-target
sizing on `.qty-stepper__btn`/`.modal-sheet__close`/
`.segmented__item`/`.category-tabs__item`/`.range-tabs__item`; gap
tightening on `.cart-line`/`.qty-stepper`.

`public/sw.js`
→ `CACHE_VERSION`: `"v1"` → `"v2"`.

`scripts/mobile-screens.mjs`
→ New. Not an npm script, not a project dependency-user. See its own
header comment before running it.

## Database Structure

Unchanged from Phase 1 — Phase 9 touches no IndexedDB schema or logic.

## Completed Features

- Polish + Mobile UX (this phase): mobile app branding in the topbar,
  44px-minimum touch targets on every control found undersized, loading
  indicators on every page's initial data fetch, and a confirmed-
  consistent empty-state treatment across the app. Verified with a real
  before/after headless-browser mobile screenshot pass, plus a desktop-
  layout regression check and an offline-reload regression check.
- (Carried) Offline + PWA: installable manifest, cache-first service
  worker, offline/update banners.
- (Carried) Backup + Restore.
- (Carried) Export (Reports): CSV download and Print/Save-as-PDF.
- (Carried) Reports: date-range selection, totals, payment breakdown,
  product performance.
- (Carried) Sales History dashboard, full sale list with
  search/detail/delete/notes.
- (Carried) product/category/payment-method management, POS grid +
  cart, sales recording with price/name snapshots, responsive app
  shell, IndexedDB schema, error boundary.
