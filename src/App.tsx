import { HashRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useDbReady } from "./hooks/useDbReady";
import { HistoryPage } from "./pages/HistoryPage";
import { PosPage } from "./pages/PosPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ReportsPage } from "./pages/ReportsPage";

// HashRouter is used (not BrowserRouter) so the app can be installed and
// opened as a local/offline PWA without server-side routing support —
// important for PHASE 8 (Offline + PWA).
function App() {
  const { status, error } = useDbReady();

  if (status === "error") {
    return (
      <div className="app-main__inner">
        <div className="banner banner--danger" role="alert">
          <div>
            <strong>Could not open the local database.</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "checking") {
    // Deliberately minimal: IndexedDB opens in a few milliseconds, so a
    // heavier loading screen would just flash. Revisit in PHASE 9 if needed.
    return null;
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<PosPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="products" element={<ProductsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
