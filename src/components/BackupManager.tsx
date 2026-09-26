// PHASE 7 — Backup + Restore.
//
// Lives as a tab on ProductsPage.tsx rather than a new route: this app has
// no settings/admin screen yet, and ProductsPage already hosts other
// non-sales administrative tasks (categories, payment methods) alongside
// products, so a "Backup" tab is consistent with what's already there
// instead of adding a whole new nav item for one more admin task. See
// HANDOFF.md for the full reasoning.
import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { buildBackupFile, restoreBackup } from "../services/backupService";
import { buildBackupFilename, serializeBackup, validateBackupFile } from "../utils/backup";
import { downloadTextFile } from "../utils/download";

type Status = { kind: "success" | "error"; message: string };

export function BackupManager() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  async function handleBackup() {
    setBusy(true);
    setStatus(null);
    try {
      const payload = await buildBackupFile();
      const json = serializeBackup(payload);
      downloadTextFile(buildBackupFilename(), json, "application/json;charset=utf-8;");
      setStatus({ kind: "success", message: "Backup downloaded." });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not create a backup.",
      });
    } finally {
      setBusy(false);
    }
  }

  function handleRestoreClick() {
    // No existing file-input pattern in this codebase yet (per the Phase 7
    // brief) — a visually-hidden <input type="file"> triggered by the
    // Button keeps the touch-friendly Button styling instead of the
    // browser's own unstyled file-picker control.
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset immediately so selecting the SAME file again after a failed/
    // cancelled attempt still fires a change event.
    event.target.value = "";
    if (!file) return;

    setStatus(null);

    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus({ kind: "error", message: "Could not read that file." });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setStatus({ kind: "error", message: "That file isn't valid JSON — it doesn't look like a backup." });
      return;
    }

    // Nothing is written to IndexedDB until the file passes this check —
    // see utils/backup.ts's validateBackupFile.
    const result = validateBackupFile(parsed);
    if (!result.valid) {
      setStatus({ kind: "error", message: result.error });
      return;
    }

    const { data } = result;
    // Deliberately explicit and destructive-sounding, not a generic "Are
    // you sure?" — matching this project's existing delete-confirmation
    // convention (see salesService.ts's deleteSale call-sites), but
    // stronger, since this replaces EVERYTHING rather than one record.
    const confirmed = window.confirm(
      `Restore this backup from ${new Date(data.exportedAt).toLocaleString()}?\n\n` +
        `This will REPLACE every product, category, payment method, sale, and setting ` +
        `currently on this device with what's in the file (${data.products.length} products, ` +
        `${data.sales.length} sales). Anything recorded since this backup was made will be lost. ` +
        `This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await restoreBackup(data);
      // A full replace touches every store this app reads from. Reloading
      // the page is the simplest way to guarantee every screen (POS,
      // History, Reports, this one) reflects the restored data instead of
      // stale in-memory state left over from before the restore.
      window.location.reload();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Restore failed. Nothing was changed.",
      });
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <div className="dashboard__section-title">Back up</div>
        <p className="export-card__hint">
          Downloads a single JSON file with every product, category, payment method, sale, and
          setting on this device. This is the only way to move your data to a new device or
          recover it if this one is lost or its browser data is cleared — keep the file somewhere
          safe, off this device.
        </p>
        <div className="export-actions">
          <Button variant="secondary" onClick={handleBackup} disabled={busy}>
            {busy ? "Working…" : "Back up"}
          </Button>
        </div>
      </Card>

      <Card style={{ marginTop: "var(--space-3)" }}>
        <div className="dashboard__section-title">Restore</div>
        <p className="export-card__hint">
          Restoring a backup file REPLACES everything currently on this device — every product,
          category, payment method, sale, and setting — with what's in the file. You'll be asked
          to confirm before anything is changed.
        </p>
        <div className="export-actions">
          <Button variant="danger" onClick={handleRestoreClick} disabled={busy}>
            Restore from file…
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={handleFileSelected}
        />
      </Card>

      {status && (
        <div
          className={`banner banner--${status.kind === "error" ? "danger" : "success"}`}
          role={status.kind === "error" ? "alert" : "status"}
          style={{ marginTop: "var(--space-3)" }}
        >
          {status.message}
        </div>
      )}
    </>
  );
}
