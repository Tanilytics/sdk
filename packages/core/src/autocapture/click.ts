import { EventTypes } from '../events/event-types';

type TrackFn = (
  eventType: string,
  properties?: Record<string, string | number | boolean | null>,
) => void;

interface ClickTrackerOptions {
  track: TrackFn;
}

// Elements that should never be tracked — privacy requirement
const IGNORED_INPUT_TYPES = new Set([
  'password',
  'email',
  'tel',
  'text',
  'search',
  'number',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'url',
  'color',
  'range',
  'file',
]);

const TRACKED_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT']);
const MAX_TEXT_LENGTH = 50;

let _track: TrackFn | null = null;
let _onClick: ((e: MouseEvent) => void) | null = null;

// Public API

export function attachClickTracker(opts: ClickTrackerOptions): void {
  if (_onClick !== null) return; // Already attached

  _track = opts.track;
  _onClick = handleClick;

  // Single delegated listener on document
  // Catches clicks on all elements including dynamically added ones
  document.addEventListener('click', _onClick, { capture: true });
}

export function detachClickTracker(): void {
  if (_onClick !== null) {
    document.removeEventListener('click', _onClick, { capture: true });
    _onClick = null;
  }
  _track = null;
}

// Click handler

function handleClick(event: MouseEvent): void {
  if (_track === null) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  // Walk up the DOM to find the nearest trackable element
  const element = findTrackableElement(target);
  if (!element) return;

  // Privacy check — never track clicks on sensitive inputs
  if (isSensitiveInput(element)) return;

  // Never track elements inside a form with a password field
  if (isInsidePasswordForm(element)) return;

  const properties = buildClickProperties(element);
  _track(EventTypes.CLICK, properties);
}

// DOM helpers

/**
 * Walks up the DOM from the clicked element to find
 * the nearest link, button, or explicitly tracked element.
 */
function findTrackableElement(target: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = target;

  // Walk up max 5 levels — avoids traversing the entire DOM
  for (let i = 0; i < 5; i++) {
    if (!current) return null;

    // Explicitly ignored element
    if (current.dataset.analyticsIgnore !== undefined) return null;

    // Explicitly tracked element
    if (current.dataset.analyticsTrack !== undefined) return current;

    // Naturally trackable element
    if (TRACKED_TAGS.has(current.tagName)) return current;

    current = current.parentElement;
  }

  return null;
}

function isSensitiveInput(element: HTMLElement): boolean {
  if (element.tagName !== 'INPUT') return false;
  const type = (element as HTMLInputElement).type?.toLowerCase();
  return IGNORED_INPUT_TYPES.has(type);
}

function isInsidePasswordForm(element: HTMLElement): boolean {
  const form = element.closest('form');
  if (!form) return false;
  return form.querySelector('input[type="password"]') !== null;
}

function buildClickProperties(
  element: HTMLElement,
): Record<string, string | number | boolean | null> {
  const tag = element.tagName.toLowerCase();
  const text = getElementText(element);
  const href = (element as HTMLAnchorElement).href ?? null;
  const isExternal = href ? isExternalLink(href) : false;

  return {
    tag,
    text,
    href,
    isExternal,
    elementId: element.id || null,
  };
}

function getElementText(element: HTMLElement): string {
  const text = (
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.textContent ||
    ''
  )
    .trim()
    .replaceAll(/\s+/g, ' ');

  return text.slice(0, MAX_TEXT_LENGTH);
}

function isExternalLink(href: string): boolean {
  try {
    const url = new URL(href);
    return url.hostname !== globalThis.location.hostname;
  } catch {
    return false;
  }
}
