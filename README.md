# Coffee Cart POS

A mobile-first sales recording app for a coffee cart owner who currently
writes sales down by hand. It is **not** a receipt system — the workflow is:

```
OPEN POS → TAP PRODUCTS → REVIEW ORDER → SELECT PAYMENT → SAVE SALE
```

The app is built to be fast, simple, touch-friendly, and to work fully
offline once installed, so it never depends on the coffee cart having a
signal.

## This is a multi-phase project

This app is being built in numbered phases across multiple Claude
sessions. **Before doing any work here, read these three files, in order:**

1. [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — what phase the project is on right now
2. [`HANDOFF.md`](./HANDOFF.md) — full architecture and decision history
3. [`NEXT_PHASE_PROMPT.md`](./NEXT_PHASE_PROMPT.md) — exact instructions for the next phase

The source code is always the source of truth — if the docs and the code
disagree, trust the code and fix the docs.

## Tech stack

- **React 19 + TypeScript**, built with **Vite**
- **React Router** (`HashRouter`, so routing keeps working when the app is
  installed and opened offline as a PWA — no server-side routes needed)
- **IndexedDB** via the `idb` library for local, offline-first data storage
- Plain modern CSS with a small design-token system (`src/styles/theme.css`)
  — no CSS framework
- Self-hosted variable font (`@fontsource/manrope`) so typography works
  offline with no CDN dependency

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build locally
npm run lint      # oxlint
```

## Project structure

```
src/
  components/   reusable UI: Button, Card, EmptyState, ErrorBoundary, AppShell
  pages/        one file per route (POS, History, Reports, Products)
  database/     IndexedDB setup (schema grows in Phase 1)
  services/     data-access / business-logic modules (added from Phase 1 on)
  hooks/        shared React hooks
  utils/        small pure helper functions
  pwa/          service worker registration + update-available bridge (Phase 8)
  types/        shared TypeScript types for the domain model
  styles/       theme.css (tokens), layout.css (app shell), components.css

public/
  sw.js                    hand-written service worker (Phase 8)
  manifest.webmanifest     PWA manifest (Phase 8)
  icons/                   192/512/512-maskable PNG icons, rasterized from favicon.svg
```

## Design direction

Warm, high-contrast "roast gold" palette (`src/styles/theme.css`) built for
quick reading on a small screen outdoors, not a soft dashboard look. Single
type family (Manrope) carrying both display and body text, with heavy
weights reserved for prices and totals so the numbers that matter are
always the most prominent thing on screen.
