import type { TrackingEvent } from '../types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventTypes } from '../events';
import { sendBatch } from './sender';

function makeEvent(id: string): TrackingEvent {
  return {
    event_id: id,
    event_type: EventTypes.CLICK,
    timestamp: Date.now(),
    url: 'https://example.com',
  };
}

describe('sendBatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('falls back to plain JSON when gzip compression is unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));

    vi.stubGlobal('CompressionStream', undefined);
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendBatch(
      [makeEvent('1')],
      {
        endpoint: 'https://api.example.com/ingest',
        siteToken: 'site_token',
        debug: false,
      },
      'visitor-1'
    );

    expect(result).toEqual({ ok: true, retryable: false });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
    });
    expect(typeof init.body).toBe('string');
    expect(init.body).toContain('"site_id":"site_token"');
  });

  it('sends gzip-compressed JSON when CompressionStream is available', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));

    class FakeCompressionStream {
      public constructor(format: string) {
        expect(format).toBe('gzip');

        return new TransformStream({
          transform(chunk, controller) {
            controller.enqueue(chunk);
          },
        });
      }
    }

    vi.stubGlobal(
      'CompressionStream',
      FakeCompressionStream as unknown as typeof CompressionStream
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendBatch(
      [makeEvent('1')],
      {
        endpoint: 'https://api.example.com/ingest',
        siteToken: 'site_token',
        debug: false,
      },
      'visitor-1'
    );

    expect(result).toEqual({ ok: true, retryable: false });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
    });
    expect(init.body).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toContain(
      '"site_id":"site_token"'
    );
  });
});
