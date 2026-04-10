import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, INGESTION_URL_ENV_VAR } from './defaults';
import { merge } from './merger';
import type { ResolvedConfig } from './types';

const ORIGINAL_INGESTION_URL = process.env[INGESTION_URL_ENV_VAR];

afterEach(() => {
  if (ORIGINAL_INGESTION_URL === undefined) {
    delete process.env[INGESTION_URL_ENV_VAR];
    return;
  }

  process.env[INGESTION_URL_ENV_VAR] = ORIGINAL_INGESTION_URL;
});

describe('merge', () => {
  it('applies defaults for omitted optional fields', () => {
    process.env[INGESTION_URL_ENV_VAR] = 'https://env.example.com/events';

    const result = merge({ siteToken: 'sk_live_abc12345' });

    expect(result.siteToken).toBe('sk_live_abc12345');
    expect(result.endpoint).toBe('https://env.example.com/events');
    expect(result.flushInterval).toBe(DEFAULT_CONFIG.flushInterval);
    expect(result.maxBatchSize).toBe(DEFAULT_CONFIG.maxBatchSize);
    expect(result.maxQueueSize).toBe(DEFAULT_CONFIG.maxQueueSize);
    expect(result.debug).toBe(DEFAULT_CONFIG.debug);
    expect(result.requireConsent).toBe(DEFAULT_CONFIG.requireConsent);
    expect(result.respectDoNotTrack).toBe(DEFAULT_CONFIG.respectDoNotTrack);
    expect(result.autocapture).toEqual(DEFAULT_CONFIG.autocapture);
  });

  it('overrides provided fields and merges partial autocapture', () => {
    const result = merge({
      siteToken: 'sk_live_override123',
      endpoint: 'https://example.com/events',
      flushInterval: 5000,
      maxBatchSize: 10,
      maxQueueSize: 200,
      debug: true,
      requireConsent: true,
      respectDoNotTrack: false,
      autocapture: { pageViews: false },
    });

    expect(result.endpoint).toBe('https://example.com/events');
    expect(result.flushInterval).toBe(5000);
    expect(result.maxBatchSize).toBe(10);
    expect(result.maxQueueSize).toBe(200);
    expect(result.debug).toBe(true);
    expect(result.requireConsent).toBe(true);
    expect(result.respectDoNotTrack).toBe(false);

    expect(result.autocapture.pageViews).toBe(false);
    expect(result.autocapture.scrollDepth).toBe(
      DEFAULT_CONFIG.autocapture.scrollDepth,
    );
    expect(result.autocapture.timeOnPage).toBe(
      DEFAULT_CONFIG.autocapture.timeOnPage,
    );
    expect(result.autocapture.clicks).toBe(DEFAULT_CONFIG.autocapture.clicks);
    expect(result.autocapture.formSubmissions).toBe(
      DEFAULT_CONFIG.autocapture.formSubmissions,
    );
  });

  it('throws when endpoint is omitted and INGESTION_URL is missing', () => {
    delete process.env[INGESTION_URL_ENV_VAR];

    expect(() => merge({ siteToken: 'sk_live_abc12345' })).toThrow(
      /INGESTION_URL/,
    );
  });

  it('returns deeply frozen config object', () => {
    process.env[INGESTION_URL_ENV_VAR] = 'https://env.example.com/events';

    const result = merge({ siteToken: 'sk_live_abc12345' });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.autocapture)).toBe(true);

    const mutableResult = result as unknown as {
      debug: boolean;
      autocapture: ResolvedConfig['autocapture'];
    };

    expect(() => {
      mutableResult.debug = true;
    }).toThrow();

    expect(() => {
      mutableResult.autocapture.pageViews = false;
    }).toThrow();
  });
});
