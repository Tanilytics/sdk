import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearConsent,
  clearOptOut,
  readConsent,
  readOptOut,
  writeConsent,
  writeOptOut,
} from './storage';

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
    clear: vi.fn(() => {
      store.clear();
    }),
  };

  vi.stubGlobal('localStorage', localStorageMock);

  return { store, localStorageMock };
}

describe('privacy/storage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads opt-out and consent flags from storage keys', () => {
    const { store } = stubLocalStorage();
    store.set('tanilytics_optout', '1');
    store.set('tanilytics_consent', '1');

    expect(readOptOut()).toBe(true);
    expect(readConsent()).toBe(true);
  });

  it('returns false on missing keys or read errors', () => {
    const { localStorageMock } = stubLocalStorage();

    expect(readOptOut()).toBe(false);
    expect(readConsent()).toBe(false);

    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('read blocked');
    });

    expect(readOptOut()).toBe(false);
    expect(readConsent()).toBe(false);
  });

  it('writes opt-out and consent values', () => {
    const { store } = stubLocalStorage();

    writeOptOut();
    writeConsent();

    expect(store.get('tanilytics_optout')).toBe('1');
    expect(store.get('tanilytics_consent')).toBe('1');
  });

  it('throws descriptive errors when writes fail', () => {
    const { localStorageMock } = stubLocalStorage();
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => writeOptOut()).toThrow(/Could not persist opt-out/);
    expect(() => writeConsent()).toThrow(/Could not persist consent/);
  });

  it('clears keys and ignores clear failures', () => {
    const { store, localStorageMock } = stubLocalStorage();
    store.set('tanilytics_optout', '1');
    store.set('tanilytics_consent', '1');

    clearOptOut();
    clearConsent();

    expect(store.has('tanilytics_optout')).toBe(false);
    expect(store.has('tanilytics_consent')).toBe(false);

    localStorageMock.removeItem.mockImplementation(() => {
      throw new Error('remove blocked');
    });

    expect(() => clearOptOut()).not.toThrow();
    expect(() => clearConsent()).not.toThrow();
  });

  it('keeps opt-out and consent operations isolated', () => {
    const { store } = stubLocalStorage();

    writeOptOut();
    expect(store.get('tanilytics_optout')).toBe('1');
    expect(store.has('tanilytics_consent')).toBe(false);

    writeConsent();
    expect(store.get('tanilytics_consent')).toBe('1');

    clearOptOut();
    expect(store.has('tanilytics_optout')).toBe(false);
    expect(store.get('tanilytics_consent')).toBe('1');
  });
});
