Project:
Coffee Cart POS

Current Phase:
PHASE 8 — Offline + PWA

Status:
COMPLETE — and, for the first time since Phase 4, VERIFIED FOR REAL.
This session's container had working npm registry access AND a
pre-installed headless Chromium (via Playwright, browsers already
present at `/opt/pw-browsers`) — the first time either has been true
since Phase 4. This means:

* `npm install`, `npx tsc -b`, `npm run build`, `npx oxlint`, and
  `npm run smoke-test` were ALL actually run against the real project
  dependencies — first for Phases 5–7's previously-unverified code
  (all clean), then again after this phase's changes (also all clean).
* A REAL headless-browser click-through was done for the first time in
  this project's history — see "Verification done" below. This finally
  exercised Phase 7's riskiest untested item (the full-replace restore
  round-trip) and this phase's offline behavior, with actual screenshots
  and DOM assertions, not just code review.
* One real, previously-undetected bug was found this way and fixed —
  see "Bug found and fixed" below.

Completed:

* `public/manifest.webmanifest` — `name`/`short_name`/`description`,
  `start_url: "/#/"` (matches `HashRouter`), `display: "standalone"`,
  `background_color`/`theme_color` matching `theme.css`'s tokens
  (`#f5f4f1` / `#23201b`), and three icons (192, 512, and a 512
  maskable variant with safe-zone padding).
* `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`
  — rasterized from the existing `public/favicon.svg` using `cairosvg`
  (installed via `pip`, no new npm dependency) plus a small Pillow
  composite step for the maskable variant's safe-zone padding.
* `public/sw.js` — a hand-written service worker (no `vite-plugin-pwa`
  or other new npm dependency — see "Decisions" in HANDOFF.md): a fixed
  precache list of unhashed, author-known URLs (`/`, `/index.html`,
  `/manifest.webmanifest`, `/favicon.svg`, the two non-maskable icons)
  on `install`, then cache-first for everything else at runtime
  (opportunistically caching whatever wasn't precached — this is how
  Vite's hashed build output ends up cached without a build-time
  precache manifest). Navigation requests are served from the cached
  `/index.html` first, matching `HashRouter`'s single-document model.
  Does NOT call `self.skipWaiting()` on install — a new version only
  takes over once the person taps the update banner's "Reload to
  update" button.
* `src/pwa/registerServiceWorker.ts` — registers `public/sw.js` (only
  called from `main.tsx` when `import.meta.env.PROD`, so `vite dev`'s
  own HMR is never fought with a cache-first worker), and dispatches a
  `coffee-cart-pos:sw-update-available` window event when a new worker
  is installed and waiting, plus `applyServiceWorkerUpdate()` (posts
  `SKIP_WAITING` to the waiting worker) for the update banner's button.
* `src/hooks/useOnlineStatus.ts` and `src/hooks/useServiceWorkerUpdate.ts`
  — small hooks wrapping `navigator.onLine`/the `online`/`offline`
  events, and the update-available event, respectively.
* `src/components/StatusBanners.tsx` — renders an offline banner
  ("You're offline — sales still record and save on this device.") or,
  when online and a new version is waiting, an update banner with a
  "Reload to update" button. Mounted once in `AppShell.tsx`, above the
  routed page content, so it's visible from every screen. Offline takes
  priority over the update prompt (no point offering a reload that
  can't fetch anything).
* `index.html` — added `<link rel="manifest">`, `<link
  rel="apple-touch-icon">`, and `apple-mobile-web-app-capable`/
  `apple-mobile-web-app-title` meta tags (iOS's manifest support is
  partial; these are still needed for a clean "Add to Home Screen").
* `src/main.tsx` — calls `registerServiceWorker()` guarded by
  `import.meta.env.PROD`.
* `src/styles/components.css` — `.banner--offline`, `.banner--update`,
  and `.app-status-banner` (sticky, full-width, sits right below the
  topbar).
* `scripts/smoke-test-db.ts` — a short section 10 comment (not fake
  tests) explaining why offline/PWA logic has no pure extractable logic
  to smoke-test, the same reasoning `utils/download.ts` (Phase 6) got.

Bug found and fixed (pre-existing, NOT introduced this phase):

* `src/styles/layout.css`'s `.app-sidebar` had NO default (mobile) rule
  — it was only styled inside the `@media (min-width: 860px)` block.
  On any phone-width screen, the sidebar (with the "Coffee Cart"
  brand and four nav links) rendered as an unstyled `<aside>` of
  default blue underlined links, stacked above the topbar, WHILE the
  intended bottom tab bar also rendered — duplicate, broken-looking
  navigation on every mobile screen, in every phase since Phase 0.
  Nobody had loaded this app in a real browser before this session, so
  it was never seen. Fixed with one rule: `.app-sidebar { display:
  none; }` above the desktop media query (mirroring how `.app-tabbar`
  is already hidden only inside that same media query). Verified fixed
  with a real 390×844 mobile-viewport screenshot, before and after.
* Side effect of the fix, NOT further addressed this phase (documented
  as a known cosmetic gap, not fixed, to stay in scope): with the
  sidebar correctly hidden on mobile, there is now NO visible "Coffee
  Cart" brand/logo anywhere on a phone screen — `app-topbar` only ever
  rendered the tagline ("Sales recording, made simple"), not the
  brand mark, which previously (accidentally) leaked in from the
  broken sidebar. Not a regression from working code — this brand gap
  existed since Phase 0/2, just masked by the sidebar bug. Left for a
  future phase (Phase 9's "Polish + Mobile UX" is the natural place).

Verification done (real toolchain + real browser, both available this
session for the first time since Phase 4):

* `npm install` — succeeded (41 packages, 0 vulnerabilities).
* `npx tsc -b` — clean, both BEFORE this phase's changes (verifying
  Phases 5–7's previously-unverified TypeScript for the first time) and
  AFTER.
* `npm run build` (`vite build`) — succeeded both times; confirmed
  `manifest.webmanifest`, `sw.js`, and `icons/` all land in `dist/` as
  expected (public/ files copy through as-is).
* `npx oxlint` — 0 errors both times. 5 pre-existing warnings, all in
  Phase 1–4 files (`ProductsManager.tsx`, `PaymentMethodsManager.tsx`,
  `CategoriesManager.tsx`, `HistoryPage.tsx` — `setState` synchronously
  inside a data-loading `useEffect`, a long-standing pattern), unrelated
  to Phases 5–8; zero new warnings from any of this phase's files.
* `npm run smoke-test` — ALL assertions passed, including, for the
  first time ever, section 9's real-IndexedDB backup/restore round-trip
  (Phase 7's biggest unverified risk).
* **A real headless-browser click-through**, via Playwright (Chromium
  already present at `/opt/pw-browsers` in this container — no network
  access to Playwright's CDN was needed or available) against a served
  `vite preview` build:
  - Added a category and a product, rang up a sale with a real cash
    amount, confirmed it in Sales History and the dashboard totals.
  - Exported a real backup file via the Backup tab and inspected its
    parsed JSON contents.
  - Went offline (`context.setOffline(true)`) and reloaded: the app
    shell, nav, and every route (`/#/`, `/#/products`, `/#/history`)
    still loaded fully, with the offline banner visible. Rang up a
    SECOND sale entirely offline and confirmed it wrote to IndexedDB
    and appeared in the dashboard (₱240 total / 2 transactions).
  - Went back online and restored the FIRST backup (taken before the
    offline sale) through the real file-input UI, confirmed via
    `window.confirm`, and verified Sales History afterward showed
    exactly the pre-offline-sale snapshot (₱120 / 1 transaction) — the
    offline-only sale was correctly discarded by the full-replace
    restore. This is real, first-ever confirmation that Phase 7's
    restore logic behaves correctly end-to-end, not just in a
    fake-indexeddb unit test.
  - Checked Chrome's own `Page.getInstallabilityErrors` via CDP:
    returned an empty array — the manifest + service worker meet
    Chrome's baseline install criteria.
  - Took a 390×844 mobile-viewport screenshot (both online and
    offline) and found/fixed the sidebar bug above.

Current functionality:

* Everything from Phases 0–7 (POS/cart, sales recording, Sales History
  + dashboard, Reports, CSV + print/PDF export, Backup + Restore)
  confirmed unchanged and now confirmed WORKING both online and
  offline by a real click-through, not just code review.
* The app installs as a standalone PWA (manifest + service worker meet
  installability criteria) and loads fully offline after one successful
  visit — app shell, all four routes, and IndexedDB reads/writes
  (adding a sale, viewing history) all confirmed working with the
  network disabled.
* An offline banner appears on every screen while offline; an update
  banner appears when a new deployed version is waiting to activate.

Known bugs / verification gaps:

* **The mobile topbar has no visible app branding** — see "Bug found
  and fixed" above. Cosmetic only; navigation and functionality are
  unaffected (the bottom tab bar works correctly). Natural fit for
  Phase 9 — Polish + Mobile UX.
* **The service worker's cache version (`CACHE_VERSION` in
  `public/sw.js`) must be bumped manually on any deploy that changes a
  cached file** — there's no automatic content-hash-based cache
  busting without adding a build plugin (the same no-new-dependency
  trade-off Phase 6 made for PDF export). Documented in `sw.js`'s own
  header comment; easy to forget in a future phase.
* **The update banner's actual "new version" flow was reasoned about
  and code-reviewed, but not end-to-end tested** — that would require
  deploying two different builds behind the same origin and watching a
  live tab pick up the second one, which wasn't practical in this
  session's single-build test setup. The underlying browser mechanism
  (`updatefound` → `installed` + existing controller → banner →
  `SKIP_WAITING` → `controllerchange` → reload) is standard and
  code-reviewed, but flagged here as the one PWA piece not watched
  happen for real.
* Real mobile DEVICE testing (as opposed to a desktop browser's mobile
  viewport emulation) still hasn't happened — touch interactions,
  actual "Add to Home Screen" flows on iOS/Android, and real
  intermittent-connectivity behavior (as opposed to Playwright's
  instant online/offline toggle) remain unverified.
* (Carried, now largely addressed by this session's click-through, but
  worth re-confirming on a real device) Phase 7's file-input picker UI
  on a real mobile browser's native file picker.

Next phase:

PHASE 9 — Polish + Mobile UX
