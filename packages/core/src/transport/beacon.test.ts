import type { TrackingEvent } from '../types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendBeacon } from './beacon';

function makeEvent(id: string): TrackingEvent {
  return {
    eventId: id,
    siteToken: 'site_token',
    eventType: 'custom',
    clientTimestamp: Date.now(),
    url: 'https://example.com',
    referrer: '',
    sessionId: 'session_1',
    deviceType: 'desktop',
    screenWidth: 1920,
    viewportWidth: 1200,
    language: 'en-US',
    sdkVersion: '0.0.0-test',
  };
}

describe('sendBeacon', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns not available when navigator.sendBeacon is missing', () => {
    vi.stubGlobal('navigator', undefined);

    const result = sendBeacon(
      [makeEvent('1')],
      'https://api.example.com/ingest',
      'abc'
    );

    expect(result).toEqual({ sent: false, reason: 'sendBeacon not available' });
  });

  it('appends st parameter without breaking existing query params', () => {
    const sendBeaconMock = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: sendBeaconMock });

    const result = sendBeacon(
      [makeEvent('1')],
      'https://api.example.com/ingest?foo=1',
      'site token'
    );

    expect(result.sent).toBe(true);
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);

    const [urlArg] = sendBeaconMock.mock.calls[0] as unknown as [string, Blob];
    const parsed = new URL(urlArg);

    expect(parsed.searchParams.get('foo')).toBe('1');
    expect(parsed.searchParams.get('st')).toBe('site token');
  });
});
