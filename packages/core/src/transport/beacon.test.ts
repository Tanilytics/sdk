import type { TrackingEvent } from '../types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendBeacon } from './beacon';

function makeEvent(id: string): TrackingEvent {
  return {
    event_id: id,
    event_type: 'custom',
    timestamp: Date.now(),
    url: 'https://example.com',
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
      'abc',
      'visitor-1'
    );

    expect(result).toEqual({ sent: false, reason: 'sendBeacon not available' });
  });

  it('appends st parameter without breaking existing query params', () => {
    const sendBeaconMock = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: sendBeaconMock });

    const result = sendBeacon(
      [makeEvent('1')],
      'https://api.example.com/ingest?foo=1',
      'site token',
      'visitor-1'
    );

    expect(result.sent).toBe(true);
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);

    const [urlArg] = sendBeaconMock.mock.calls[0] as unknown as [string, Blob];
    const parsed = new URL(urlArg);

    expect(parsed.searchParams.get('foo')).toBe('1');
    expect(parsed.searchParams.get('st')).toBe('site token');
  });
});
