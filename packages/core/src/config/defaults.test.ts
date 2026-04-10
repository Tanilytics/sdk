import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_CONFIG,
  INGESTION_URL_ENV_VAR,
  resolveDefaultEndpoint,
} from './defaults';

const ORIGINAL_INGESTION_URL = process.env[INGESTION_URL_ENV_VAR];

afterEach(() => {
  if (ORIGINAL_INGESTION_URL === undefined) {
    delete process.env[INGESTION_URL_ENV_VAR];
    return;
  }

  process.env[INGESTION_URL_ENV_VAR] = ORIGINAL_INGESTION_URL;
});

describe('DEFAULT_CONFIG', () => {
  it('contains valid non-endpoint transport defaults', () => {
    expect(DEFAULT_CONFIG.flushInterval).toBeGreaterThanOrEqual(500);
    expect(DEFAULT_CONFIG.maxBatchSize).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_CONFIG.maxBatchSize).toBeLessThanOrEqual(200);
    expect(DEFAULT_CONFIG.maxQueueSize).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_CONFIG.maxQueueSize).toBeLessThanOrEqual(10000);
  });

  it('contains boolean feature flags', () => {
    expect(typeof DEFAULT_CONFIG.debug).toBe('boolean');
    expect(typeof DEFAULT_CONFIG.requireConsent).toBe('boolean');
    expect(typeof DEFAULT_CONFIG.respectDoNotTrack).toBe('boolean');

    expect(typeof DEFAULT_CONFIG.autocapture.pageViews).toBe('boolean');
    expect(typeof DEFAULT_CONFIG.autocapture.scrollDepth).toBe('boolean');
    expect(typeof DEFAULT_CONFIG.autocapture.timeOnPage).toBe('boolean');
    expect(typeof DEFAULT_CONFIG.autocapture.clicks).toBe('boolean');
    expect(typeof DEFAULT_CONFIG.autocapture.formSubmissions).toBe('boolean');
  });

  it('uses explicit endpoint when provided', () => {
    delete process.env[INGESTION_URL_ENV_VAR];

    expect(resolveDefaultEndpoint('https://example.com/events')).toBe(
      'https://example.com/events',
    );
  });

  it('reads endpoint from INGESTION_URL when explicit endpoint is omitted', () => {
    process.env[INGESTION_URL_ENV_VAR] = 'https://env.example.com/events';

    expect(resolveDefaultEndpoint()).toBe('https://env.example.com/events');
  });

  it('throws when endpoint and INGESTION_URL are both missing', () => {
    delete process.env[INGESTION_URL_ENV_VAR];

    expect(() => resolveDefaultEndpoint()).toThrow(/INGESTION_URL/);
  });

  it('throws when INGESTION_URL is empty', () => {
    process.env[INGESTION_URL_ENV_VAR] = '   ';

    expect(() => resolveDefaultEndpoint()).toThrow(/INGESTION_URL/);
  });
});
