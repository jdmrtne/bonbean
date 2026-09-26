# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 10 — COMPLETE (code + manual review), WITH ONE IMPORTANT CAVEAT:
this session had **no working npm registry access** (`npm install`
fails with a 403 on every package, including a plain `npm install
--dry-run`'s real counterpart — `--dry-run` itself misleadingly
succeeds since it doesn't actually fetch tarballs). No headless
Chromium click-through was possible either, since there was nothing to
build/serve. Every change below was written and verified by manual
code review (tracing every call site, checking types by hand against
`src/types/index.ts`, re-reading each edited file in full afterward) —
**not** by running `tsc`, `vite build`, `oxlint`, or `npm run
smoke-test`, and not by loading the app in a browser. This is a
meaningfully weaker verification bar than Phases 8/9 had. See "Testing
Status" below for exactly what was and wasn't possible, and treat this
phase as needing a real toolchain + browser pass before shipping,
same as Phase 8/9 would recommend for anything code-reviewed only.

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
PHASE 9  — Polish + Mobile UX           — COMPLETE (full toolchain + real headless-browser before/after mobile screenshot pass, Phase 9's session)
PHASE 10 — Final QA + Release           — COMPLETE (code review only — no npm registry or headless browser access this session; see "Current Phase" and "Testing Status")
```

**Environment note, carried forward from Phase 8/9's own note, UPDATED
this session:** unlike Phases 8 and 9, this session had **neither**
working `npm install` **nor** a headless browser it could actually use
(the Chromium binaries were present at `/opt/pw-browsers`, but with no
successful `npm install`, there was no built `dist/` to serve or point
them at). Don't assume either direction persists — check both fresh at
the start of any future work, exactly as every phase's "Recommended
First Steps" has said. If a future session regains registry access,
running the full verification stack (`npm install && npx tsc -b && npm
run build && npx oxlint src && npm run smoke-test`) before touching
anything else is the single highest-value thing it can do, since it
would be the first real compile/lint/test pass this phase's changes
have had.

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

**Plus, from Phase 10** (final QA + daily-use hardening — see the
"Current Phase" caveat above: written and reviewed by hand, not
compiler/test-verified this session):

- **Cart persistence.** New `cartDraft` IndexedDB store (7th store,
  `DB_VERSION` 2→3) holding a single flat `CartLine[]` under one fixed
  key, exactly like `settings`'s `SETTINGS_KEY` pattern. New
  `src/services/cartDraftService.ts` (`getCartDraft`/`saveCartDraft`/
  `clearCartDraft`). `src/hooks/useCart.ts` gained a `restore(lines)`
  method (wholesale replace, not a merge). `src/pages/PosPage.tsx` now
  loads the draft in the same mount effect that loads the catalog (its
  own try/catch so a draft-read failure can never block the catalog),
  hydrates the cart via `restore()` if one exists, and a second effect
  mirrors every `cart.lines` change back to the store — clearing it
  (not just writing `[]`) when the cart empties, which covers both a
  completed sale and an explicit "Clear cart" with the same code path.
  A `cartHydrated` boolean gates the persist effect so it can never fire
  with an empty initial cart before hydration has had a chance to run.
- **Clear-cart confirmation.** `src/components/CartPanel.tsx`'s "Clear
  cart" button now runs through a `handleClear()` that calls
  `window.confirm("Clear current order?\n\nAll items currently in the
  cart will be removed.")` before clearing — same confirmation
  convention this app already used for delete-sale and restore-backup
  (`window.confirm`, not a custom dialog component).
- **Cash payment configuration.** `PaymentMethod` (`src/types/index.ts`)
  gained a real `isCash: boolean` field, replacing the old
  name-must-be-"Cash" check. `database/db.ts`'s upgrade() backfills it
  for every existing payment method on the 2→3 migration (only a
  method literally named "Cash", case-insensitive, becomes `true`,
  matching the old behavior exactly); freshly-seeded defaults set it
  explicitly. `paymentMethodsService.ts`'s `addPaymentMethod`/
  `updatePaymentMethod` accept it. `PaymentMethodsManager.tsx` gained an
  "Accepts cash payments" toggle (shown for both new and existing
  methods) and a "Cash" badge in the list next to the name.
  `backupService.ts`'s `restoreBackup` backfills `isCash` the same way
  for any backup file that predates the field, so restoring an old
  backup behaves identically to upgrading an old database.
  `CheckoutModal.tsx` now reads `selectedMethod?.isCash` directly (the
  old `isCashMethod()` name-matching helper is gone) and a new
  `useEffect` resets `cashReceived`/`formError` on every payment-method
  selection change, so switching methods can never leave a stale cash
  amount or error behind.
- **Mobile: cart line long names.** `.cart-line__name` in
  `src/styles/components.css` now wraps (`overflow-wrap: anywhere`)
  instead of truncating with an ellipsis — the one concrete gap Phase 9
  left open (see its "Known Issues"). Everything else Phase 9 already
  fixed (touch targets, loading states, dialog sizing on small screens,
  numeric-input `inputMode`) was reviewed and found still solid; no
  other mobile changes were made.
- **Backup/restore, service worker, error handling — reviewed, not
  changed** (beyond the `isCash` backfill above): Phase 7's
  restore-safety flow (warn → confirm → validate → keep existing data
  on invalid input → reload after success) and Phase 8's service worker
  (cache-first, manual update banner, no `skipWaiting()`, old caches
  cleaned on activate) were already exactly what the Phase 10 brief
  asked for. Error handling across `salesService.ts`/`backupService.ts`/
  every manager component was reviewed call-site by call-site: every
  critical write is inside an atomic idb transaction, every catch
  block already surfaces a specific, non-crashing message and leaves
  prior data intact, and a failed sale never clears the cart (the user
  can just retry). No changes made here.
- `public/sw.js` — `CACHE_VERSION` bumped `"v3"` → `"v4"` (this phase's
  `components.css` change is a cached file).
- `scripts/smoke-test-db.ts` — two new sections: cash-configuration
  (`isCash` on seeded defaults, `addPaymentMethod`/`updatePaymentMethod`
  respecting it) and cart-draft persistence
  (`getCartDraft`/`saveCartDraft`/`clearCartDraft` round-tripping).
  Explicitly does NOT cover the real `DB_VERSION` 2→3 upgrade/backfill
  path (every DB this script opens starts fresh at v3) or
  `PosPage.tsx`'s own React hydrate/persist wiring — both documented
  in-file as manual-QA items, with the reasoning for why they're not
  automated here.

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

As of Phase 10:

- **`cartDraft` is a 7th IndexedDB store, structurally identical in
  spirit to `settings`** (out-of-line key, one fixed record) — see
  `services/cartDraftService.ts`. It is deliberately outside
  `backupService.ts`'s six-store backup/restore transaction: an
  unfinished cart isn't a completed record, so it's neither backed up
  nor wiped by a restore.
- **Cash handling now reads a stored flag (`PaymentMethod.isCash`)
  instead of string-matching the method's name.** This was the single
  most-flagged "Known Issue"/"Decision" carried across Phases 3–9 — see
  `types/index.ts`'s comment on the field, `database/db.ts`'s migration,
  and `backupService.ts`'s restore-time backfill for the three places
  this old behavior had to be preserved for existing data.
- **The cart-persistence hydrate/persist split lives entirely in
  `PosPage.tsx`, not in `useCart.ts`.** `useCart` stays exactly what it
  was — plain in-memory React state, now with one extra `restore()`
  escape hatch for the caller to hydrate it. This keeps the hook
  testable/reasoned-about without IndexedDB, matching the same
  "pure logic vs. IndexedDB" split this project uses elsewhere (e.g.
  `utils/reportStats.ts` vs. `services/backupService.ts`).

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

Additionally, as of Phase 10:

- Don't reintroduce name-based cash detection (matching a payment
  method's `name` against `"cash"`) anywhere new — always read
  `PaymentMethod.isCash`. The only two places a name-match is
  legitimately still allowed are the two backward-compatibility
  backfills themselves (`database/db.ts`'s migration,
  `backupService.ts`'s restore), which exist specifically to translate
  old name-only data into the new flag once.
- Don't let `cartDraft` become part of `backupService.ts`'s
  backup/restore transaction — this was a deliberate choice (see
  `restoreBackup`'s comment), not an oversight.
- Don't remove the `cartHydrated` guard in `PosPage.tsx` around the
  cart-persist effect, and don't reorder it to run before the
  cart-restore effect — either change reintroduces the exact bug this
  phase's cart persistence exists to prevent (an empty cart silently
  overwriting a real unfinished order on the very next reload).
- Don't bump `CACHE_VERSION` again without an actual cached-file change
  behind it (same rule as Phase 8/9, restated because this is now the
  third time it's mattered).

## Next Phase

**None — Phase 10 was the last phase in this project's plan.** This
session had no access to whatever the original master spec's exact
Phase 10 wording was (only this repo's own handoff chain — see
`NEXT_PHASE_PROMPT.md`'s history for how that chain describes itself),
so "Phase 10 is final" is inferred from the handoff chain's own
"Overall Project Progress" table always listing exactly 10 phases, not
independently confirmed against a master document this session could
read. If a real master spec exists elsewhere and says otherwise, defer
to it over this note. See `NEXT_PHASE_PROMPT.md` for a closing note
instead of a Phase 11 brief.

## Recommended First Steps

**For whoever picks this project up next** (a future Claude session, or
a human developer) — since there's no planned Phase 11, these are
"before you actually rely on this in a real shop" steps, not "start the
next phase" steps:

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. **Get a real toolchain pass on Phase 10's changes specifically** —
   this is the single most important item on this list. This session
   had no npm registry access, so none of Phase 10's code has been
   compiled, linted, or run yet:
   `npm install && npx tsc -b && npm run build && npx oxlint src && npm
   run smoke-test`. Pay particular attention to `src/database/db.ts`'s
   `upgrade()` (now `async`, with a new `await`-based migration loop —
   verify the idb transaction typing compiles cleanly) and
   `src/pages/PosPage.tsx`'s two new effects.
3. **Get a real browser pass, ideally on an actual phone**, covering
   Phase 10's own regression list from the brief: fresh app → add
   products → cart → refresh mid-order and confirm it restores →
   checkout → cash sale with change → history/reports update → export →
   backup → restore → offline → mobile layout → every confirmation
   dialog. `scripts/mobile-screens.mjs` can be adapted for the
   mobile-layout part.
4. If a headless browser is available, use it for final device/viewport
   QA across every page, both online and offline, plus a "does this
   feel done" pass.
5. Confirm the built `dist/` folder is a complete, correct static site
   ready to host anywhere (no backend/deployment pipeline exists for
   this project).

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

**Phase 10 (this session) — NONE of the above automated/browser checks
were possible; see "Current Phase" for why:**

| Check | Result |
|---|---|
| `npm install` | ❌ Failed — 403 Forbidden from the npm registry on every real package fetch (`--dry-run` misleadingly succeeds, since it never fetches a tarball) |
| `npx tsc -b` / `npm run build` / `npx oxlint src` / `npm run smoke-test` | ❌ Not run — no `node_modules`, nothing to run them with |
| Real headless-browser pass | ❌ Not done — no working build to serve, Chromium binaries present but unused |
| Manual code review of every changed file (types checked by hand against `src/types/index.ts`; call sites of every changed function/service traced; each edited file re-read in full after editing) | ✅ Done — see `PROJECT_STATUS.md`'s Phase 10 entry for the file-by-file detail |
| New smoke-test sections written (`isCash` config, cart-draft persistence) | ⚠️ Written, reasoned through by hand line-by-line, but **not executed** — first real run of them is whenever `npm run smoke-test` next works |

## Known Issues

**Resolved this phase** (kept here, struck through in spirit rather than
deleted, so the history of what used to be true is still visible):

- ~~(Carried from Phase 3) "Cash" detection is by payment-method name
  match, not a stored flag.~~ → Fixed: `PaymentMethod.isCash`, see
  "What Has Been Built".
- ~~(Carried from Phase 2) No confirmation dialog before "Clear
  cart".~~ → Fixed: `window.confirm` in `CartPanel.tsx`.
- ~~(Carried from Phase 2) Cart state is in-memory only.~~ → Fixed:
  `cartDraft` IndexedDB store, see "What Has Been Built".
- ~~**Cart line product names can still truncate at 390px** for a
  sufficiently long name~~ → Fixed: wraps instead of truncating now.

**New, from Phase 10:**

- **Nothing in this phase has been compiler/lint/test/browser-verified
  this session** — see "Current Phase" and "Testing Status" above. This
  is the most important open item, not a minor caveat: treat every
  Phase 10 change as "written and reasoned through carefully" rather
  than "confirmed working" until a real toolchain pass happens.
- **The real `DB_VERSION` 2→3 migration path (the `isCash` backfill for
  pre-existing payment methods) has only been verified by code review**,
  not by an automated test or a real upgrade of an actual Phase-9-or-
  earlier database. `scripts/smoke-test-db.ts`'s trailing comment
  explains why it isn't automated (every DB the script opens starts
  fresh at v3). Manual QA item: on a device with real pre-Phase-10
  data, confirm existing payment methods behave as expected after the
  app updates.
- **Hard delete for products/categories doesn't exist in this app at
  all** (soft-delete/deactivate only) — the Phase 10 brief's "Delete
  product"/"Delete category, if applicable" confirmation items are N/A
  by the app's existing design, not an oversight. If a future phase
  ever adds real hard-delete, it needs its own confirmation then.
- **"Reset/clear all application data" doesn't exist as a feature
  either** — same reasoning; nothing to confirm because there's nothing
  that does this.
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
- (Carried from Phase 1) No dedicated settings UI beyond Backup/Restore.
- (Carried, still true) Real mobile DEVICE testing remains outstanding
  — no headless browser was available this session either, so this is
  now three phases running without it.
- (Carried, still true) The update-banner flow still hasn't been tested
  end-to-end with a real second deploy.
- (Carried, still true) `LoadingState` has no minimum-display-time
  debounce.

## Decisions Already Made

Carried from Phases 0–8 (still true, don't change without good reason):
IndexedDB over localStorage; `HashRouter`; plain CSS; self-hosted
Manrope; `SaleItem` snapshot pattern; soft-delete-only; no confirmation
dialogs for reversible one-tap actions; range-aggregation logic in
`utils/reportStats.ts`; no PDF-generation library; Backup/Restore is a
full replace; hand-written service worker (no `vite-plugin-pwa`);
cache-first app shell; manual update flow (banner + explicit reload,
never silent `skipWaiting()`).

**Superseded by Phase 10** (were true through Phase 9, no longer true —
listed here so nobody re-reads an old phase's handoff and assumes
they still are): ~~cart stays in memory~~ (now persisted, see below);
~~cash detection by name match~~ (now `PaymentMethod.isCash`).

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

New in Phase 10:

- **Cart persistence uses a dedicated 7th store (`cartDraft`), not a
  new field bolted onto `settings`.** Keeps a fundamentally different
  kind of data (a mutable, transient draft vs. a stable settings
  record) in its own store, and keeps it trivially easy to exclude from
  backup/restore (see below) since it was never mixed in with settings
  in the first place.
- **`cartDraft` is deliberately excluded from backup/restore.** An
  unfinished cart isn't a completed, backup-worthy record — see
  `backupService.ts`'s `restoreBackup` comment.
- **`useCart.restore()` is a wholesale replace, not a merge**, matching
  `clear()`'s existing all-or-nothing shape rather than introducing a
  new partial-update pattern into a hook that's otherwise had none.
- **Confirmation for "Clear cart" reuses `window.confirm`**, matching
  every other destructive-action confirmation already in this app
  (delete-sale, restore-backup) rather than introducing a custom dialog
  component for one more case.
- **`isCash` defaults to `false` for a payment method with no explicit
  value**, both in `addPaymentMethod` (a brand-new method, PLUS the
  UI's own "Accepts cash payments" checkbox already defaults to
  unchecked) and everywhere else a value might be missing. The *one*
  exception, by design, is the two backward-compatibility backfills
  (DB migration, backup restore), which use a name match specifically
  to reproduce old behavior for old data, not as a general default.
- **The isCash toggle is shown for both new and existing payment
  methods** in `PaymentMethodsManager.tsx`, unlike the "Available at
  checkout" toggle (which only makes sense once a method already
  exists, since a brand-new one is always active) — these two toggles
  intentionally have different visibility rules for that reason.

## Important Files

Everything in Phases 0–8's handoff still applies. Changed in Phase 9
(unchanged since, still accurate):

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

`scripts/mobile-screens.mjs`
→ New. Not an npm script, not a project dependency-user. See its own
header comment before running it.

New/changed in Phase 10:

`src/types/index.ts`
→ Extended: `PaymentMethod` gained `isCash: boolean`.

`src/database/db.ts`
→ Extended: `DB_VERSION` 2→3; new `cartDraft` store (no keyPath, single
fixed key, like `settings`); `upgrade()` is now `async` with a new
`oldVersion < 3` branch that creates `cartDraft` and backfills `isCash`
onto every pre-existing payment method.

`src/services/cartDraftService.ts`
→ New. `getCartDraft`/`saveCartDraft`/`clearCartDraft` — thin wrappers
around the `cartDraft` store, same shape as `settingsService.ts`.

`src/hooks/useCart.ts`
→ Extended: new `restore(lines)` method (wholesale replace).

`src/pages/PosPage.tsx`
→ Extended: mount effect now also loads and hydrates the cart draft
(own try/catch, never blocks catalog loading); new second effect
persists `cart.lines` to `cartDraft` on every change, gated by a new
`cartHydrated` state flag.

`src/components/CartPanel.tsx`
→ Extended: "Clear cart" now runs through a `handleClear()` that
`window.confirm`s before clearing a non-empty cart.

`src/services/paymentMethodsService.ts`
→ Extended: `addPaymentMethod`/`updatePaymentMethod` accept `isCash`.

`src/components/PaymentMethodsManager.tsx`
→ Extended: new "Accepts cash payments" toggle in the form (both
add/edit); new "Cash" badge (reusing the existing `.badge--payment`
class) in the list row.

`src/components/CheckoutModal.tsx`
→ Changed: `isCashMethod()` name-matching helper removed; cash
detection now reads `selectedMethod?.isCash` directly. New `useEffect`
resets `cashReceived`/`formError` whenever `selectedMethodId` changes.

`src/services/backupService.ts`
→ Extended: `restoreBackup` backfills `isCash` on any payment method
from a backup file that predates the field (same rule as the DB
migration).

`src/styles/components.css`
→ Extended: `.cart-line__name` wraps instead of truncating
(`overflow-wrap: anywhere` replacing `overflow: hidden; text-overflow:
ellipsis; white-space: nowrap`).

`public/sw.js`
→ `CACHE_VERSION`: `"v3"` → `"v4"`.

`scripts/smoke-test-db.ts`
→ Extended: section 1's assertions now also check `isCash` on the
seeded defaults; two new sections (cash configuration, cart-draft
persistence); trailing comment extended to document what Phase 10
logic still isn't covered and why.

## Database Structure

Extended in Phase 10: `DB_VERSION` 2→3, adding a 7th store,
`cartDraft` (see `src/database/db.ts` and
`src/services/cartDraftService.ts`). `PaymentMethod` records gained an
`isCash: boolean` field (backfilled on upgrade for existing records).
Otherwise unchanged from Phase 1 — no other store's shape, keys, or
indexes changed.

## Completed Features

- **Final QA + daily-use hardening (this phase)**: persisted
  in-progress cart (survives refresh/reopen), a confirmation dialog
  before clearing a non-empty cart, cash-payment handling driven by a
  real per-method flag instead of name-matching (with full backward
  compatibility for existing data and old backups), and a mobile fix
  for long product names in the cart. Backup/restore, the service
  worker, and error handling were reviewed against the phase's brief
  and found to already meet it from prior phases. **Not** verified
  with a real toolchain or browser this session — see "Testing Status".
- Polish + Mobile UX (Phase 9): mobile app branding in the topbar,
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
