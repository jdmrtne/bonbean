# CONTINUE COFFEE CART POS DEVELOPMENT

You are continuing an existing Coffee Cart POS project.

DO NOT rebuild the application from scratch.

First:

1. Read README.md
2. Read PROJECT_STATUS.md
3. Read HANDOFF.md IN FULL — especially "Testing Status" and "Known
   Issues". Phase 9 (mobile UX polish) added mobile app branding to the
   topbar, bumped several touch targets to 44px, added loading
   indicators to every page's initial data fetch, and fixed a
   cart-line layout side effect the touch-target change caused. It also
   found two environment wrinkles worth knowing before you start:
   - Run `npx oxlint src`, not bare `npx oxlint` — the bare form also
     lints `node_modules` and any stale `dist/` and buries real output
     under ~18,000 irrelevant warnings from React's own code.
   - If a headless Chromium is available at `$PLAYWRIGHT_BROWSERS_PATH`,
     its plain `chrome` binary may refuse to launch headless ("Old
     Headless mode has been removed") — use the sibling
     `chromium_headless_shell-*/chrome-linux/headless_shell` binary
     instead.
4. Read this file (NEXT_PHASE_PROMPT.md).
5. Inspect the existing source code — by this phase, that means
   *everything*, since Phase 10 is a full regression pass. Particularly:
   - `src/components/AppShell.tsx`, `src/styles/layout.css` — the
     mobile brand mark Phase 9 added; don't remove it or the
     `.app-sidebar { display: none; }` rule from Phase 8.
   - `src/components/LoadingState.tsx` and its six call sites — Phase
     9's loading-state pattern; reuse it if Phase 10 finds any other
     spot that could use one, rather than inventing a second pattern.
   - `public/sw.js` — remember to bump `CACHE_VERSION` if you touch any
     cached file (any CSS, the manifest, an icon, `index.html`).
   - `scripts/mobile-screens.mjs` — Phase 9's screenshot harness; its
     header comment explains how to actually run it (it needs
     `playwright-core`, which is NOT a project dependency, installed
     into a throwaway sibling directory — see the comment for why).
6. Check environment capabilities before assuming anything: try
   `npm ping`, then `npm install`. Separately check for a headless
   browser (see point 3's second bullet above for the binary wrinkle).
   Report clearly which of the two you have.
7. If npm access works, run `npm install && npx tsc -b && npm run
   build && npx oxlint src && npm run smoke-test` before writing any
   Phase 10 code, and fix anything that comes up. Everything was clean
   as of Phase 9's handoff.
8. If a headless browser is available, use it for this phase's actual
   job: a full regression click-through across every route, online and
   offline, at both a mobile and a desktop viewport. Phase 10 is
   explicitly the last chance to catch anything earlier phases' code
   review missed, the same way Phase 8's first-ever click-through
   caught the sidebar bug and Phase 9's caught the cart-line truncation
   side effect.

Current phase:

PHASE 10

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
PHASE 9 — Polish + Mobile UX

Your task is to implement:

## PHASE 10 — FINAL QA + RELEASE

Every feature phase (1–9) is now functionally complete and has had at
least some real-browser verification. This phase is about confirming
the whole app holds together as one product, not adding new features.

### What to address

- **Full regression pass across every phase's feature**, in one
  continuous session if practical: add categories/products/payment
  methods, ring up several sales with different payment methods and
  cash amounts, check the History dashboard and search, run Reports
  across a few different presets including Custom, export CSV and
  print/PDF, back up and then restore, go offline and confirm the app
  shell + a new sale still work, come back online. Do this at both a
  mobile viewport and a desktop viewport if a headless browser is
  available. This is the first time anyone will have exercised every
  phase's feature in a single continuous session rather than
  phase-by-phase.
- **Check every "Known Issues" item carried across phases** (see
  HANDOFF.md's "Known Issues" — there are quite a few now) and decide,
  for each, whether it's acceptable to ship as-is, needs a one-line
  README/UI disclosure, or is worth fixing now given it's the last
  phase. Don't silently drop any of them — each should get an explicit
  decision recorded in this phase's own HANDOFF.md update.
- **README.md pass**: confirm it accurately describes how to install,
  run, build, and deploy the app as it exists today (not as it existed
  at an earlier phase). Add anything a new developer or the project
  owner would need — e.g. how to actually host the built `dist/`
  folder somewhere (this is a static PWA with no backend, so "release"
  likely means "here's the dist folder, host it anywhere that serves
  static files over HTTPS" — confirm that's actually true and document
  it).
- **Confirm the production build is complete and correct**: `npm run
  build`, then inspect `dist/` directly — confirm `index.html`,
  `manifest.webmanifest`, `sw.js`, `icons/`, and the hashed JS/CSS
  bundle are all present and that `sw.js` in `dist/` matches
  `public/sw.js` (Vite copies `public/` as-is, but confirm it actually
  did). If a headless browser is available, serve `dist/` with `vite
  preview` and do a final click-through against the actual production
  build (not `vite dev`), including confirming Chrome's own
  `Page.getInstallabilityErrors` (via CDP) still returns empty, same as
  Phase 8 checked.
- **A release checklist**: write a short, concrete checklist (in
  README.md or a new `RELEASE.md`, your call) for the project owner —
  what to do to actually put a new build in front of the coffee cart
  owner (build, host, remember to bump `CACHE_VERSION` if anything
  cached changed, etc.).
- Anything else the master spec's own Phase 10 section calls for that
  isn't covered above — check it explicitly, since this handoff can't
  see the original spec's exact wording.

### Constraints

- Do not break existing functionality: every feature from Phases 1–9
  must keep working exactly as verified, on both desktop and mobile,
  online and offline.
- This phase should be conservative about new code — it's QA and
  release prep, not a tenth feature phase. Prefer fixing a confirmed
  bug over adding anything not already scoped above.
- Every "DO NOT CHANGE" item in HANDOFF.md remains in force, including
  Phase 9's additions (don't remove the mobile brand mark, don't shrink
  the touch targets back down, remember `CACHE_VERSION`).

### After completing the phase

- If any new logic is extractable as pure/dependency-free, add
  smoke-test coverage for it in `scripts/smoke-test-db.ts`, section 12.
  Most of Phase 10's likely work (regression testing, README/docs,
  build verification) is not new extractable logic — say so plainly if
  that's the case, same as Phases 6, 8, and 9 did for their own
  non-extractable work.
- Run `npx tsc -b`, `npm run build`, `npx oxlint src`, and `npm run
  smoke-test`, and fix anything they flag.
- If a headless browser is available, do the full regression
  click-through described above against the actual production build
  (`vite preview`, not `vite dev`), online and offline, and at both a
  mobile and desktop viewport. If no headless browser is available, say
  so plainly and rely on careful manual code/UI review instead.
- Update `PROJECT_STATUS.md` and `HANDOFF.md` to reflect the project's
  final state.
- **This is likely the last phase** per the master spec's phase list as
  known to this handoff chain (Phases 0–10). Check the original master
  spec to confirm whether a Phase 11 exists. If it does not, do not
  invent one — replace this file's content with a short closing note
  (project complete, where to find the final `PROJECT_STATUS.md`/
  `HANDOFF.md`, and how to hand it to the project owner) instead of a
  "NEXT PHASE" brief. If the master spec does define a Phase 11, write
  its brief here the same way this file was written for Phase 10.

Do NOT start any phase beyond 10 without first confirming (per the
above) that one is actually defined in the master spec. Stop once
Phase 10 is tested and documented, and tell the project owner Phase 10
is ready for handoff — and whether this was the final phase.
