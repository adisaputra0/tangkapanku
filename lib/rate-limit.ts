const requestLog = new Map<string, number[]>();

export function checkRateLimit(
  identifier: string,
  limit = 15,
  windowMs = 60_000,
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const timestamps = requestLog.get(identifier) || [];

  // Bersihkan timestamp yang sudah melewati window
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    const oldest = recent[0];
    const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  requestLog.set(identifier, recent);
  return { allowed: true };
}
