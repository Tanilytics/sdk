import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionManager } from './session-manager';

const SESSION_KEY = 'tanilytics_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

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

describe('session/SessionManager', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates and persists a fresh session when storage is empty', () => {
    const { store } = stubSessionStorage();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const randomUUID = vi.fn().mockReturnValue('session-fresh');
    vi.stubGlobal('crypto', { randomUUID });

    const manager = new SessionManager();
    const snapshot = manager.getSnapshot();

    expect(snapshot).toEqual({
      sessionId: 'session-fresh',
      startedAt: 1000,
      lastActivityAt: 1000,
    });

    expect(JSON.parse(store.get(SESSION_KEY) ?? '{}')).toEqual(snapshot);
    expect(nowSpy).toHaveBeenCalled();
  });

  it('loads an existing unexpired session from storage', () => {
    const { store, sessionStorageMock } = stubSessionStorage();
    store.set(
      SESSION_KEY,
      JSON.stringify({
        sessionId: 'existing-session',
        startedAt: 1_000,
        lastActivityAt: 5_000,
      }),
    );

    vi.spyOn(Date, 'now').mockReturnValue(5_001);
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('new-session'),
    });

    const manager = new SessionManager();

    expect(manager.getSnapshot().sessionId).toBe('existing-session');
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('clears expired stored session and creates a new one', () => {
    const { store, sessionStorageMock } = stubSessionStorage();
    store.set(
      SESSION_KEY,
      JSON.stringify({
        sessionId: 'expired-session',
        startedAt: 1_000,
        lastActivityAt: 1_000,
      }),
    );

    vi.spyOn(Date, 'now').mockReturnValue(1_000 + SESSION_TIMEOUT_MS + 1);
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('new-session'),
    });

    const manager = new SessionManager();

    expect(manager.getSnapshot().sessionId).toBe('new-session');
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(SESSION_KEY);
    expect(sessionStorageMock.setItem).toHaveBeenCalled();
  });

  it('updates lastActivityAt while keeping session id for non-expired access', () => {
    const { store } = stubSessionStorage();
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(10_000);

    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('stable-session'),
    });
    const manager = new SessionManager();

    nowSpy.mockReturnValue(10_500);
    const id = manager.getSessionId();

    expect(id).toBe('stable-session');
    expect(manager.getSnapshot().lastActivityAt).toBe(10_500);

    const persisted = JSON.parse(store.get(SESSION_KEY) ?? '{}') as {
      lastActivityAt: number;
    };
    expect(persisted.lastActivityAt).toBe(10_500);
  });

  it('does not expire at exactly timeout boundary', () => {
    stubSessionStorage();
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);

    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('session-a')
        .mockReturnValueOnce('session-b'),
    });

    const manager = new SessionManager();

    nowSpy.mockReturnValue(1_000 + SESSION_TIMEOUT_MS);
    const id = manager.getSessionId();

    expect(id).toBe('session-a');
  });

  it('starts a new session after timeout boundary is exceeded', () => {
    stubSessionStorage();
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);

    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('session-a')
        .mockReturnValueOnce('session-b'),
    });

    const manager = new SessionManager();

    nowSpy.mockReturnValue(1_000 + SESSION_TIMEOUT_MS + 1);
    const id = manager.getSessionId();

    expect(id).toBe('session-b');
    expect(manager.getSnapshot().sessionId).toBe('session-b');
  });

  it('returns a snapshot copy that does not mutate internal state', () => {
    stubSessionStorage();
    vi.spyOn(Date, 'now').mockReturnValue(2_000);
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('session-copy'),
    });

    const manager = new SessionManager();
    const snapshot = manager.getSnapshot() as { sessionId: string };

    snapshot.sessionId = 'mutated';

    expect(manager.getSnapshot().sessionId).toBe('session-copy');
  });

  it('works when sessionStorage is unavailable', () => {
    vi.stubGlobal('sessionStorage', undefined);
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(20_000);

    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('no-storage-session'),
    });

    const manager = new SessionManager();

    expect(manager.getSessionId()).toBe('no-storage-session');
  });
});
