import type { TrackingEvent, EventType, EventProperties } from '../types';
//import { getDeviceType } from '../config/device';
//import { SDK_VERSION } from '../version';


let _siteToken = '';

/**
 * Called once by the Tracker during init().
 * Injects the site token so buildEvent() does not need it as an argument.
 */
export function configureSiteToken(token: string): void {
  _siteToken = token;
}

// ─────────────────────────────────────────────────────────────────────────────
// The main function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a complete TrackingEvent from minimal inputs.
 *
 * The caller provides:
 *   - eventType  → what kind of event
 *   - sessionId  → which session it belongs to
 *   - properties → optional event-specific data
 *
 * Everything else is read from the browser environment or module state.
 *
 * @example
 * const event = buildEvent('page_view', 'session-abc123')
 * const event = buildEvent('scroll_depth', 'session-abc123', { milestone: 50 })
 */
export function buildEvent(
  eventType: EventType,
  sessionId: string,
  properties?: EventProperties,
): TrackingEvent {
  return {
    // Identity
    eventId:         generateEventId(),
    siteToken:       _siteToken,
    eventType,

    // Timing
    clientTimestamp: Date.now(),

    // Page context
    url:             readUrl(),
    referrer:        readReferrer(),

    // Session
    sessionId,

    // Device
    deviceType:      getDeviceType(),
    screenWidth:     readScreenWidth(),
    viewportWidth:   readViewportWidth(),
    language:        readLanguage(),

    // SDK metadata
    //sdkVersion:      SDK_VERSION,

    // Optional payload
    properties,
  };
}

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readUrl(): string {
  try {
    return window.location.href;
  } catch {
    return '';
  }
}

function readReferrer(): string {
  try {
    return document.referrer ?? '';
  } catch {
    return '';
  }
}

function readScreenWidth(): number {
  try {
    return window.screen.width;
  } catch {
    return 0;
  }
}

function readViewportWidth(): number {
  try {
    return window.innerWidth;
  } catch {
    return 0;
  }
}

function readLanguage(): string {
  try {
    return navigator.language ?? '';
  } catch {
    return '';
  }
}