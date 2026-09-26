import { getDB, SETTINGS_KEY } from "../database/db";
import type { Settings } from "../types";

const FALLBACK_SETTINGS: Settings = {
  businessName: "My bon&bean",
  currency: "₱",
};

export async function getSettings(): Promise<Settings> {
  const db = await getDB();
  const settings = await db.get("settings", SETTINGS_KEY);
  return settings ?? FALLBACK_SETTINGS;
}

export async function updateSettings(changes: Partial<Settings>): Promise<Settings> {
  const db = await getDB();
  const current = await getSettings();
  const updated = { ...current, ...changes };
  await db.put("settings", updated, SETTINGS_KEY);
  return updated;
}
