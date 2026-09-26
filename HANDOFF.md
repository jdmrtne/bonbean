# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 8 — COMPLETE, and verified for real: this session had working npm
registry access AND a pre-installed headless Chromium, both for the
first time since Phase 4. The full toolchain ran (twice — once against
Phases 5–7's previously-unverified code, once again after this phase's
changes), and a real headless-browser click-through happened for the
first time in this project's history, which also caught and fixed one
real pre-existing bug. See "Testing Status" for the full detail.

## Overall Project Progress

```
PHASE 0  — Project Foundation           — COMPLETE
PHASE 1  — Database + Product Mgmt      — COMPLETE
PHASE 2  — POS + Cart                   — COMPLETE (pending human verification; headless click-through done this session, see Phase 8 notes)
PHASE 3  — Sales Recording              — COMPLETE (automated checks passed Phases 4 and 8's sessions; headless click-through done Phase 8)
PHASE 4  — Sales History + Dashboard    — COMPLETE (automated checks passed Phases 4 and 8's sessions; headless click-through done Phase 8)
PHASE 5  — Reports                      — COMPLETE (automated checks passed for the first time this session — see Testing Status; pending human click-through)
PHASE 6  — Excel + PDF Export           — COMPLETE (automated checks passed for the first time this session; pending human click-through of the actual CSV/print output)
PHASE 7  — Backup + Restore             — COMPLETE (automated checks passed AND the real-IndexedDB restore round-trip was finally run — both in smoke-test AND in a live headless-browser click-through this session)
PHASE 8  — Offline + PWA                — COMPLETE (full toolchain + a real headless-browser offline click-through done this session)
PHASE 9  — Polish + Mobile UX           — NOT STARTED
PHASE 10 — Final QA + Release            — NOT STARTED
```

**Important note on this session's environment:** unlike Phases 5, 6,
and 7 (no npm registry access), this session's container had a working
`npm install`, AND a headless Chromium already installed at
`/opt/pw-browsers` (Playwright's browser download CDN itself is NOT in
this environment's allowed network domains, so that pre-installed
binary was the only way a real browser was usable — don't assume a
future session can `npx playwright install` from scratch; check
`/opt/pw-browsers` first). This combination — working toolchain AND a
real browser — has not happened together before in this project. Don't
assume it'll be true next session either; always check both at the
start (see "Recommended First Steps").

## What Has Been Built

Everything from Phases 0–7 (app shell, routing, design tokens,
IndexedDB schema, Product/Category/Payment Method management, the POS
grid and cart, sales recording with price/name snapshots, Sales History
with a "Today" dashboard, Reports, CSV + print/PDF export, Backup +
Restore), **plus**, from Phase 8:

- `public/manifest.webmanifest` — see PROJECT_STATUS.md for the full
  field list. `start_url` is `/#/` to match `HashRouter`.
- `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`
  — rasterized from `public/favicon.svg` via `cairosvg` (pip-installed;
  no new npm dependency) + a Pillow compositing step for the maskable
  icon's safe-zone padding. Regenerate these from `favicon.svg` if the
  logo ever changes — they are NOT hand-maintained pixel art.
- `public/sw.js` — hand-written service worker. See "Current
  Architecture" below for the caching strategy and "Decisions Already
  Made" for why it's hand-written instead of `vite-plugin-pwa`.
- `src/pwa/registerServiceWorker.ts` — registration + update-available
  event bridge (`coffee-cart-pos:sw-update-available` on `window`).
  Deliberately not a React hook — see its own header comment.
- `src/hooks/useOnlineStatus.ts`, `src/hooks/useServiceWorkerUpdate.ts`
  — thin hooks over browser APIs / the above event.
- `src/components/StatusBanners.tsx` — offline / update-available
  banner, mounted once in `AppShell.tsx` above the routed content.
- `index.html` — manifest link, apple-touch-icon, iOS PWA meta tags.
- `src/main.tsx` — `registerServiceWorker()` call, gated on
  `import.meta.env.PROD`.
- `src/styles/components.css` — `.banner--offline`, `.banner--update`,
  `.app-status-banner`.
- **Bug fix, not a Phase 8 feature**: `src/styles/layout.css` gained a
  `.app-sidebar { display: none; }` base rule. This was a pre-existing
  bug from Phase 0/2 (the sidebar had no mobile rule at all and
  rendered as unstyled overlapping links on any phone-width screen),
  found via this session's first-ever real mobile-viewport screenshot.
  See "Known Issues" for the cosmetic side effect this fix exposed
  (no app branding visible on the mobile topbar).
- `scripts/smoke-test-db.ts` — a short section 10 comment (intentionally
  no fake tests) explaining that offline/PWA code has no pure,
  dependency-free logic to extract, the same reasoning `utils/
  download.ts` (Phase 6) already established.

Still not built: general mobile polish beyond what this phase already
fixed (the sidebar bug) and beyond what Phases 0–7 already did
responsively. That's Phase 9.

## Current Architecture

Unchanged from Phases 0–7. Additions this phase:

- **The service worker is hand-written, not `vite-plugin-pwa`** — see
  "Decisions Already Made" for the full reasoning (the same
  no-new-npm-dependency trade-off Phase 6 made for PDF export, chosen
  again here since this project still can't rely on npm registry access
  being available session-to-session).
- **Caching strategy: cache-first for the app shell, populated at
  runtime, not from a precompiled precache manifest.** `sw.js`
  precaches a small fixed list of author-known, UNHASHED URLs on
  install (`/`, `/index.html`, `/manifest.webmanifest`, `/favicon.svg`,
  the two non-maskable icons). Everything else — the hashed Vite JS/CSS
  bundle, self-hosted Manrope font files — is cached opportunistically
  the first time each is actually fetched (cache-first: check cache,
  fall back to network and cache the response). This avoids needing a
  build-time step that knows Vite's hashed output filenames, at the
  cost of the very first-ever page load needing to be online (expected
  and fine — nobody can install/use the app before visiting it once).
- **Navigation requests are served from cached `/index.html`
  first.** `HashRouter` means every route (`/#/`, `/#/history`, etc.)
  is the same document — the hash fragment never reaches the network —
  so this one cache entry covers every route offline. Confirmed working
  in this session's click-through for `/#/`, `/#/products`, and
  `/#/history` while offline.
- **No automatic cache-busting.** `CACHE_VERSION` in `sw.js` is a
  hand-bumped string; `activate` deletes any cache whose name doesn't
  match the current version. A future phase that changes any cached
  file MUST bump this manually or stale assets could persist. This is
  a known, documented trade-off of not using a build-integrated PWA
  plugin — see "Known Issues".
- **Update flow: manual, not silent.** The service worker never calls
  `self.skipWaiting()` on its own. `registerServiceWorker.ts` detects a
  new worker reaching the "installed" state while an old one is still
  controlling the page, and dispatches a window event;
  `StatusBanners.tsx` shows a "Reload to update" banner; only clicking
  it posts `SKIP_WAITING` to the waiting worker, which triggers
  `controllerchange`, which triggers exactly one `window.location.
  reload()`. This was a deliberate choice so a new deploy can never
  silently interrupt an in-progress sale on the POS screen. Confirmed
  by code review and by manually checking `registration.waiting`/
  `installing` state via `page.evaluate` in this session's
  click-through (a real second-deploy update was NOT tested — see
  "Known Issues" — but the underlying mechanism was exercised as far as
  a single-build test setup allows).
- **This reload is unrelated to `BackupManager.tsx`'s own
  `window.location.reload()` after a restore (Phase 7).** They don't
  interact: a restore's reload is a normal page reload with no
  `SKIP_WAITING` message involved, so it just re-renders from
  whatever's currently cached/live — confirmed directly in this
  session's click-through (restored a backup while an update was NOT
  pending; no interference observed).
- **The offline/update banner is one component (`StatusBanners.tsx`),
  mounted once in `AppShell.tsx`**, not threaded through every page.
  Offline takes priority over showing the update prompt (no point
  offering a reload that can't fetch the new version anyway).

## DO NOT CHANGE

Everything in Phases 0–7's version of this section still applies
(price/name snapshot rule, `utils/reportStats.ts`/`utils/csv.ts`/
`utils/salesExport.ts`/`utils/backup.ts` not importing `database/db.ts`,
`restoreBackup`'s full-replace behavior, the backup JSON's top-level key
names). Additionally, as of Phase 8:

- Don't add `self.skipWaiting()` to `sw.js`'s `install` handler, and
  don't have `registerServiceWorker.ts` auto-apply an update without
  the person clicking the banner. This is a deliberate safety choice
  (see "Current Architecture") — a silent takeover could interrupt an
  in-progress sale.
- Don't switch the caching strategy away from cache-first for the app
  shell without a real reason — this app's whole point is working with
  unreliable connectivity, so a network-first or stale-while-revalidate
  strategy that requires a round-trip before showing content would work
  against that goal.
- Don't forget to bump `CACHE_VERSION` in `public/sw.js` when changing
  any cached file in a future phase — there is no automatic cache
  invalidation.
- Don't regenerate the manifest icons by hand-editing the PNGs directly
  — regenerate from `public/favicon.svg` (see the icon files' origin
  above) so they stay in sync with the actual logo.
- Don't remove the `.app-sidebar { display: none; }` base rule added
  this phase (in `layout.css`, just above the desktop media query) —
  it fixes a real broken-mobile-nav bug; removing it reintroduces
  unstyled overlapping navigation links on every phone-width screen.

## Next Phase

**PHASE 9 — Polish + Mobile UX.** See `NEXT_PHASE_PROMPT.md` for the
exact brief.

## Recommended First Steps

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. **Check environment capabilities FIRST, don't assume**: try
   `npm ping` / `npm install`, and check for a headless browser at
   `/opt/pw-browsers` (or wherever `PLAYWRIGHT_BROWSERS_PATH` points —
   `echo $PLAYWRIGHT_BROWSERS_PATH`) before deciding what's possible
   this session. This session had BOTH for the first time since Phase
   4 — don't assume that persists, and don't assume it's absent either.
3. If npm access works, run `npm install && npx tsc -b && npm run
   build && npx oxlint && npm run smoke-test` before writing any Phase
   9 code, same as always. Everything was clean as of this handoff, but
   confirm it's still clean before building on top of it.
4. If a headless browser is available, USE IT — this session's
   click-through caught a real bug (the mobile sidebar) that six
   phases of code review missed. For Phase 9 (mobile UX polish)
   specifically, a real mobile-viewport screenshot pass is directly
   relevant to the phase's own goal, not just a nice-to-have.
   Specifically worth checking:
   - The mobile topbar branding gap left open this phase (see "Known
     Issues") — decide whether/how to show the "Coffee Cart" brand on
     mobile now that the sidebar bug is fixed and it's no longer
     accidentally visible there.
   - A real second-deploy update-banner flow, if practical to set up
     (build once, change something trivial, build again behind the
     same preview server, confirm the banner appears in an already-open
     tab and "Reload to update" works) — this was reasoned about and
     partially checked this session but never fully end-to-end tested.
5. Check the original master spec's Phase 9 section for what belongs
   there (likely: responsive/touch refinements beyond what's already
   responsive, loading states, animations/transitions, empty-state
   polish, and anything else "polish" scoped to this app).
6. Update `PROJECT_STATUS.md`, `HANDOFF.md`, and replace
   `NEXT_PHASE_PROMPT.md` with Phase 10 instructions before stopping.

## Testing Status

| Check | Result |
|---|---|
| `npm install` | ✅ Succeeded — 41 packages, 0 vulnerabilities |
| `npx tsc -b` | ✅ Clean — run both BEFORE this phase's changes (verifying Phases 5–7's TypeScript for the first time) and AFTER (verifying this phase's new files) |
| `npm run build` (`vite build`) | ✅ Succeeded both times; confirmed `dist/manifest.webmanifest`, `dist/sw.js`, and `dist/icons/*.png` all present as expected |
| `npx oxlint` | ✅ 0 errors both times. 5 pre-existing warnings, all in Phase 1–4 files (`ProductsManager.tsx`, `PaymentMethodsManager.tsx`, `CategoriesManager.tsx`, `HistoryPage.tsx`), unrelated to Phases 5–8, zero new warnings introduced |
| `npm run smoke-test` | ✅ ALL assertions passed, including — for the first time ever — section 9's real-IndexedDB backup/restore round-trip |
| Real headless-browser click-through (Playwright/Chromium, pre-installed at `/opt/pw-browsers`) | ✅ Done for the first time in this project's history. Added a category + product, rang a real sale with correct cash-received validation, confirmed Sales History/dashboard totals, exported a real backup and inspected its JSON, went offline and confirmed the full app shell + all routes + a SECOND real IndexedDB write (another sale) all worked with zero network, went back online and restored the FIRST backup, and confirmed the app correctly discarded the offline-only sale (full-replace restore verified end-to-end for real, not just in a mocked unit test) |
| Chrome `Page.getInstallabilityErrors` (via CDP) | ✅ Returned an empty array — manifest + service worker meet Chrome's baseline install criteria |
| Mobile-viewport screenshot (390×844, online and offline) | ✅ Done; found the `.app-sidebar` mobile bug (see "Current Architecture"/"Known Issues"), fixed it, re-verified with a second screenshot |
| Update-banner flow (`updatefound` → banner → `SKIP_WAITING` → reload) | ⚠️ Code-reviewed and the waiting/installed state was inspected via `page.evaluate`, but a REAL second-deploy update was not exercised end-to-end this session (would need two builds served behind the same origin with a tab already open) — see "Known Issues" |
| Real mobile DEVICE testing (vs. desktop-browser viewport emulation) | ❌ Not done — touch interactions, real "Add to Home Screen" on iOS/Android, and real intermittent connectivity (vs. Playwright's instant toggle) remain unverified |
| Confirmed Phase 0–7 functionality unbroken | ✅ Confirmed by BOTH the smoke-test suite passing AND the click-through actually using POS/checkout, History, and Backup/Restore live in a browser — the strongest confirmation this project has had since Phase 4 |

## Known Issues

- **The mobile topbar shows no app branding.** `app-topbar` only ever
  rendered the tagline ("Sales recording, made simple"); the "Coffee
  Cart" brand + icon live in `.app-sidebar__brand`, which is (now
  correctly) hidden on mobile. Before this phase's bug fix, the brand
  was accidentally visible (as broken, unstyled overlapping text) on
  mobile; now it's correctly hidden along with the rest of the broken
  sidebar, but that leaves no branding on the phone screen at all.
  Cosmetic only — natural fit for Phase 9.
- **`CACHE_VERSION` in `public/sw.js` requires a manual bump** on any
  deploy that changes a cached file — no automatic cache-busting exists
  without adding a build-integrated PWA plugin (a deliberate trade-off,
  see "Decisions Already Made"). Easy to forget; worth a code-review
  checklist item for future phases.
- **The update-banner flow was not tested end-to-end with a real
  second deploy** — see "Testing Status". The mechanism is standard and
  was checked as far as a single-build session allows (waiting/
  installed worker states inspected directly), but nobody has watched
  an already-open tab actually show the banner after a real new
  version was deployed and clicked "Reload to update".
- Real mobile DEVICE testing remains outstanding (headless-browser
  viewport emulation is not the same as a real phone) — see "Testing
  Status".
- (Carried from Phase 7) No format-version migration path for backup
  files — `validateBackupFile` rejects anything that isn't exactly
  `formatVersion: 1`.
- (Carried from Phase 7) The native file-picker UI
  (`accept="application/json,.json"`) hasn't been checked on a real
  mobile browser's file picker specifically (only in headless Chrome's
  emulated mobile viewport, which uses the desktop file picker).
- (Carried from Phase 6) No PDF-generation library; "PDF export" is
  `window.print()` + a print stylesheet — reasoned about, not
  click-tested this session (the click-through this session focused on
  Backup/Restore and offline, since those were the highest-priority
  gaps; Export's actual print/PDF output is still only code-reviewed).
- (Carried from Phase 6) CSV export doesn't add a UTF-8 BOM.
- (Carried from Phase 5) "This month"/"Last month" use the local system
  clock's calendar month boundaries (not UTC).
- (Carried from Phase 4) Top products in the "Today" dashboard are
  quantity-only by design; Reports offers both quantity and revenue.
- (Carried from Phase 3) "Cash" detection is by payment-method name
  match, not a stored flag.
- (Carried from Phase 2) No confirmation dialog before "Clear cart".
- (Carried from Phase 2) Cart state is in-memory only.
- (Carried from Phase 1) No dedicated settings UI beyond what
  Backup/Restore added to the Products page.

## Decisions Already Made

Carried from Phases 0–7 (still true, don't change without good reason):
IndexedDB over localStorage; `HashRouter`; plain CSS; self-hosted
Manrope; `SaleItem` snapshot pattern; soft-delete-only; no confirmation
dialogs for reversible one-tap actions; cart stays in memory; cash
detection by name match; range-aggregation logic in
`utils/reportStats.ts`; no PDF-generation library (browser print
instead); Backup/Restore is a full replace, lives as a "Backup" tab on
`ProductsPage.tsx`; `utils/backup.ts` stays dependency-free.

New in Phase 8:

- **Hand-written service worker instead of `vite-plugin-pwa` or any
  other PWA build plugin.** Same reasoning Phase 6 applied to PDF
  export: this project has repeatedly gone multiple sessions without
  npm registry access, and a service worker is a well-documented,
  dependency-free browser API that doesn't need a build plugin to hand-
  write correctly. Reversible if a future session with reliably-working
  npm access wants the extra convenience (auto-generated precache
  manifests, etc.) — but not a default assumption.
- **Cache-first for the app shell, with runtime-populated caching**
  (not a precompiled precache list) — see "Current Architecture" for
  the full reasoning (Vite's hashed filenames aren't known at author
  time without build-integrated tooling).
- **Manual update flow (a banner + explicit reload), never a silent
  `skipWaiting()`** — see "Current Architecture"/"DO NOT CHANGE". This
  protects an in-progress sale from being interrupted by a background
  update.
- **Icons are rasterized from `favicon.svg` via `cairosvg` (pip) +
  Pillow, not hand-authored PNGs or a new npm image-processing
  dependency.** `pythonhosted.org`/`pypi.org` were reachable this
  session even though the npm registry access is separate — worth
  remembering as another way to generate assets without adding to
  `package.json` if a future phase needs similar rasterization/image
  work and npm access is down again.
- **The pre-existing mobile sidebar bug was fixed as part of this
  phase**, even though it's not an offline/PWA feature, because it was
  discovered BY this phase's own click-through work and is a one-line,
  low-risk, high-value fix (broken navigation on every phone screen).
  This is a deliberate, narrow exception to "only fix bugs that block
  the current phase" — it doesn't block Phase 8's own functionality,
  but leaving a freshly-discovered, trivially-fixable, high-visibility
  bug undocumented-and-unfixed when the fix was already verified working
  seemed like the wrong call. The cosmetic side effect it exposed (no
  mobile branding) was deliberately NOT also fixed, to avoid scope
  creep into what's really Phase 9's territory.

## Important Files

Everything in Phases 0–7's handoff still applies. New this phase:

`public/manifest.webmanifest`
→ New. Web app manifest — name, icons, `start_url: "/#/"`, `display:
"standalone"`, theme colors matching `theme.css`.

`public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`
→ New. Rasterized from `public/favicon.svg` — regenerate from there if
the logo changes, don't hand-edit these PNGs.

`public/sw.js`
→ New. Plain JS (not compiled by tsc/Vite — served as-is from
`public/`, can't import from `src/`). Cache-first service worker; see
"Current Architecture" for the full strategy. `CACHE_VERSION` constant
must be bumped on future deploys that change cached files.

`src/pwa/registerServiceWorker.ts`
→ New. `registerServiceWorker()`, `isServiceWorkerUpdateAvailable()`,
`applyServiceWorkerUpdate()`, and the `SW_UPDATE_EVENT` constant.

`src/hooks/useOnlineStatus.ts`, `src/hooks/useServiceWorkerUpdate.ts`
→ New. Thin React hooks over `navigator.onLine`/`online`/`offline`
events and the update-available window event, respectively.

`src/components/StatusBanners.tsx`
→ New. Offline / update-available banner. Mounted in `AppShell.tsx`.

`src/components/AppShell.tsx`
→ Extended (not rewritten): renders `<StatusBanners />` above
`<Outlet />` inside `<main className="app-main">`.

`src/styles/layout.css`
→ Extended: added `.app-sidebar { display: none; }` base rule (bug
fix, see "Known Issues"/"Decisions Already Made" above).

`src/styles/components.css`
→ Extended: `.banner--offline`, `.banner--update`, `.app-status-banner`.

`index.html`
→ Extended: manifest link, apple-touch-icon, iOS PWA meta tags.

`src/main.tsx`
→ Extended: `registerServiceWorker()` call gated on
`import.meta.env.PROD`.

`scripts/smoke-test-db.ts`
→ Extended with a short section 10 comment (no fake tests — offline/PWA
code is browser-API-only, same reasoning as `utils/download.ts`).

## Database Structure

Unchanged from Phase 1 — Phase 8 touches no IndexedDB schema or logic.
This was actually exercised for real this session: the click-through's
offline sale wrote to the same six stores while the network was
disabled, with no special-casing needed, confirming Phase 8's own
framing (IndexedDB was always offline-capable; only the app shell
needed work).

## Completed Features

- Offline + PWA (this phase): installable web app manifest, a
  cache-first service worker covering the full app shell, an
  offline-status banner, and a manual update-available banner. Verified
  working end-to-end via a real headless-browser click-through,
  including a real offline sale write and a real full-replace restore
  round-trip.
- (Carried) Backup + Restore (Products → Backup tab).
- (Carried) Export (Reports): CSV download and Print/Save-as-PDF.
- (Carried) Reports: date-range selection, totals, payment breakdown,
  product performance.
- (Carried) Sales History dashboard, full sale list with
  search/detail/delete/notes.
- (Carried) product/category/payment-method management, POS grid +
  cart, sales recording with price/name snapshots, responsive app
  shell (now with the mobile sidebar bug fixed), IndexedDB schema,
  error boundary.
