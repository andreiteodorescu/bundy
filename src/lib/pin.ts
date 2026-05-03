/**
 * 4-digit PIN gate for hidden expenses page.
 *
 * SECURITY CAVEAT: 4 digits = 10000 combinations. SHA-256 over such a small space is
 * trivially brute-forceable by anyone with DB read access. This is a "privacy from
 * accidental glances" feature, NOT a security control.
 */
const SESSION_KEY = 'bundy.hidden.unlocked';

/** TTL options shown in Settings (in minutes). User picks one and it's stored on profile.settings. */
export const HIDDEN_PIN_TTL_OPTIONS = [1, 5, 15, 60] as const;
export type HiddenPinTtlMin = (typeof HIDDEN_PIN_TTL_OPTIONS)[number];
export const DEFAULT_HIDDEN_PIN_TTL_MIN: HiddenPinTtlMin = 5;

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPin(pin: string, storedHash: string | null): Promise<boolean> {
  if (!storedHash) return false;
  const computed = await hashPin(pin);
  return computed === storedHash;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Mark the hidden-expenses page as unlocked. Slides the timestamp to "now". */
export function markUnlocked(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    /* sessionStorage may be disabled */
  }
}

export function clearUnlocked(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Returns true if the session is still within the unlock window.
 * @param ttlMin minutes since last interaction (sliding window).
 */
export function isUnlocked(ttlMin: number = DEFAULT_HIDDEN_PIN_TTL_MIN): boolean {
  try {
    const ts = window.sessionStorage.getItem(SESSION_KEY);
    if (!ts) return false;
    const age = Date.now() - Number(ts);
    const ttlMs = ttlMin * 60 * 1000;
    if (age > ttlMs) {
      clearUnlocked();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
