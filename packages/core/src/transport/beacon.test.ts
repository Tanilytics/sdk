import type { TrackingEvent } from '../types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendBeacon } from './beacon';
import { EventTypes } from '../events';

function makeEvent(id: string): TrackingEvent {
  return {
    event_id: id,
    event_type: EventTypes.CLICK,
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
      'visitor-1',
    );

    expect(result).toEqual({ sent: false, reason: 'sendBeacon not available' });
  });

  it('appends st parameter without breaking existing query params', () => {
    const sendBeaconMock = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: sendBeaconMock });

    const result = sendBeacon(
      [makeEvent('1')],
      'https://api.example.com/ingest',
      'site token',
      'visitor-1',
    );

    expect(result.sent).toBe(true);
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
  });
});
