import { useEffect, useState } from "react";
import { getDB } from "../database/db";

type DbStatus = "checking" | "ready" | "error";

export function useDbReady(): { status: DbStatus; error: string | null } {
  const [status, setStatus] = useState<DbStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDB()
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Unknown database error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, error };
}
