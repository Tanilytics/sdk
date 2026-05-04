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

// Public API

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
  globalThis.addEventListener('pagehide', _onPageHide);
}

export function detachTimeOnPageTracker(): void {
  // Fire final page_leave event before detaching
  flushActiveTime();

  if (_onVisibilityChange !== null) {
    document.removeEventListener('visibilitychange', _onVisibilityChange);
    _onVisibilityChange = null;
  }

  if (_onPageHide !== null) {
    globalThis.removeEventListener('pagehide', _onPageHide);
    _onPageHide = null;
  }

  _track = null;
  _activeTime = 0;
  _visibleSince = null;
}

/**
 * Accumulates active time and returns the duration spent on the current page.
 * Called by the tracker on SPA navigation to enrich the PAGE_LEAVE event
 * with duration data. Does NOT fire a PAGE_LEAVE event — the caller is
 * responsible for that.
 *
 * Returns null when the accumulated time is below the 1-second minimum
 * threshold, indicating the visit was too short to be meaningful.
 */
export function flushTimeOnPage(): number | null {
  accumulateActiveTime();

  const duration = _activeTime;
  _activeTime = 0;

  return duration >= 1000 ? duration : null;
}

/**
 * Called by the page view tracker when a new SPA navigation occurs.
 * Resets the timer for the new page without firing a PAGE_LEAVE event.
 * (PAGE_LEAVE is now fired by the page-view tracker; time-on-page only
 * contributes duration data via flushTimeOnPage.)
 */
export function resetTimeOnPage(): void {
  _activeTime = 0;
  _visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
}

// Visibility handlers

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

// Time accumulation

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
