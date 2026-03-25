import { EventTypes } from '../events/event-types';
import type { ResolvedConfig } from '../config/types';

type TrackFn = (
  eventType: string,
  properties?: Record<string, string | number | boolean | null>
) => void;

interface PageViewTrackerOptions {
  track: TrackFn;
  config: ResolvedConfig;
}

let _originalPushState: typeof history.pushState | null = null;
let _originalReplaceState: typeof history.replaceState | null = null;

let _lastUrl = '';

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

let _onPopState: (() => void) | null = null;

let _track: TrackFn | null = null;

export function attachPageViewTracker(opts: PageViewTrackerOptions): void {
  _track = opts.track;
  _lastUrl = window.location.href;

  patchHistory();
  attachPopStateListener();
}

export function detachPageViewTracker(): void {
  restoreHistory();
  detachPopStateListener();
  clearDebounce();

  _track = null;
  _lastUrl = '';
}

function patchHistory(): void {
  if (_originalPushState !== null) return;

  _originalPushState = history.pushState.bind(history);
  _originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (
    state: unknown,
    unused: string,
    url?: string | URL | null
  ): void {
    _originalPushState!(state, unused, url);
    handleNavigation('push');
  };

  history.replaceState = function (
    state: unknown,
    unused: string,
    url?: string | URL | null
  ): void {
    _originalReplaceState!(state, unused, url);
    handleNavigation('replace');
  };
}

function restoreHistory(): void {
  if (_originalPushState !== null) {
    history.pushState = _originalPushState;
    _originalPushState = null;
  }
  if (_originalReplaceState !== null) {
    history.replaceState = _originalReplaceState;
    _originalReplaceState = null;
  }
}

function attachPopStateListener(): void {
  _onPopState = () => handleNavigation('pop');
  window.addEventListener('popstate', _onPopState);
}

function detachPopStateListener(): void {
  if (_onPopState !== null) {
    window.removeEventListener('popstate', _onPopState);
    _onPopState = null;
  }
}

type NavigationType = 'push' | 'replace' | 'pop';

function handleNavigation(type: NavigationType): void {
  clearDebounce();
  _debounceTimer = setTimeout(() => {
    fireIfUrlChanged(type);
  }, 50);
}

function fireIfUrlChanged(type: NavigationType): void {
  const currentUrl = window.location.href;
  const currentPathname = window.location.pathname;
  const lastPathname = extractPathname(_lastUrl);

  if (currentUrl === _lastUrl) return;

  if (onlyHashChanged(_lastUrl, currentUrl)) return;

  if (type === 'replace' && currentPathname === lastPathname) return;

  _lastUrl = currentUrl;

  setTimeout(() => {
    if (_track === null) return;
    _track(EventTypes.PAGE_VIEW, {
      navigationType: type,
      title: document.title,
    });
  }, 0);
}

function onlyHashChanged(previousUrl: string, currentUrl: string): boolean {
  try {
    const prev = new URL(previousUrl);
    const curr = new URL(currentUrl);
    // Same origin, same pathname, same search — only hash differs
    return (
      prev.origin === curr.origin &&
      prev.pathname === curr.pathname &&
      prev.search === curr.search &&
      prev.hash !== curr.hash
    );
  } catch {
    return false;
  }
}

function extractPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function clearDebounce(): void {
  if (_debounceTimer !== null) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
}
