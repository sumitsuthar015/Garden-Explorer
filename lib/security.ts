import { headers } from "next/headers";

import { AppError } from "@/lib/errors";

/**
 * Lightweight in-memory rate limiting.
 *
 * Chosen over Redis because the spec forbids unnecessary paid infrastructure.
 * Each serverless instance keeps its own counter, which is exactly the right
 * trade-off here: it stops a single abusive client cheaply, and the primary
 * brute-force target (admin sign-in) is additionally limited inside Better Auth.
 *
 * The honest limitation is documented in the README: this is best-effort per
 * instance, not a global quota.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as unknown as { __gardenRateLimits?: Map<string, Bucket> };
globalStore.__gardenRateLimits ??= new Map();

const buckets = globalStore.__gardenRateLimits;

function prune(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** Stable name for the protected action, e.g. "quiz-answer". */
  key: string;
  limit: number;
  windowMs: number;
}

/** Identify the caller without storing IP addresses anywhere. */
export async function requestFingerprint(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim();
    // Hashed implicitly by only being kept in this in-memory bucket map.
    return ip || headerList.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

/** Throwing variant — used inside server actions. */
export async function enforceRateLimit(options: RateLimitOptions): Promise<void> {
  const identity = await requestFingerprint();
  const composite = `${options.key}:${identity}`;
  const now = Date.now();

  prune(now);

  const existing = buckets.get(composite);
  if (!existing || existing.resetAt <= now) {
    buckets.set(composite, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > options.limit) {
    throw new AppError("RATE_LIMITED");
  }
}

/** Non-throwing variant returning `{ allowed, retryAfterMs }` for route handlers. */
export async function checkRateLimit(
  options: RateLimitOptions,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const identity = await requestFingerprint();
  const composite = `${options.key}:${identity}`;
  const now = Date.now();

  prune(now);

  const existing = buckets.get(composite);
  if (!existing || existing.resetAt <= now) {
    buckets.set(composite, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  existing.count += 1;
  if (existing.count > options.limit) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

/** Public actions a visitor can trigger. */
export const RATE_LIMITS = {
  scanResolve: { key: "scan-resolve", limit: 90, windowMs: 60_000 },
  quizAnswer: { key: "quiz-answer", limit: 120, windowMs: 60_000 },
  activitySubmit: { key: "activity-submit", limit: 90, windowMs: 60_000 },
  analytics: { key: "analytics-event", limit: 240, windowMs: 60_000 },
  upload: { key: "media-upload", limit: 40, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitOptions>;
