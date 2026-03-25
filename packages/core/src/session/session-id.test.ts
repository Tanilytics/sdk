import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateSessionId } from './session-id';

describe('session/session-id', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'uuid-from-crypto');
    vi.stubGlobal('crypto', { randomUUID });

    expect(generateSessionId()).toBe('uuid-from-crypto');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('falls back to timestamp-random format when crypto is unavailable', () => {
    const fixedNow = 1_700_000_000_000;

    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const generated = generateSessionId();

    expect(generated.startsWith(`${fixedNow.toString(36)}-`)).toBe(true);

    const parts = generated.split('-');
    expect(parts).toHaveLength(2);
    expect(parts[1].length).toBe(7);
  });

  it('produces different fallback values when random source changes', () => {
    const fixedNow = 1_700_000_000_000;

    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.111111111)
      .mockReturnValueOnce(0.222222222);

    const first = generateSessionId();
    const second = generateSessionId();

    expect(first).not.toBe(second);
    expect(first.startsWith(`${fixedNow.toString(36)}-`)).toBe(true);
    expect(second.startsWith(`${fixedNow.toString(36)}-`)).toBe(true);
  });
});
