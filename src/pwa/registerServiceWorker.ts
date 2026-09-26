// Registers public/sw.js and exposes a tiny event so the UI (see
// src/hooks/useServiceWorkerUpdate.ts) can show an "Update available"
// banner instead of the service worker silently taking over mid-sale.
//
// Deliberately NOT a React hook itself: registration should happen
// exactly once, independent of any component mounting or unmounting,
// the same reason database/db.ts's getDB() isn't a hook either.

export const SW_UPDATE_EVENT = "coffee-cart-pos:sw-update-available";

let waitingWorker: ServiceWorker | null = null;

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  // Registration silently no-ops on non-secure origins (anything but
  // HTTPS or localhost) — the browser enforces that, not this code. The
  // app works fine without a service worker, just without offline/
  // install support, so there's nothing else to do here in that case.

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // A worker may already be waiting from a previous visit (e.g. the
        // tab was open when a new version installed).
        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingWorker = registration.waiting;
          window.dispatchEvent(new Event(SW_UPDATE_EVENT));
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // `controller` being set means an earlier worker was already
            // active — so this "installed" is an UPDATE, not this tab's
            // very first install (which needs no banner; there's nothing
            // to reload from).
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              waitingWorker = installing;
              window.dispatchEvent(new Event(SW_UPDATE_EVENT));
            }
          });
        });
      })
      .catch((err) => {
        console.warn("bon&bean: service worker registration failed", err);
      });

    // Reload once the new worker actually takes control, so
    // applyServiceWorkerUpdate()'s SKIP_WAITING message results in the
    // new app shell being loaded — not just a no-op refresh of the page
    // still controlled by the old worker.
    let hasReloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    });
  });
}

export function isServiceWorkerUpdateAvailable(): boolean {
  return waitingWorker !== null;
}

// Called from the update banner's "Reload to update" button. Note this
// is unrelated to BackupManager.tsx's window.location.reload() after a
// restore (Phase 7) — that reload is a normal page reload and does not
// touch the service worker at all, so the two don't interact: a restore
// reload with no update pending just re-fetches from the current cache/
// network as usual.
export function applyServiceWorkerUpdate(): void {
  waitingWorker?.postMessage({ type: "SKIP_WAITING" });
}
