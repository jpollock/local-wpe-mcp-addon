const DEFAULT_DAYS_AHEAD = 30;

/**
 * Filter SSL certificates expiring within the given number of days.
 */
export function findExpiringSslCerts<T extends { expires_at?: string }>(
  certs: T[],
  daysAhead = DEFAULT_DAYS_AHEAD,
): T[] {
  const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
  return certs.filter((c) => c.expires_at && c.expires_at < cutoff);
}
