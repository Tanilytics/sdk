import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsTracker } from './tracker';
import { EventQueue } from './transport';
import type { MediaAdapterApi, MediaAdapterInterface } from './types';

describe('AnalyticsTracker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('enqueues custom events with event_type=custom and event_name', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'https://example.com/audio?utm_source=podcast',
      },
      screen: { width: 1920, height: 1080 },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      history: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      },
    });
    vi.stubGlobal('document', {
      referrer: 'https://ref.example.com/',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: 'visible',
    });
    vi.stubGlobal('navigator', {
      language: 'en-US',
    });
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'event-uuid-custom-track'),
    });

    const queueEnqueueSpy = vi.spyOn(EventQueue.prototype, 'enqueue');

    const tracker = new AnalyticsTracker({
      siteToken: 'sk_live_abc12345',
      endpoint: 'https://ingest.example.com/api/v1/events',
      autocapture: {
        pageViews: false,
        clicks: false,
        formSubmissions: false,
        scrollDepth: false,
        timeOnPage: false,
      },
    });

    tracker.track('audio_downloaded', { format: 'mp3' });

    expect(queueEnqueueSpy).toHaveBeenCalledTimes(1);
    expect(queueEnqueueSpy.mock.calls[0]?.[0]).toMatchObject({
      event_type: 'custom',
      event_name: 'audio_downloaded',
      properties: { format: 'mp3' },
      url: 'https://example.com/audio',
      utm_source: 'podcast',
    });

    tracker.destroy();
  });

  it('rejects empty custom event names', () => {
    vi.stubGlobal('window', {
      location: { href: 'https://example.com/' },
      screen: { width: 1920, height: 1080 },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      history: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      },
    });
    vi.stubGlobal('document', {
      referrer: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: 'visible',
    });
    vi.stubGlobal('navigator', { language: 'en-US' });

    const tracker = new AnalyticsTracker({
      siteToken: 'sk_live_abc12345',
      endpoint: 'https://ingest.example.com/api/v1/events',
      autocapture: {
        pageViews: false,
        clicks: false,
        formSubmissions: false,
        scrollDepth: false,
        timeOnPage: false,
      },
    });

    expect(() => tracker.track('   ')).toThrow(/cannot be empty/);

    tracker.destroy();
  });

  it('attaches media adapters and enqueues media events through the internal pipeline', () => {
    vi.stubGlobal('window', {
      location: { href: 'https://example.com/watch?v=123' },
      screen: { width: 1920, height: 1080 },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      history: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      },
    });
    vi.stubGlobal('document', {
      referrer: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: 'visible',
    });
    vi.stubGlobal('navigator', { language: 'en-US' });
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'event-uuid-media-track'),
    });

    const queueEnqueueSpy = vi.spyOn(EventQueue.prototype, 'enqueue');
    const adapterDetach = vi.fn();
    const adapterAttach = vi.fn<(api: MediaAdapterApi) => void>(
      () => undefined,
    );

    const adapter: MediaAdapterInterface = {
      name: 'youtube',
      attach: adapterAttach,
      detach: adapterDetach,
    };

    const tracker = new AnalyticsTracker({
      siteToken: 'sk_live_abc12345',
      endpoint: 'https://ingest.example.com/api/v1/events',
      autocapture: false,
      adapters: [adapter],
    });

    const mediaApi = adapterAttach.mock.calls[0]?.[0];

    if (mediaApi === undefined) {
      throw new Error('Expected adapter API to be attached.');
    }

    mediaApi.trackMedia('media_play', {
      provider: 'youtube',
      video_id: 'abc123xyz89',
    });

    expect(queueEnqueueSpy).toHaveBeenCalledTimes(1);
    expect(queueEnqueueSpy.mock.calls[0]?.[0]).toMatchObject({
      event_type: 'media_play',
      properties: {
        provider: 'youtube',
        video_id: 'abc123xyz89',
      },
    });

    tracker.destroy();

    expect(adapterDetach).toHaveBeenCalledTimes(1);
  });

  it('drops media adapter events after destroy', () => {
    vi.stubGlobal('window', {
      location: { href: 'https://example.com/watch?v=123' },
      screen: { width: 1920, height: 1080 },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      history: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      },
    });
    vi.stubGlobal('document', {
      referrer: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: 'visible',
    });
    vi.stubGlobal('navigator', { language: 'en-US' });
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'event-uuid-media-track-destroyed'),
    });

    const queueEnqueueSpy = vi.spyOn(EventQueue.prototype, 'enqueue');
    const adapterAttach = vi.fn<(api: MediaAdapterApi) => void>(
      () => undefined,
    );

    const adapter: MediaAdapterInterface = {
      name: 'youtube',
      attach: adapterAttach,
      detach: vi.fn(),
    };

    const tracker = new AnalyticsTracker({
      siteToken: 'sk_live_abc12345',
      endpoint: 'https://ingest.example.com/api/v1/events',
      autocapture: false,
      adapters: [adapter],
    });

    tracker.destroy();

    const mediaApi = adapterAttach.mock.calls[0]?.[0];

    if (mediaApi === undefined) {
      throw new Error('Expected adapter API to be attached.');
    }

    mediaApi.trackMedia('media_pause', { provider: 'youtube' });

    expect(queueEnqueueSpy).not.toHaveBeenCalled();
  });
});
