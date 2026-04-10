import type { SessionData } from './session-manager';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSession, loadSession, saveSession } from './session-storage';

const SESSION_KEY = 'tanilytics_session';

function stubSessionStorage() {
  const store = new Map<string, string>();

  const sessionStorageMock = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
  };

  vi.stubGlobal('sessionStorage', sessionStorageMock);
  return { store, sessionStorageMock };
}

describe('session/session-storage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when no stored session exists', () => {
    stubSessionStorage();

    expect(loadSession()).toBeNull();
  });

  it('returns null for malformed or invalid session data', () => {
    const { store } = stubSessionStorage();

    store.set(SESSION_KEY, '{not-json');
    expect(loadSession()).toBeNull();

    store.set(
      SESSION_KEY,
      JSON.stringify({ sessionId: '', startedAt: 1, lastActivityAt: 1 }),
    );
    expect(loadSession()).toBeNull();

    store.set(
      SESSION_KEY,
      JSON.stringify({ sessionId: 's1', startedAt: '1', lastActivityAt: 1 }),
    );
    expect(loadSession()).toBeNull();
  });

  it('loads a valid stored session', () => {
    const { store } = stubSessionStorage();
    const expected: SessionData = {
      sessionId: 'session_1',
      startedAt: 1000,
      lastActivityAt: 2000,
    };

    store.set(SESSION_KEY, JSON.stringify(expected));

    expect(loadSession()).toEqual(expected);
  });

  it('persists session data and clears it', () => {
    const { store } = stubSessionStorage();
    const session: SessionData = {
      sessionId: 'session_2',
      startedAt: 111,
      lastActivityAt: 222,
    };

    saveSession(session);
    expect(store.get(SESSION_KEY)).toBe(JSON.stringify(session));

    clearSession();
    expect(store.has(SESSION_KEY)).toBe(false);
  });

  it('swallows storage write and clear errors', () => {
    const { sessionStorageMock } = stubSessionStorage();

    sessionStorageMock.setItem.mockImplementation(() => {
      throw new Error('blocked setItem');
    });
    sessionStorageMock.removeItem.mockImplementation(() => {
      throw new Error('blocked removeItem');
    });

    expect(() =>
      saveSession({
        sessionId: 'session_3',
        startedAt: 1,
        lastActivityAt: 1,
      }),
    ).not.toThrow();

    expect(() => clearSession()).not.toThrow();
  });
});
