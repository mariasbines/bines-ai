/**
 * Shared day-key helpers for the argue-log.
 *
 * Extracted from storage.ts in story 002.002 so the admin page (an RSC)
 * can validate `?day=YYYY-MM-DD` query params without importing the
 * `server-only` storage module at module-evaluation time.
 *
 * Pure, no env, no I/O.
 */

export const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDayKey(s: string): boolean {
  return DAY_KEY_RE.test(s);
}

/**
 * ISO UTC day (YYYY-MM-DD). Caller supplies `d` (defaults to now). UTC is
 * intentional — argue-log days are UTC-bucketed (matches storage.ts).
 */
export function dayKeyUtc(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
