import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolvedConfig } from '../config/types';
import { EventTypes } from '../events/event-types';
import { attachPageViewTracker, detachPageViewTracker } from './page-view';

const configWithTimeOnPage = {
  autocapture: { timeOnPage: true },
} as ResolvedConfig;

const configWithoutTimeOnPage = {
  autocapture: { timeOnPage: false },
} as ResolvedConfig;

function createBrowserHarness(initialHref = 'https://example.com/start') {
  const listeners = new Map<string, Set<() => void>>();
  const location = {
    href: initialHref,
    pathname: new URL(initialHref).pathname,
  };

  function setHref(next: string | URL): void {
    const parsed = new URL(String(next), location.href);
    location.href = parsed.toString();
    location.pathname = parsed.pathname;
  }

  const historyObj = {
    pushState: vi.fn(
      (_state: unknown, _unused: string, url?: string | URL | null) => {
        if (url !== undefined && url !== null) {
          setHref(url);
        }
      },
    ),
    replaceState: vi.fn(
      (_state: unknown, _unused: string, url?: string | URL | null) => {
        if (url !== undefined && url !== null) {
          setHref(url);
        }
      },
    ),
  };

  const windowObj = {
    location,
    addEventListener: vi.fn((name: string, cb: () => void) => {
      const existing = listeners.get(name) ?? new Set<() => void>();
      existing.add(cb);
      listeners.set(name, existing);
    }),
    removeEventListener: vi.fn((name: string, cb: () => void) => {
      listeners.get(name)?.delete(cb);
    }),
  };

  vi.stubGlobal('window', windowObj);
  vi.stubGlobal('location', location);
  vi.stubGlobal('addEventListener', windowObj.addEventListener);
  vi.stubGlobal('removeEventListener', windowObj.removeEventListener);
  vi.stubGlobal('history', historyObj);
  vi.stubGlobal('document', { title: 'Initial title' });

  function dispatchPopState(): void {
    const handlers = listeners.get('popstate');
    if (!handlers) return;
    handlers.forEach((fn) => fn());
  }

  return {
    location,
    historyObj,
    windowObj,
    setHref,
    dispatchPopState,
  };
}

function setupTracker(
  config: ResolvedConfig,
  initialHref = 'https://example.com/start',
) {
  const harness = createBrowserHarness(initialHref);
  const track = vi.fn();
  attachPageViewTracker({ track, config });
  return { ...harness, track };
}

async function flushTimers(): Promise<void> {
  await vi.runAllTimersAsync();
}

function expectPageLeave(
  track: ReturnType<typeof vi.fn>,
  nth: number,
  navigationType: string,
): void {
  expect(track).toHaveBeenNthCalledWith(nth, EventTypes.PAGE_LEAVE, {
    navigationType,
  });
}

function expectPageView(
  track: ReturnType<typeof vi.fn>,
  nth: number,
  navigationType: string,
  title = 'Initial title',
): void {
  expect(track).toHaveBeenNthCalledWith(nth, EventTypes.PAGE_VIEW, {
    navigationType,
    title,
  });
}

describe('autocapture/page-view', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    detachPageViewTracker();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('patches and restores history on attach/detach', () => {
    const { historyObj, windowObj } = createBrowserHarness();
    const track = vi.fn();

    const originalPush = historyObj.pushState;
    const originalReplace = historyObj.replaceState;

    attachPageViewTracker({ track, config: configWithoutTimeOnPage });

    expect(historyObj.pushState).not.toBe(originalPush);
    expect(historyObj.replaceState).not.toBe(originalReplace);
    expect(windowObj.addEventListener).toHaveBeenCalledWith(
      'popstate',
      expect.any(Function),
    );

    detachPageViewTracker();

    // The module stores bound originals, so identity differs from the raw
    // function object captured pre-attach; behavior should still be restored.
    expect(historyObj.pushState).not.toBe(originalPush);
    expect(historyObj.replaceState).not.toBe(originalReplace);
    historyObj.pushState({}, '', '/restored-push');
    historyObj.replaceState({}, '', '/restored-replace');
    expect(originalPush).toHaveBeenCalledTimes(1);
    expect(originalReplace).toHaveBeenCalledTimes(1);
    expect(windowObj.removeEventListener).toHaveBeenCalledWith(
      'popstate',
      expect.any(Function),
    );
    expect(track).not.toHaveBeenCalled();
  });

  it('fires page_leave and page_view on pushState URL changes when timeOnPage is enabled', async () => {
    const { historyObj, track } = setupTracker(
      configWithTimeOnPage,
      'https://example.com/start',
    );

    historyObj.pushState({}, '', '/next');
    await flushTimers();

    expect(track).toHaveBeenCalledTimes(2);
    expectPageLeave(track, 1, 'push');
    expectPageView(track, 2, 'push');
  });

  it('fires only page_view on pushState when timeOnPage is disabled', async () => {
    const { historyObj, track } = setupTracker(
      configWithoutTimeOnPage,
      'https://example.com/start',
    );

    historyObj.pushState({}, '', '/next');
    await flushTimers();

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(EventTypes.PAGE_VIEW, {
      navigationType: 'push',
      title: 'Initial title',
    });
  });

  it('does not fire when URL does not change', async () => {
    const { historyObj, track } = setupTracker(
      configWithoutTimeOnPage,
      'https://example.com/same',
    );

    historyObj.pushState({}, '', 'https://example.com/same');
    await flushTimers();

    expect(track).not.toHaveBeenCalled();
  });

  it('does not fire on hash-only URL changes', async () => {
    const { historyObj, track } = setupTracker(
      configWithoutTimeOnPage,
      'https://example.com/page?a=1#old',
    );

    historyObj.pushState({}, '', 'https://example.com/page?a=1#new');
    await flushTimers();

    expect(track).not.toHaveBeenCalled();
  });

  it('suppresses replaceState when pathname does not change', async () => {
    const { historyObj, track } = setupTracker(
      configWithTimeOnPage,
      'https://example.com/page?a=1',
    );

    historyObj.replaceState({}, '', 'https://example.com/page?a=2');
    await flushTimers();

    expect(track).not.toHaveBeenCalled();

    historyObj.replaceState({}, '', 'https://example.com/other?a=2');
    await flushTimers();

    expect(track).toHaveBeenCalledTimes(2);
    expectPageLeave(track, 1, 'replace');
    expectPageView(track, 2, 'replace');
  });

  it('fires on popstate after URL changes', async () => {
    const { dispatchPopState, setHref, track } = setupTracker(
      configWithTimeOnPage,
      'https://example.com/a',
    );

    setHref('https://example.com/b');
    dispatchPopState();
    await flushTimers();

    expect(track).toHaveBeenCalledTimes(2);
    expectPageLeave(track, 1, 'pop');
    expectPageView(track, 2, 'pop');
  });

  it('clears pending debounce and prevents calls after detach', async () => {
    const { historyObj, track } = setupTracker(
      configWithoutTimeOnPage,
      'https://example.com/start',
    );

    historyObj.pushState({}, '', '/queued');
    detachPageViewTracker();

    await flushTimers();
    expect(track).not.toHaveBeenCalled();
  });

  it('is safe to attach and detach multiple times', async () => {
    const { historyObj, track } = setupTracker(
      configWithTimeOnPage,
      'https://example.com/one',
    );

    attachPageViewTracker({ track, config: configWithTimeOnPage });

    historyObj.pushState({}, '', '/two');
    await flushTimers();
    expect(track).toHaveBeenCalledTimes(2);

    detachPageViewTracker();
    detachPageViewTracker();

    historyObj.pushState({}, '', '/three');
    await flushTimers();
    expect(track).toHaveBeenCalledTimes(2);
  });
});
