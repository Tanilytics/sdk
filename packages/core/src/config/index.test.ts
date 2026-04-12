import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, INGESTION_URL_ENV_VAR } from './defaults';
import { validateAndMergeConfig } from './index';

const ORIGINAL_INGESTION_URL = process.env[INGESTION_URL_ENV_VAR];

afterEach(() => {
  if (ORIGINAL_INGESTION_URL === undefined) {
    delete process.env[INGESTION_URL_ENV_VAR];
    return;
  }

  process.env[INGESTION_URL_ENV_VAR] = ORIGINAL_INGESTION_URL;
});

describe('validateAndMergeConfig', () => {
  it('throws for invalid config', () => {
    expect(() =>
      validateAndMergeConfig({
        siteToken: 'short',
      }),
    ).toThrow(/too short/);
  });

  it('returns resolved immutable config for valid input', () => {
    process.env[INGESTION_URL_ENV_VAR] = 'https://env.example.com/events';

    const resolved = validateAndMergeConfig({
      siteToken: 'sk_live_abc12345',
      autocapture: { clicks: false },
    });

    expect(resolved.siteToken).toBe('sk_live_abc12345');
    expect(resolved.endpoint).toBe('https://env.example.com/events');
    expect(resolved.compress).toBe(DEFAULT_CONFIG.compress);
    expect(resolved.autocapture.clicks).toBe(false);
    expect(resolved.autocapture.pageViews).toBe(
      DEFAULT_CONFIG.autocapture.pageViews,
    );

    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.autocapture)).toBe(true);
  });

  it('throws when endpoint is omitted and INGESTION_URL is missing', () => {
    delete process.env[INGESTION_URL_ENV_VAR];

    expect(() =>
      validateAndMergeConfig({
        siteToken: 'sk_live_abc12345',
      }),
    ).toThrow(/INGESTION_URL/);
  });
});
