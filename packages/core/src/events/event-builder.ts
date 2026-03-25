import type { TrackingEvent, EventType, EventProperties } from '../types';
import { getDeviceType } from '../config/device';
import { SDK_VERSION } from '../version';

let _siteToken = '';

/**
 * Called once by the Tracker during init().
 * Injects the site token so buildEvent() does not need it as an argument.
 */
export function configureSiteToken(token: string): void {
  _siteToken = token;
}

/**
 * Internal testing helper to clear module state between tests.
 * Not part of the public SDK API.
 */
export function __resetEventBuilderStateForTests(): void {
  _siteToken = '';
}

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
  properties?: EventProperties
): TrackingEvent {
  if (_siteToken.trim().length === 0) {
    throw new Error(
      '[AnalyticsSDK] Site token is not configured. ' +
        'Ensure init() has been called before tracking events.'
    );
  }

  return {
    // Identity
    eventId: generateEventId(),
    siteToken: _siteToken,
    eventType,

    // Timing
    clientTimestamp: Date.now(),

    // Page context
    url: readUrl(),
    referrer: readReferrer(),

    // Session
    sessionId,

    // Device
    deviceType: getDeviceType(),
    screenWidth: readScreenWidth(),
    viewportWidth: readViewportWidth(),
    language: readLanguage(),

    // SDK metadata
    sdkVersion: SDK_VERSION,

    // Optional payload
    properties,
  };
}

function generateEventId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID.
  // Use getRandomValues when available before Math.random.
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
      ''
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last-resort fallback
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
