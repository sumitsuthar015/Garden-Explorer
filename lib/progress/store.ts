import { createEmptyProgress } from "./actions";
import { PROGRESS_KEY, parseStoredProgress, type VisitorProgress } from "./types";

/**
 * localStorage-backed visitor progress store.
 *
 * Uses the `useSyncExternalStore` contract:
 *  - `getServerSnapshot()` returns a frozen constant so the server HTML and the
 *    first client render agree (no hydration mismatch).
 *  - `subscribe()` performs the one-time hydration from localStorage.
 *  - Every mutation replaces the snapshot object, so React re-renders reliably.
 */

export const SERVER_SNAPSHOT: VisitorProgress = Object.freeze({
  version: 1,
  visitorId: "",
  xp: 0,
  locations: {},
  activities: [],
  quizzes: {},
  trails: {},
  badges: [],
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z",
}) as VisitorProgress;

let current: VisitorProgress = SERVER_SNAPSHOT;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function safeRead(): string | null {
  try {
    return window.localStorage.getItem(PROGRESS_KEY);
  } catch {
    // Private browsing / disabled storage — progress simply will not persist.
    return null;
  }
}

function safeWrite(progress: VisitorProgress) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* storage full or blocked — the in-memory session still works */
  }
}

function newVisitorId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

/** Load once from localStorage. Idempotent and safe to call repeatedly. */
export function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  const stored = parseStoredProgress(safeRead());
  current = stored ?? createEmptyProgress(newVisitorId(), new Date().toISOString());
  if (!stored) safeWrite(current);
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  hydrate();
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): VisitorProgress {
  return current;
}

export function getServerSnapshot(): VisitorProgress {
  return SERVER_SNAPSHOT;
}

export function isHydrated(): boolean {
  return hydrated;
}

/**
 * Apply a pure reducer to the stored progress and notify subscribers.
 * The reducer must return the same object when nothing changed.
 */
export function mutate(
  updater: (previous: VisitorProgress) => VisitorProgress,
): VisitorProgress {
  hydrate();
  const next = updater(current);
  if (next === current) return current;

  current = next;
  safeWrite(current);
  emit();
  return current;
}

/** Current anonymous visitor id, creating the record if needed. */
export function getVisitorId(): string {
  hydrate();
  return current.visitorId;
}

/** Wipe local progress (used by the "Reset my progress" control on /progress). */
export function resetProgress(): void {
  hydrate();
  try {
    window.localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
  current = createEmptyProgress(newVisitorId(), new Date().toISOString());
  safeWrite(current);
  emit();
}

// Keep multiple open tabs in sync.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== PROGRESS_KEY) return;
    const stored = parseStoredProgress(event.newValue);
    if (!stored) return;
    current = stored;
    emit();
  });
}
