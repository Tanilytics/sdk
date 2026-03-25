import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  computeIsTrackingAllowed,
  configureSignals,
  hasConsent,
  isDoNotTrackEnabled,
  isOptedOut,
} from './signals';

function stubLocalStorage() {
  const store = new Map<string, string>();

  const localStorageMock = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
  };

  vi.stubGlobal('localStorage', localStorageMock);

  return { store };
}

function setNavigatorDoNotTrack(doNotTrack?: string, msDoNotTrack?: string) {
  vi.stubGlobal('navigator', {
    doNotTrack,
    msDoNotTrack,
  });
}

describe('privacy/signals', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubLocalStorage();
    configureSignals({ requireConsent: false, respectDoNotTrack: true });
  });

  it('reads opt-out and consent status from storage', () => {
    const { store } = stubLocalStorage();
    store.set('tanilytics_optout', '1');
    store.set('tanilytics_consent', '1');

    expect(isOptedOut()).toBe(true);
    expect(hasConsent()).toBe(true);
  });

  it('detects do-not-track from standard and legacy fields', () => {
    setNavigatorDoNotTrack('1');
    expect(isDoNotTrackEnabled()).toBe(true);

    setNavigatorDoNotTrack('0', '1');
    expect(isDoNotTrackEnabled()).toBe(true);

    setNavigatorDoNotTrack('0', '0');
    expect(isDoNotTrackEnabled()).toBe(false);

    vi.stubGlobal('navigator', undefined);
    expect(isDoNotTrackEnabled()).toBe(false);
  });

  it('applies precedence: opt-out, then dnt, then consent', () => {
    const { store } = stubLocalStorage();

    configureSignals({ requireConsent: false, respectDoNotTrack: true });
    setNavigatorDoNotTrack('0');
    expect(computeIsTrackingAllowed()).toBe(true);

    store.set('tanilytics_optout', '1');
    expect(computeIsTrackingAllowed()).toBe(false);

    store.delete('tanilytics_optout');
    setNavigatorDoNotTrack('1');
    expect(computeIsTrackingAllowed()).toBe(false);

    setNavigatorDoNotTrack('0');
    configureSignals({ requireConsent: true, respectDoNotTrack: true });
    expect(computeIsTrackingAllowed()).toBe(false);

    store.set('tanilytics_consent', '1');
    expect(computeIsTrackingAllowed()).toBe(true);
  });

  it('ignores DNT when respectDoNotTrack is disabled', () => {
    const { store } = stubLocalStorage();
    store.set('tanilytics_consent', '1');

    configureSignals({ requireConsent: true, respectDoNotTrack: false });
    setNavigatorDoNotTrack('1');

    expect(computeIsTrackingAllowed()).toBe(true);
  });
});
