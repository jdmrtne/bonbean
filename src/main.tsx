import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/components.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Only register in production builds: `vite dev`'s own module reloading
// and unbundled dev server responses don't play well with a cache-first
// service worker, and there's nothing useful to offline-cache in dev
// anyway (see HANDOFF.md "Decisions Already Made").
if (import.meta.env.PROD) {
  registerServiceWorker();
}
