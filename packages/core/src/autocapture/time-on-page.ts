import { EventTypes } from '../events/event-types';

type TrackFn = (
  eventType: string,
  properties?: Record<string, string | number | boolean | null>,
) => void;

interface TimeOnPageOptions {
  track: TrackFn;
}

let _track: TrackFn | null = null;
let _activeTime = 0; // Accumulated active milliseconds
let _visibleSince: number | null = null; // When the page last became visible

let _onVisibilityChange: (() => void) | null = null;
let _onPageHide: (() => void) | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function attachTimeOnPageTracker(opts: TimeOnPageOptions): void {
  if (_onVisibilityChange !== null) return; // Already attached

  _track = opts.track;

  // Start the timer if page is already visible
  if (document.visibilityState === 'visible') {
    _visibleSince = Date.now();
  }

  _onVisibilityChange = handleVisibilityChange;
  _onPageHide = handlePageHide;

  document.addEventListener('visibilitychange', _onVisibilityChange);
  window.addEventListener('pagehide', _onPageHide);
}

export function detachTimeOnPageTracker(): void {
  // Fire final page_leave event before detaching
  flushActiveTime();

  if (_onVisibilityChange !== null) {
    document.removeEventListener('visibilitychange', _onVisibilityChange);
    _onVisibilityChange = null;
  }

  if (_onPageHide !== null) {
    window.removeEventListener('pagehide', _onPageHide);
    _onPageHide = null;
  }

  _track = null;
  _activeTime = 0;
  _visibleSince = null;
}

/**
 * Called by the page view tracker when a new SPA navigation occurs.
 * Fires the accumulated time for the previous page and resets for the new one.
 */
export function resetTimeOnPage(): void {
  // Fire accumulated time for the page we are leaving
  flushActiveTime();

  // Reset for the new page
  _activeTime = 0;
  _visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    // Page going to background — accumulate time since it became visible
    accumulateActiveTime();
  } else {
    // Page coming back to foreground — start the timer again
    _visibleSince = Date.now();
  }
}

function handlePageHide(): void {
  // Page is being unloaded — fire the final page_leave event
  accumulateActiveTime();
  flushActiveTime();
}

// ─────────────────────────────────────────────────────────────────────────────
// Time accumulation
// ─────────────────────────────────────────────────────────────────────────────

function accumulateActiveTime(): void {
  if (_visibleSince === null) return;
  _activeTime += Date.now() - _visibleSince;
  _visibleSince = null;
}

function flushActiveTime(): void {
  // Only fire if the user spent meaningful time on the page
  // Anything under 1 second is probably a redirect or accidental visit
  if (_activeTime < 1000 || _track === null) return;

  _track(EventTypes.PAGE_LEAVE, {
    duration: _activeTime,
  });

  _activeTime = 0;
}
