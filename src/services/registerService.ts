// PHASE 12 — Open/Close Register with a Cash Fund.
//
// A register "session" spans one shift: opened with an Opening Cash Fund,
// closed with a Physical Cash Counted figure. See types/index.ts's
// RegisterSession for the shape and utils/registerStats.ts for how a
// session's sales are turned into a closing summary (Cash Sales, non-cash
// breakdown, Total Sales). This file only owns persistence — no money
// math lives here.
import { getDB } from "../database/db";
import type { RegisterSession } from "../types";
import { generateId } from "../utils/id";

// There is only ever meant to be one open session (no closedAt) at a
// time — openRegister() below refuses to create a second one. If more
// than one somehow exists (shouldn't happen via this app), the most
// recently opened one is treated as current rather than throwing, since
// refusing to let the POS open at all would be worse for a cashier
// mid-shift.
export async function getOpenSession(): Promise<RegisterSession | null> {
  const db = await getDB();
  const all = await db.getAll("registerSessions");
  const open = all.filter((s) => s.closedAt === undefined);
  if (open.length === 0) return null;
  return open.sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];
}

export async function openRegister(openingFund: number): Promise<RegisterSession> {
  if (!Number.isFinite(openingFund) || openingFund < 0) {
    throw new Error("Opening cash fund must be a valid, non-negative amount.");
  }

  const existing = await getOpenSession();
  if (existing) {
    throw new Error("A register session is already open.");
  }

  const db = await getDB();
  const session: RegisterSession = {
    id: generateId(),
    openingFund,
    openedAt: new Date().toISOString(),
  };
  await db.add("registerSessions", session);
  return session;
}

export async function closeRegister(
  id: string,
  physicalCashCounted: number,
): Promise<RegisterSession> {
  if (!Number.isFinite(physicalCashCounted) || physicalCashCounted < 0) {
    throw new Error("Physical cash counted must be a valid, non-negative amount.");
  }

  const db = await getDB();
  const existing = await db.get("registerSessions", id);
  if (!existing) throw new Error("Register session not found.");
  if (existing.closedAt) throw new Error("This register session is already closed.");

  const updated: RegisterSession = {
    ...existing,
    physicalCashCounted,
    closedAt: new Date().toISOString(),
  };
  await db.put("registerSessions", updated);
  return updated;
}

// Most-recent-first, same ordering convention as salesService.ts's
// listSales. Not used by PosPage's open/close gate (which only needs
// getOpenSession above) — kept for anything that wants a shift history
// later (e.g. a future "past register sessions" view).
export async function listRegisterSessions(): Promise<RegisterSession[]> {
  const db = await getDB();
  const all = await db.getAll("registerSessions");
  return all.sort((a, b) => b.openedAt.localeCompare(a.openedAt));
}
