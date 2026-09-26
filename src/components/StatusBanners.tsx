import { Button } from "./Button";
import { WifiOffIcon } from "./Icon";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useServiceWorkerUpdate } from "../hooks/useServiceWorkerUpdate";

// Shown once, above the routed page content, so it's visible from every
// screen without threading it through each page. Offline takes priority
// over the update prompt: there's no point offering a reload-to-update
// while offline, since the new version can't be fetched anyway (the
// browser will simply re-show this banner once back online, if the
// update is still pending).
export function StatusBanners() {
  const isOnline = useOnlineStatus();
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  if (!isOnline) {
    return (
      <div className="banner banner--offline app-status-banner" role="status">
        <WifiOffIcon size={18} />
        <div>You&apos;re offline — sales still record and save on this device.</div>
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <div className="banner banner--update app-status-banner" role="status">
        <div>A new version of Bon &amp; Bean is ready.</div>
        <Button variant="ghost" size="md" onClick={applyUpdate}>
          Reload to update
        </Button>
      </div>
    );
  }

  return null;
}
