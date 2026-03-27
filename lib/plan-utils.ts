/**
 * Shared plan expiry utilities.
 *
 * Normalises every shape a planExpiresAt value can arrive in:
 *   - Firestore client SDK Timestamp  (.toDate())
 *   - Firestore Admin SDK Timestamp   (.seconds + .nanoseconds)
 *   - Plain JS Date
 *   - ISO 8601 string
 *   - null / undefined
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePlanExpiry(planExpiresAt: any): Date | null {
  if (!planExpiresAt) return null;
  if (typeof planExpiresAt.toDate === 'function') return planExpiresAt.toDate();
  if (planExpiresAt instanceof Date) return planExpiresAt;
  if (typeof planExpiresAt.seconds === 'number') {
    return new Date(planExpiresAt.seconds * 1000);
  }
  const d = new Date(planExpiresAt);
  return isNaN(d.getTime()) ? null : d;
}

/** Returns true if the plan is currently expired (past its expiry date). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPlanExpired(planExpiresAt: any): boolean {
  const d = normalizePlanExpiry(planExpiresAt);
  return d !== null && d.getTime() < Date.now();
}

/**
 * Returns remaining days (positive = future, negative = past), or null if no expiry set.
 * Fractional days are rounded up so "23h remaining" shows as 1 day, not 0.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPlanDaysRemaining(planExpiresAt: any): number | null {
  const d = normalizePlanExpiry(planExpiresAt);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
