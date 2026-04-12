import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/device', () => ({
  getDeviceType: vi.fn(() => 'desktop'),
}));

import {
  __resetEventBuilderStateForTests,
  buildCustomEvent,
  buildInternalEvent,
  configureSiteToken,
} from './event-builder';
import { EventTypes } from './event-types';

function stubBrowserGlobals() {
  vi.stubGlobal('window', {
    location: {
      href: 'https://example.com/path?a=1&utm_source=news&utm_medium=email&utm_campaign=spring#cta',
    },
    screen: { width: 1920, height: 1080 },
  });

  vi.stubGlobal('document', {
    referrer: 'https://ref.example.com/',
  });

  vi.stubGlobal('navigator', {
    language: 'en-US',
  });
}

describe('events/event-builder', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    __resetEventBuilderStateForTests();
    stubBrowserGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    __resetEventBuilderStateForTests();
  });

  it('throws if site token is not configured', () => {
    expect(() => buildInternalEvent(EventTypes.CLICK)).toThrow(
      /Site token is not configured/,
    );
  });

  it('builds a complete internal event after configureSiteToken', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'event-uuid-1'),
    });

    configureSiteToken('site_token_123');

    const event = buildInternalEvent(EventTypes.CLICK, {
      plan: 'pro',
      trial: false,
    });

    expect(event).toEqual({
      event_id: 'event-uuid-1',
      event_type: EventTypes.CLICK,
      timestamp: 1_700_000_000_000,
      url: 'https://example.com/path',
      referrer: 'https://ref.example.com/',
      utm_source: 'news',
      utm_medium: 'email',
      utm_campaign: 'spring',
      properties: { plan: 'pro', trial: false },
    });
  });

  it('builds a custom event with a separate event name', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_001);
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'event-uuid-custom'),
    });

    configureSiteToken('site_token_123');

    const event = buildCustomEvent('audio_downloaded', {
      format: 'mp3',
    });

    expect(event).toEqual({
      event_id: 'event-uuid-custom',
      event_type: EventTypes.CUSTOM,
      event_name: 'audio_downloaded',
      timestamp: 1_700_000_000_001,
      url: 'https://example.com/path',
      referrer: 'https://ref.example.com/',
      utm_source: 'news',
      utm_medium: 'email',
      utm_campaign: 'spring',
      properties: { format: 'mp3' },
    });
  });

  it('uses getRandomValues fallback when randomUUID is unavailable', () => {
    const getRandomValues = vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i + 1;
      return arr;
    });

    vi.stubGlobal('crypto', {
      getRandomValues,
    });

    configureSiteToken('site_token_123');
    const event = buildInternalEvent('page_view');

    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(event.event_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('uses Math.random fallback when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    configureSiteToken('site_token_123');
    const event = buildInternalEvent('page_view');

    expect(event.event_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('falls back to safe defaults when browser globals are unavailable', () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'event-uuid-2'),
    });

    configureSiteToken('site_token_123');
    const event = buildInternalEvent(EventTypes.CLICK);

    expect(event.url).toBe('');
    expect(event.referrer).toBeUndefined();
  });
});
