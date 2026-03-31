import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from './defaults';

describe('DEFAULT_CONFIG', () => {
  it('contains valid transport defaults', () => {
    expect(DEFAULT_CONFIG.endpoint.startsWith('https://')).toBe(true);
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
});
