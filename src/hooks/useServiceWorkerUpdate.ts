import { useEffect, useState } from "react";
import {
  applyServiceWorkerUpdate,
  isServiceWorkerUpdateAvailable,
  SW_UPDATE_EVENT,
} from "../pwa/registerServiceWorker";

export function useServiceWorkerUpdate(): { updateAvailable: boolean; applyUpdate: () => void } {
  const [updateAvailable, setUpdateAvailable] = useState(isServiceWorkerUpdateAvailable);

  useEffect(() => {
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    window.addEventListener(SW_UPDATE_EVENT, handleUpdateAvailable);
    return () => window.removeEventListener(SW_UPDATE_EVENT, handleUpdateAvailable);
  }, []);

  return { updateAvailable, applyUpdate: applyServiceWorkerUpdate };
}
