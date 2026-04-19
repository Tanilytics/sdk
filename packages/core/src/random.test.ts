import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateSecureUuid } from './random';

describe('random', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'uuid-from-crypto');
    vi.stubGlobal('crypto', { randomUUID });

    expect(generateSecureUuid()).toBe('uuid-from-crypto');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('uses getRandomValues fallback when randomUUID is unavailable', () => {
    const getRandomValues = vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i + 1;
      return arr;
    });

    vi.stubGlobal('crypto', { getRandomValues });

    const generated = generateSecureUuid();

    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(generated).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('throws when secure crypto APIs are unavailable', () => {
    vi.stubGlobal('crypto', undefined);

    expect(() => generateSecureUuid()).toThrow(
      /Secure random ID generation is unavailable/,
    );
  });
});
