import { EventTypes } from '../events/event-types';

type TrackFn = (
  eventType: string,
  properties?: Record<string, string | number | boolean | null>,
) => void;

interface ScrollDepthOptions {
  track: TrackFn;
}

const MILESTONES = [25, 50, 75, 100] as const;
type Milestone = (typeof MILESTONES)[number];

let _track: TrackFn | null = null;
let _observer: IntersectionObserver | null = null;
let _sentinels: HTMLElement[] = [];
const _milestonesReached = new Set<Milestone>();
let _pageLoadTime = 0;

// Public API

export function attachScrollDepthTracker(opts: ScrollDepthOptions): void {
  if (_observer !== null) return; // Already attached

  _track = opts.track;
  _pageLoadTime = Date.now();

  // IntersectionObserver is not available in all environments
  // Fail silently — scroll depth is non-critical
  if (typeof IntersectionObserver === 'undefined') return;

  _observer = new IntersectionObserver(handleIntersection, {
    // threshold: 0 means fire as soon as even 1px of the sentinel is visible
    threshold: 0,
    // Watch relative to the viewport
    root: null,
  });

  placeSentinels();
}

export function detachScrollDepthTracker(): void {
  if (_observer !== null) {
    _observer.disconnect();
    _observer = null;
  }

  removeSentinels();
  _milestonesReached.clear();
  _track = null;
}

/**
 * Called by the page view tracker when a new page view fires.
 * Resets milestones and repositions sentinels for the new page content.
 */
export function resetScrollDepth(): void {
  _milestonesReached.clear();
  _pageLoadTime = Date.now();
  removeSentinels();

  if (_observer !== null) {
    placeSentinels();
  }
}

// Sentinel placement
//
// Sentinels are invisible elements placed at each milestone depth.
// IntersectionObserver fires when they enter the viewport.
// This is far more performant than listening to scroll events.

function placeSentinels(): void {
  const documentHeight = getDocumentHeight();

  MILESTONES.forEach((milestone) => {
    const sentinel = document.createElement('div');

    sentinel.setAttribute('data-analytics-sentinel', String(milestone));
    sentinel.setAttribute('aria-hidden', 'true');

    // Position absolutely at the milestone depth
    Object.assign(sentinel.style, {
      position: 'absolute',
      top: `${(milestone / 100) * documentHeight}px`,
      left: '0',
      width: '1px',
      height: '1px',
      pointerEvents: 'none',
      opacity: '0',
    });

    document.body.appendChild(sentinel);
    _sentinels.push(sentinel);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    _observer!.observe(sentinel);
  });
}

function removeSentinels(): void {
  _sentinels.forEach((sentinel) => {
    if (sentinel.parentNode) {
      sentinel.parentNode.removeChild(sentinel);
    }
    _observer?.unobserve(sentinel);
  });
  _sentinels = [];
}

// Intersection handler

function handleIntersection(entries: IntersectionObserverEntry[]): void {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    const milestoneStr = entry.target.getAttribute('data-analytics-sentinel');
    if (!milestoneStr) return;

    const milestone = parseInt(milestoneStr, 10) as Milestone;

    // Fire each milestone exactly once per page view
    if (_milestonesReached.has(milestone)) return;
    _milestonesReached.add(milestone);

    if (_track === null) return;

    _track(EventTypes.SCROLL, {
      milestone,
      timeToReach: Date.now() - _pageLoadTime,
    });
  });
}

// Helpers

function getDocumentHeight(): number {
  return Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.clientHeight,
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight,
  );
}
