# COFFEE CART POS — DEVELOPMENT HANDOFF

## Current Phase

PHASE 0 — COMPLETE

## Overall Project Progress

```
PHASE 0  — Project Foundation           — COMPLETE
PHASE 1  — Database + Product Mgmt      — NOT STARTED
PHASE 2  — POS + Cart                   — NOT STARTED
PHASE 3  — Sales Recording              — NOT STARTED
PHASE 4  — Sales History + Dashboard    — NOT STARTED
PHASE 5  — Reports                      — NOT STARTED
PHASE 6  — Excel + PDF Export           — NOT STARTED
PHASE 7  — Backup + Restore             — NOT STARTED
PHASE 8  — Offline + PWA                — NOT STARTED
PHASE 9  — Polish + Mobile UX           — NOT STARTED
PHASE 10 — Final QA + Release           — NOT STARTED
```

## What Has Been Built

A running, empty-shell React app:

- A 4-tab app shell (POS, History, Reports, Products) that adapts from a
  bottom tab bar on mobile to a left sidebar on desktop (breakpoint 860px).
- A small design-token system (colors, type, spacing, radius) so every
  later phase pulls from the same visual language instead of inventing new
  ad-hoc styles.
- Reusable primitives: `Button`, `Card`, `EmptyState`, `ErrorBoundary`.
- An IndexedDB connection that opens successfully on load (proven via a
  `useDbReady` hook that gates rendering until the DB is confirmed open or
  errored). The schema itself is just a placeholder `settings` store —
  Phase 1 replaces this with the real schema.
- Shared TypeScript types for the whole domain model (`src/types/index.ts`)
  so Phase 1 onward has one place to import `Product`, `Sale`, etc. from,
  rather than redefining shapes per-file.
- Each of the 4 routes renders a placeholder `EmptyState` naming which
  phase will build it out, so the shell is honest about what is and isn't
  real yet.

No business logic exists yet: no products, no cart, no sales, no reports.
This phase is infrastructure and shell only, by design.

## Current Architecture

- **Framework:** React 19, function components + hooks only (no class
  components except `ErrorBoundary`, which React requires to be a class).
- **Build system:** Vite 8, with `npm run build` running `tsc -b` (project
  references type-check) then `vite build`.
- **Language:** TypeScript, strict mode as scaffolded by Vite's
  `react-ts` template — do not loosen `tsconfig` strictness in later phases.
- **Database:** IndexedDB via the `idb` package (a small promise-based
  wrapper around the native IndexedDB API — not a heavier ORM). Chosen
  because sales history can grow large over time and localStorage is
  synchronous and size-limited.
- **Storage:** Everything lives in IndexedDB. No server, no API calls, by
  design — the app must work with zero network dependency (see Phase 8).
- **Routing:** `react-router-dom`, using `HashRouter` specifically (not
  `BrowserRouter`). This matters: a `BrowserRouter` needs server-side
  fallback routing to support deep links/refreshes, which a static,
  offline-installed PWA doesn't have. Do not switch this to `BrowserRouter`
  without re-solving that problem.
- **Styling:** Plain CSS with custom properties (design tokens), organized
  into `theme.css` (tokens + resets), `layout.css` (app shell), and
  `components.css` (buttons/cards/empty states/banners). No Tailwind, no
  CSS-in-JS, no component library. Tailwind was installed and then
  deliberately removed in this phase — see "Decisions Already Made" below.
- **Fonts:** `@fontsource/manrope` self-hosts the Manrope variable font as
  local files bundled by Vite, imported from `theme.css`. This was chosen
  over a Google Fonts `<link>` specifically so typography keeps working
  offline once Phase 8 adds the service worker — a CDN font would silently
  fail to load with no network.
- **Components vs. Pages:** `src/components/` holds things reused across
  more than one screen (or app-shell-level pieces). `src/pages/` holds one
  file per route, each rendering a full screen.

## Important Files

`src/App.tsx`
→ Root component. Waits on `useDbReady`, then renders the router. Uses
`HashRouter` with 4 routes nested under `AppShell`.

`src/main.tsx`
→ Entry point. Mounts `App` and imports the three global stylesheets in
order (theme → layout → components).

`src/components/AppShell.tsx`
→ The persistent frame around every page: sidebar (desktop) / top bar +
bottom tab bar (mobile). Defines `NAV_ITEMS`, the single source of truth
for the 4 top-level routes and their icons/labels.

`src/components/ErrorBoundary.tsx`
→ Class component catching render errors anywhere under it, showing a
"Try again" banner instead of a blank crashed screen. Wraps the router in
`App.tsx`.

`src/components/Button.tsx`, `Card.tsx`, `EmptyState.tsx`
→ Reusable primitives. `Button` supports `variant` (primary/secondary/
danger/ghost), `size` (md/lg), and `block`. Always use these instead of
raw `<button>`/`<div className="card">` in later phases, for consistency.

`src/database/db.ts`
→ IndexedDB initialization via `idb`'s `openDB`. Currently only defines a
placeholder `settings` object store at `DB_VERSION = 1`. **Phase 1 must
replace `CoffeeCartDBSchema` here with the real schema** (products,
categories, paymentMethods, sales, saleItems, settings) and bump
`DB_VERSION`, handling the upgrade path in the `upgrade()` callback.

`src/hooks/useDbReady.ts`
→ Opens the DB on mount, exposes `{ status, error }`. `App.tsx` uses this
to avoid rendering routes before the DB is confirmed usable.

`src/types/index.ts`
→ All shared domain types (`Product`, `Category`, `PaymentMethod`, `Sale`,
`SaleItem`, `Settings`, `CartLine`). These already match the field lists
in the master spec (e.g. `Sale` has no server id, uses a snapshot pattern
for `SaleItem.productNameSnapshot` / `unitPriceSnapshot` so historical
sales don't change if a product's price changes later). Import from here
rather than redefining these shapes in Phase 1+.

`src/pages/PosPage.tsx`, `HistoryPage.tsx`, `ReportsPage.tsx`,
`ProductsPage.tsx`
→ One placeholder per route today. Each will be replaced with real UI in
the phase noted in its `EmptyState` copy (Phase 2, 4, 5, 1 respectively).

`src/styles/theme.css`
→ All design tokens as CSS custom properties on `:root` (colors, font
shorthands, spacing scale, radii, shadows). Read the comment at the top
before changing the palette — it documents the intent (warm, high-contrast
"roast gold" palette chosen specifically to avoid the generic cream +
terracotta AI-generated look, and to stay legible outdoors).

`src/styles/layout.css`
→ App shell layout only: top bar, sidebar, bottom tab bar, and the
mobile/desktop breakpoint (860px).

`src/styles/components.css`
→ Shared component styles: `.btn` variants, `.card`, `.empty-state`,
`.banner`, `.page-header`.

## Database Structure

Only a placeholder exists today. **This is what Phase 1 needs to build**,
per the master spec:

```
products:
  id, name, categoryId, price, image, active, createdAt, updatedAt

categories:
  id, name, active, sortOrder

paymentMethods:
  id, name, active, sortOrder

sales:
  id, date, time, items, total, paymentMethod, amountReceived, change,
  notes, createdAt

saleItems:
  id, saleId, productId, productNameSnapshot, unitPriceSnapshot,
  quantity, lineTotal

settings:
  businessName, currency
```

The exact field shapes already exist as TypeScript types in
`src/types/index.ts` — Phase 1 should make the IndexedDB object stores
match those types (and add any IndexedDB-specific indexes it needs, e.g.
an index on `sales.date` for reports).

The current placeholder in `src/database/db.ts`:

```
settings: { key: string, value: unknown }   ← placeholder only, replace in Phase 1
```

## Completed Features

- App shell with working navigation (mobile bottom tabs + desktop sidebar)
- Responsive layout down to small phone widths
- Design token system and reusable UI primitives
- IndexedDB connection proven to open successfully
- Error boundary for render-time crashes

No end-user-facing POS features exist yet (no products, cart, sales,
reports, export, backup, or offline support — those are Phases 1–8).

## Known Issues

- None discovered in Phase 0's scope.
- **Not verified on a real phone/tablet or in a headed desktop browser.**
  This sandboxed dev environment could only verify the app via
  `tsc -b`, `vite build`, `oxlint`, and serving the built output over HTTP
  (checked with `curl`, confirming valid HTML/JS/CSS output and a 200
  response) — there was no headed browser available to visually confirm
  rendering or click through the UI. Whoever picks up Phase 1 should do a
  quick `npm run dev` + manual click-through (and ideally a real phone
  check) before assuming the shell is pixel-correct, since this has not
  been visually confirmed by a human or a screenshot yet.

## Decisions Already Made

- **IndexedDB (via `idb`) instead of localStorage** — sales history can
  grow large over the life of the cart, and localStorage is synchronous,
  string-only, and size-capped. Do not switch to localStorage.
- **`HashRouter` instead of `BrowserRouter`** — the app has to work
  installed offline as a static PWA with no server; `HashRouter` needs no
  server-side rewrite rules to support refresh/deep-linking. Do not switch
  to `BrowserRouter` without solving that problem first (e.g. a static
  fallback + service worker rewrite), and only if there's a real reason to.
- **Plain CSS with custom properties instead of Tailwind** — Tailwind was
  installed, then removed in this same phase. Reasoning: this project is a
  small, long-lived, multi-session app where a consistent, deliberately
  designed look (see `frontend-design` guidance the assistant was given)
  matters more than utility-class velocity, and a hand-rolled token system
  is easier for a future session to read and extend consistently than
  reverse-engineering intent from utility classes. If a future phase
  strongly prefers Tailwind, that's a reasonable call to revisit — just do
  it deliberately and update this doc, don't silently reintroduce it.
- **Self-hosted font (`@fontsource/manrope`) instead of a Google Fonts
  `<link>`** — the app must keep working offline (Phase 8), and a CDN font
  link would break once offline/uninstalled from cache. Bundling the font
  as a local asset avoids that failure mode entirely.
- **Snapshot pattern for sale line items** — `SaleItem` stores
  `productNameSnapshot` and `unitPriceSnapshot` rather than only a
  `productId` foreign key, so that editing a product's price or name later
  never changes historical sales. This is called out explicitly in the
  master spec and is already reflected in `src/types/index.ts` — Phase 1's
  actual sale-saving logic must populate these snapshot fields at save
  time, not read live product data when displaying old sales.
- **No UI framework/component library** (no MUI, no shadcn, etc.) — kept
  deliberately minimal given the app's small, focused feature set.

## DO NOT CHANGE

- The `HashRouter` choice (see above) — changing it has offline
  implications that later phases depend on.
- The `SaleItem` snapshot fields (`productNameSnapshot`,
  `unitPriceSnapshot`) — this is a hard requirement from the master spec,
  not an implementation detail.
- The design tokens in `theme.css` without good reason — later phases
  should extend this system (add new tokens as needed) rather than
  hardcoding one-off colors/spacing in component files.
- The folder structure (`components/`, `pages/`, `database/`, `services/`,
  `hooks/`, `utils/`, `types/`, `styles/`) — it matches the master spec
  exactly; keep new files sorted into the right one of these.

## Next Phase

**PHASE 1 — Database + Product Management.** See `NEXT_PHASE_PROMPT.md`
for the exact brief to hand to the next Claude session.

## Recommended First Steps

1. Read `README.md`, `PROJECT_STATUS.md`, this file, and
   `NEXT_PHASE_PROMPT.md`.
2. Run `npm install && npm run dev`, click through all 4 tabs on both a
   narrow (mobile-width) and wide (desktop-width) browser window, and
   confirm the shell looks and behaves as described above — this has not
   yet been visually confirmed by a human, so treat that check as part of
   Phase 1's setup, not optional.
3. Open `src/database/db.ts` and `src/types/index.ts` side by side; design
   the real IndexedDB schema (stores + indexes + `upgrade()` migration from
   version 1 to 2) to match the types already defined.
4. Build a `src/services/` module per store (e.g. `productsService.ts`,
   `categoriesService.ts`, `paymentMethodsService.ts`, `settingsService.ts`)
   with basic CRUD, rather than calling `idb` directly from components.
5. Build the Product Management UI inside `src/pages/ProductsPage.tsx`,
   replacing its current `EmptyState` placeholder.
6. Test add/edit/deactivate/reactivate for products, categories, and
   payment methods; confirm a browser refresh doesn't lose data.
7. Update `PROJECT_STATUS.md`, `HANDOFF.md`, and replace
   `NEXT_PHASE_PROMPT.md` with Phase 2 instructions before stopping.

## Testing Status

| Check | Result |
|---|---|
| `npx tsc -b` (type-check) | ✅ Pass, 0 errors |
| `npm run build` (tsc -b + vite build) | ✅ Pass, builds to `dist/` |
| `npx oxlint` | ✅ Pass, 0 warnings / 0 errors |
| `vite preview` served over HTTP, checked with `curl` | ✅ 200 OK, valid HTML/JS/CSS returned |
| Manual click-through in a real/headed browser | ❌ Not done — no headed browser available in this environment. Recommended as the first thing the next session does. |
| Real mobile device check | ❌ Not done — recommended before/around Phase 1 or 2. |
