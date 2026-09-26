# CONTINUE COFFEE CART POS DEVELOPMENT

You are continuing an existing Coffee Cart POS project.

DO NOT rebuild the application from scratch.

First:

1. Read README.md
2. Read PROJECT_STATUS.md
3. Read HANDOFF.md IN FULL — especially "Testing Status" and "Known
   Issues". Phase 8's session had BOTH working npm registry access AND
   a pre-installed headless Chromium for the first time since Phase 4 —
   don't assume either is true for you; check both first (see step 6).
   Phase 8 finally ran the full toolchain against Phases 5–7's
   previously-unverified code (all clean) and did this project's first
   real headless-browser click-through, which found and fixed a
   genuine pre-existing bug (the mobile sidebar had no `display: none`
   rule and rendered as broken overlapping links on every phone-width
   screen since Phase 0/2).
4. Read this file (NEXT_PHASE_PROMPT.md)
5. Inspect the existing source code, especially:
   - `src/components/AppShell.tsx` and `src/styles/layout.css` — the
     app shell/nav structure Phase 9's mobile polish will mostly live
     in. Note the `.app-sidebar { display: none; }` base rule added
     Phase 8 (a bug fix, not a feature) — don't remove it.
   - `src/components/StatusBanners.tsx` — the offline/update banner
     Phase 8 added. If Phase 9 touches the topbar (e.g. to add mobile
     branding, see below), check this still renders correctly
     alongside whatever changes.
   - `public/sw.js` and `src/pwa/registerServiceWorker.ts` — Phase 8's
     hand-written service worker and update flow. If Phase 9 changes
     any cached file (CSS, the manifest, icons), remember to bump
     `CACHE_VERSION` in `sw.js` — there's no automatic cache-busting.
   - Every page component (`PosPage.tsx`, `HistoryPage.tsx`,
     `ReportsPage.tsx`, `ProductsPage.tsx`) and their CSS in
     `src/styles/components.css` — for whatever specific mobile/touch
     polish the master spec's Phase 9 section calls for.
6. Check environment capabilities before assuming anything: try
   `npm ping`, then `npm install`. Separately, check for a headless
   browser: `echo $PLAYWRIGHT_BROWSERS_PATH` and look for an existing
   Chromium install there (Phase 8's session found one pre-installed at
   `/opt/pw-browsers`, NOT downloaded — `npx playwright install` itself
   could NOT reach Playwright's CDN from that container, so don't
   assume a fresh install will work; check for a pre-existing one
   first). Report clearly which of the two you have, since it changes
   what you can verify this session.
7. If npm access works, run `npm install && npx tsc -b && npm run
   build && npx oxlint && npm run smoke-test` before writing any Phase
   9 code, and fix anything that comes up. Everything was clean as of
   Phase 8's handoff — confirm it's still true before building on top
   of it.
8. If a headless browser is available, USE IT for both before/after
   comparison and to verify your own Phase 9 changes — Phase 8's
   click-through caught a real bug that six phases of code review
   missed, and Phase 9 is specifically ABOUT mobile UX, so a real
   mobile-viewport screenshot pass is core to this phase's own goal,
   not an optional nice-to-have. At minimum: screenshot every page at
   a phone viewport (~390×844) before making changes, and again after,
   to confirm your polish actually improved things and didn't regress
   anything Phase 8 already fixed.

Current phase:

PHASE 9

Previous phases completed:

PHASE 0 — Project Foundation
PHASE 1 — Database + Product Management
PHASE 2 — POS + Cart
PHASE 3 — Sales Recording
PHASE 4 — Sales History + Dashboard
PHASE 5 — Reports
PHASE 6 — Excel + PDF Export
PHASE 7 — Backup + Restore
PHASE 8 — Offline + PWA

Your task is to implement:

## PHASE 9 — POLISH + MOBILE UX

This phase is about refining the experience on the primary target
device (a phone, per the master spec — a coffee cart owner running this
day-to-day), now that every feature (Phases 1–8) is functionally
complete and, as of Phase 8, has actually been verified working in a
real browser for the first time.

### What to address

- **The mobile branding gap Phase 8 left open** (see HANDOFF.md "Known
  Issues"): `app-topbar` shows only the tagline on mobile, with no
  "Coffee Cart" name/icon visible anywhere on a phone screen (the brand
  mark lives in `.app-sidebar__brand`, correctly hidden on mobile since
  Phase 8's bug fix). Decide how the mobile topbar should show identity
  — e.g. move a compact brand mark into `.app-topbar` itself for
  narrow viewports — and implement it.
- **A general mobile-viewport pass across every page**, using a real
  headless-browser screenshot check if available (see step 8 above):
  POS (product grid + cart, including the floating "VIEW ORDER" bar and
  the cart bottom sheet), History (dashboard cards + sale list +
  detail), Reports (date-range pills, controls, product performance
  list), Products (all four tabs, especially the Backup tab's
  buttons/file-picker touch targets). Look for anything that doesn't
  fit, wraps awkwardly, or has a touch target that's too small — this
  hasn't had real visual verification before Phase 8, so treat every
  page as worth a fresh look, not just the ones that seem likely to
  have issues.
- **Loading states**: several pages currently render nothing (`return
  null`) while their initial IndexedDB read is in flight — check
  `PosPage.tsx`, `HistoryPage.tsx`, `ReportsPage.tsx`,
  `ProductsManager.tsx`/`CategoriesManager.tsx`/
  `PaymentMethodsManager.tsx` for this pattern. On a fast device this is
  invisible, but decide whether a lightweight loading indicator is
  worth adding for slower devices/first-ever-offline-cache-population,
  and if so keep it consistent with the existing `EmptyState` component
  style rather than inventing a new pattern.
- **Empty-state polish**: `EmptyState` already exists and is used
  throughout — check whether every empty state (no products, no sales
  today, no categories, etc.) is worded and presented consistently, and
  whether any screen is missing one it should have.
- **Touch target sizing and spacing**: review buttons/icon-buttons
  (`.icon-btn`, category tabs, payment-method selection tiles) against
  standard touch-target guidance (roughly 44×44px minimum) now that
  real screenshots are possible to check against.
- Anything else the master spec's own Phase 9 section calls for that
  isn't covered above — check it explicitly, since this handoff can't
  see the original spec's exact wording.

### Constraints

- Do not break existing functionality: every feature from Phases 1–8
  must keep working exactly as verified in Phase 8's click-through, on
  both desktop and mobile, online and offline.
- Don't touch `public/sw.js`'s caching strategy or
  `src/pwa/registerServiceWorker.ts`'s update flow unless a specific
  Phase 9 change requires it — if you DO change any cached file
  (any CSS, the manifest, an icon), remember to bump `CACHE_VERSION` in
  `sw.js`, or the offline-cached version could keep serving stale
  assets.
- Don't remove or weaken the `.app-sidebar { display: none; }` base
  rule Phase 8 added — it fixes a real bug (see HANDOFF.md). If you
  redesign the mobile topbar/nav, keep the sidebar hidden on mobile
  (or replace it with a deliberately-designed mobile nav, not an
  accidental one).
- `HashRouter`, IndexedDB, the price/name snapshot pattern, and every
  "DO NOT CHANGE" item in HANDOFF.md remain in force.

### After completing the phase

- If any new logic is extractable as pure/dependency-free, add
  smoke-test coverage for it in `scripts/smoke-test-db.ts`, section 11.
  Most of Phase 9's likely work (CSS, loading-state UI, touch target
  sizing) is not extractable pure logic — say so plainly rather than
  forcing a test that doesn't fit, same as Phases 6 and 8 did for their
  own browser-only pieces.
- Run `npx tsc -b`, `npm run build`, `npx oxlint`, and `npm run
  smoke-test`, and fix anything they flag. If your container can't
  reach the npm registry, say so plainly in your own handoff, the same
  way Phases 5, 6, and 7 did.
- If a headless browser is available, do a real mobile-viewport
  screenshot pass — before and after your changes — the same way
  Phase 8 did, since it's how Phase 8 caught a real bug and this
  phase's whole purpose is mobile UX. If no headless browser is
  available, say so plainly and rely on careful CSS/markup review
  instead, same as Phases 1–7 had to.
- Update `PROJECT_STATUS.md`.
- Update `HANDOFF.md` (What Has Been Built, Important Files, Completed
  Features, Decisions Already Made, Known Issues, Testing Status).
- Replace this file (`NEXT_PHASE_PROMPT.md`) with instructions for
  PHASE 10 — Final QA + Release.

Do NOT start Phase 10. Stop once Phase 9 is tested and documented, and
tell the project owner Phase 9 is ready for handoff.
