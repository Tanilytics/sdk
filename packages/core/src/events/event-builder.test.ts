import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/device', () => ({
  getDeviceType: vi.fn(() => 'desktop'),
}));

import { SDK_VERSION } from '../version';
import {
  __resetEventBuilderStateForTests,
  buildEvent,
  configureSiteToken,
} from './event-builder';

function stubBrowserGlobals() {
  vi.stubGlobal('window', {
    location: { href: 'https://example.com/path?a=1' },
    screen: { width: 1920 },
    innerWidth: 1280,
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
    expect(() => buildEvent('custom', 'session-1')).toThrow(
      /Site token is not configured/
    );
  });

  it('builds a complete event after configureSiteToken', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'event-uuid-1'),
    });

    configureSiteToken('site_token_123');

    const event = buildEvent('custom', 'session-abc', {
      plan: 'pro',
      trial: false,
    });

    expect(event).toEqual({
      eventId: 'event-uuid-1',
      siteToken: 'site_token_123',
      eventType: 'custom',
      clientTimestamp: 1_700_000_000_000,
      url: 'https://example.com/path?a=1',
      referrer: 'https://ref.example.com/',
      sessionId: 'session-abc',
      deviceType: 'desktop',
      screenWidth: 1920,
      viewportWidth: 1280,
      language: 'en-US',
      sdkVersion: SDK_VERSION,
      properties: { plan: 'pro', trial: false },
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
    const event = buildEvent('page_view', 'session-abc');

    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('uses Math.random fallback when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    configureSiteToken('site_token_123');
    const event = buildEvent('page_view', 'session-abc');

    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
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
    const event = buildEvent('custom', 'session-abc');

    expect(event.url).toBe('');
    expect(event.referrer).toBe('');
    expect(event.screenWidth).toBe(0);
    expect(event.viewportWidth).toBe(0);
    expect(event.language).toBe('');
  });
});
