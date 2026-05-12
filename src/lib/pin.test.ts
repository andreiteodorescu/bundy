import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hashPin, verifyPin, isValidPin, markUnlocked, isUnlocked, clearUnlocked,
} from './pin';

beforeEach(() => {
  window.sessionStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-12T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe('isValidPin', () => {
  it.each<[string, boolean]>([
    ['1234', true],
    ['0000', true],
    ['9999', true],
    ['12345', false],
    ['123', false],
    ['12a4', false],
    ['', false],
    ['abcd', false],
  ])('%s → %s', (pin, expected) => {
    expect(isValidPin(pin)).toBe(expected);
  });
});

describe('hashPin + verifyPin', () => {
  it('hashing same PIN twice produces identical hash (SHA-256 deterministic)', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a).toBe(b);
  });

  it('different PINs produce different hashes', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1235');
    expect(a).not.toBe(b);
  });

  it('hash is hex string of 64 chars (SHA-256)', async () => {
    const h = await hashPin('1234');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifyPin returns true when PIN matches stored hash', async () => {
    const stored = await hashPin('4321');
    expect(await verifyPin('4321', stored)).toBe(true);
  });

  it('verifyPin returns false on mismatch', async () => {
    const stored = await hashPin('4321');
    expect(await verifyPin('1234', stored)).toBe(false);
  });

  it('verifyPin returns false when storedHash is null (no PIN set)', async () => {
    expect(await verifyPin('1234', null)).toBe(false);
  });
});

describe('markUnlocked / isUnlocked sliding TTL', () => {
  it('not unlocked by default', () => {
    expect(isUnlocked()).toBe(false);
  });

  it('isUnlocked → true immediately after markUnlocked', () => {
    markUnlocked();
    expect(isUnlocked(5)).toBe(true);
  });

  it('expires after TTL minutes elapsed', () => {
    markUnlocked();
    expect(isUnlocked(5)).toBe(true);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(isUnlocked(5)).toBe(false);
  });

  it('still unlocked just before TTL boundary', () => {
    markUnlocked();
    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(isUnlocked(5)).toBe(true);
  });

  it('expired session is auto-cleared from storage', () => {
    markUnlocked();
    vi.advanceTimersByTime(60 * 60 * 1000);
    isUnlocked(5);
    expect(window.sessionStorage.getItem('bundy.hidden.unlocked')).toBeNull();
  });

  it('re-marking slides the window forward', () => {
    markUnlocked();
    vi.advanceTimersByTime(4 * 60 * 1000);
    markUnlocked();
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(isUnlocked(5)).toBe(true);
  });

  it('clearUnlocked immediately disables access', () => {
    markUnlocked();
    expect(isUnlocked()).toBe(true);
    clearUnlocked();
    expect(isUnlocked()).toBe(false);
  });

  it('different TTLs are respected (1 min)', () => {
    markUnlocked();
    vi.advanceTimersByTime(60 * 1000 + 1);
    expect(isUnlocked(1)).toBe(false);
  });
});
