import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDeviceType } from './device';

describe('getDeviceType', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns unknown when navigator is unavailable', () => {
    vi.stubGlobal('navigator', undefined);

    expect(getDeviceType()).toBe('unknown');
  });

  it('detects tablet user agents', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
    });

    expect(getDeviceType()).toBe('tablet');
  });

  it('detects mobile user agents', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
    });

    expect(getDeviceType()).toBe('mobile');
  });

  it('detects desktop user agents', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0',
    });

    expect(getDeviceType()).toBe('desktop');
  });

  it('returns unknown for empty user agent', () => {
    vi.stubGlobal('navigator', { userAgent: '' });

    expect(getDeviceType()).toBe('unknown');
  });
});
