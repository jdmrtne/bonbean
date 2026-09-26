# CONTINUE COFFEE CART POS DEVELOPMENT

You are continuing an existing Coffee Cart POS project.

DO NOT rebuild the application from scratch.

First:

1. Read README.md
2. Read PROJECT_STATUS.md
3. Read HANDOFF.md IN FULL — especially "Testing Status" AND the note at
   the top of "Current Phase". Phases 5, 6, AND 7's sessions all had NO
   npm registry access, so `npm install`, `tsc -b`, `build`, `oxlint`, and
   the real `smoke-test` suite have not been run against the actual
   project dependencies since Phase 4. Only each phase's dependency-free
   pure logic was actually executed (via a standalone script with the
   globally-available `tsx`, which needs no `node_modules`). Treat ALL of
   Phase 5's, Phase 6's, AND Phase 7's TypeScript as genuinely unverified
   by the project's toolchain until you've run it yourself in step 6.
   This now spans THREE full phases of unverified `ReportsPage.tsx` (5/6)
   and `backupService.ts`/`BackupManager.tsx`/`ProductsPage.tsx` (7)
   changes.
4. Read this file (NEXT_PHASE_PROMPT.md)
5. Inspect the existing source code, especially:
   - `src/services/backupService.ts` and `src/utils/backup.ts` (PHASE 7)
     — Restore is a full-replace, multi-store-transaction write; if
     Phase 8's offline caching or service-worker registration touches
     app startup/reload behavior, check it doesn't fight with
     `BackupManager.tsx`'s `window.location.reload()` after a restore.
   - `src/database/db.ts` — the six-store IndexedDB schema Phase 8's
     offline story needs to keep working exactly as-is (offline/PWA is
     about the app SHELL — HTML/JS/CSS/fonts — being available without a
     network connection; IndexedDB access itself is already fully
     offline-capable and does not need caching).
   - `index.html`, `vite.config.ts`, and `public/` — what a service
     worker/manifest addition needs to hook into. There is currently no
     manifest, no service worker, and no install prompt handling
     anywhere in this project; Phase 8 is greenfield here.
   - `src/main.tsx` and `src/App.tsx` — where service-worker registration
     would be wired up, and whether this project's existing
     `ErrorBoundary.tsx` needs to account for offline/update-related
     errors.
6. Run `npm install && npx tsc -b && npm run build && npx oxlint && npm
   run smoke-test`. **This is more important than usual**: if this
   container has working npm registry access (unlike Phases 5, 6, and 7),
   this is the FIRST time in three phases that any of this code will
   actually be type-checked, linted, and smoke-tested. Fix anything that
   comes up — don't assume Phase 5's, 6's, or 7's code is clean just
   because each was carefully reviewed; carefully-reviewed unverified
   code is still unverified, three times over now. **Pay special
   attention to `smoke-test-db.ts` section 9** (Backup + Restore) — it
   includes a real-IndexedDB build-then-restore round-trip that has never
   actually run; if `restoreBackup`'s multi-store transaction has any
   issue, this is where it will surface for the first time. If your
   container ALSO lacks npm registry access, say so plainly (as Phases 5,
   6, and 7 all did) rather than silently skipping these steps — don't
   let this become a fifth or sixth consecutive phase where the real
   toolchain never actually runs.
   Then run `npm run dev` and manually click through — with Backup/
   Restore as the TOP priority, since it's the first destructive action
   in this app and has never been watched run in a real browser: export
   a real backup, inspect the downloaded JSON, then restore it (ideally
   after changing some data first, so it's a real round-trip) and confirm
   the app reflects the restored state. Then a few full sales on the POS
   screen, Sales History, every Reports control, and the Phase 6 Export
   buttons (actually open the downloaded CSV in a spreadsheet app and
   look at the print/PDF output). This manual pass has not been done for
   ANY phase since Phase 1.

Current phase:

PHASE 8

Previous phases completed:

PHASE 0 — Project Foundation
PHASE 1 — Database + Product Management
PHASE 2 — POS + Cart
PHASE 3 — Sales Recording
PHASE 4 — Sales History + Dashboard
PHASE 5 — Reports
PHASE 6 — Excel + PDF Export
PHASE 7 — Backup + Restore

Your task is to implement:

## PHASE 8 — OFFLINE + PWA

This is a client-side, offline-first app whose DATA layer (IndexedDB) is
already fully offline-capable — Phase 8 is about making the APP SHELL
(HTML/CSS/JS/fonts/icons) load and work without a network connection,
and about making the app installable as a standalone PWA on a phone or
desktop, which is the master spec's stated target usage (a coffee cart
owner running this from a phone/tablet, likely with unreliable
connectivity).

### What to add

- **A web app manifest** (`public/manifest.webmanifest` or similar):
  `name`/`short_name` ("Coffee Cart POS" / whatever fits), `start_url`,
  `display: "standalone"`, `background_color`/`theme_color` matching
  this project's existing design tokens (see `src/styles/theme.css`),
  and icons. Check `public/favicon.svg` — decide whether it's usable
  as-is for manifest icons or whether PNG icons at standard sizes
  (192x192, 512x512) need to be generated, and how to generate them
  without new heavy dependencies given this environment's npm-access
  history (a simple script rasterizing the existing SVG, or hand-crafted
  simple PNGs, is preferable to adding an image-processing library on
  spec).
- **A service worker** that caches the app shell (the built JS/CSS
  bundle, fonts, the manifest, icons) so the app loads with no network
  connection after the first successful load. Decide on a caching
  strategy (cache-first for the shell is the obvious default for a
  small, infrequently-updated bundle; consider whether Reports/Export/
  Backup need anything special — they don't touch the network at all
  today, so they should already work offline once the shell itself
  does).
  - Consider whether to hand-write the service worker or use Vite's PWA
    plugin ecosystem (`vite-plugin-pwa` etc.) — the latter is the
    "normal" way to do this in a Vite project, but is a NEW npm
    dependency, and this project has now gone FIVE sessions without
    working npm registry access. Weigh that same trade-off Phase 6 made
    for PDF generation (no new library, hand-rolled instead) against how
    much a hand-written service worker/manifest costs in this specific
    case — a service worker is a well-documented, dependency-free
    browser API, so hand-writing one may be more in keeping with this
    project's established pattern than adding tooling that then can't be
    verified via a real `npm install` either. Make a decision, document
    it (same as Phase 6 documented the no-PDF-library decision), and
    flag it as reversible if a future session with working npm access
    disagrees.
- **An update strategy.** A cached-forever service worker can trap users
  on a stale version of the app. Decide how new deploys are picked up —
  e.g. a "new version available" banner/prompt, or a silent
  update-on-next-load — and document the choice. Consider interaction
  with `BackupManager.tsx`'s existing `window.location.reload()` call
  after a restore (Phase 7) — a service-worker update check on reload
  should not fight with or delay that reload.
- **Installability**: confirm (by reasoning about the manifest/service-
  worker requirements, since there's no headed browser to click
  "Install" in this environment) that the manifest + service worker
  combination meets the baseline installability criteria (valid manifest
  with required fields, a registered service worker, HTTPS or localhost
  — note that this sandboxed environment can't verify the actual
  install prompt firing; that's a manual click-through item, like
  everything else in this project so far).
- **Offline indicator (optional but recommended)**: consider whether the
  app should show any UI feedback when it detects it's offline
  (`navigator.onLine` / `online`/`offline` events) — even just a small
  banner — versus staying silent, since the whole point is that the app
  should keep working seamlessly either way. Use your judgment on
  whether this adds real value or just clutter; if you skip it, say why.

### Constraints

- Do not break existing functionality: Product Management (Phase 1), the
  POS grid/cart (Phase 2), sales recording (Phase 3), Sales History +
  dashboard (Phase 4), Reports (Phase 5), Export (Phase 6), and Backup +
  Restore (Phase 7) must keep working exactly as they do now, both online
  and offline.
- `HashRouter` is already in use (see HANDOFF.md "Decisions Already
  Made") — confirm this plays well with a service worker's navigation
  handling (it should, since hash routes never hit the network for
  routing), and don't switch routers as part of this phase.
- Nothing about IndexedDB itself needs to change — it's already fully
  offline-capable. Don't add an additional offline-storage layer on top
  of it.

### After completing the phase

- If any new logic is extractable as pure/dependency-free (e.g. a small
  helper that decides which files to precache, or update-check logic),
  follow the existing pattern (`reportStats.ts`/`salesExport.ts`/
  `utils/backup.ts`) and add smoke-test coverage for it in
  `scripts/smoke-test-db.ts`, section 10. Service-worker registration/
  caching itself is browser-API-only and can't be smoke-tested the same
  way `download.ts` isn't — say so plainly rather than forcing a test
  that doesn't fit.
- Do the manual click-through described in step 6 above — for offline
  specifically (load the app once online, then simulate/go offline via
  the browser's dev tools or airplane mode and confirm it still loads
  and works, on both desktop and mobile) — and for Phases 2–7 if that
  still hasn't happened by the time you pick this up.
- Run `npx tsc -b`, `npm run build`, `npx oxlint`, and `npm run
  smoke-test`, and fix anything they flag. If your container can't reach
  the npm registry either, say so plainly in your own handoff.
- Update `PROJECT_STATUS.md`.
- Update `HANDOFF.md` (What Has Been Built, Important Files, Completed
  Features, Decisions Already Made, Known Issues, Testing Status).
- Replace this file (`NEXT_PHASE_PROMPT.md`) with instructions for
  PHASE 9 — Polish + Mobile UX.

Do NOT start Phase 9. Stop once Phase 8 is tested and documented, and
tell the project owner Phase 8 is ready for handoff.
