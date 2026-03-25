import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from './defaults';
import { validateAndMergeConfig } from './index';

describe('validateAndMergeConfig', () => {
  it('throws for invalid config', () => {
    expect(() =>
      validateAndMergeConfig({
        siteToken: 'short',
      }),
    ).toThrow(/too short/);
  });

  it('returns resolved immutable config for valid input', () => {
    const resolved = validateAndMergeConfig({
      siteToken: 'sk_live_abc12345',
      autocapture: { clicks: false },
    });

    expect(resolved.siteToken).toBe('sk_live_abc12345');
    expect(resolved.endpoint).toBe(DEFAULT_CONFIG.endpoint);
    expect(resolved.autocapture.clicks).toBe(false);
    expect(resolved.autocapture.pageViews).toBe(DEFAULT_CONFIG.autocapture.pageViews);

    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.autocapture)).toBe(true);
  });
});
