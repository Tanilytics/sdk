// ─────────────────────────────────────────────────────────────────────────────
// Public API surface for @analytics-sdk/core
//
// Only symbols exported from this file are part of the public API.
// Consumers import from '@analytics-sdk/core' — never from internal paths.
// Adding something here is a commitment to support it across versions.
// ─────────────────────────────────────────────────────────────────────────────

// ── Core functions ────────────────────────────────────────────────────────────
export { init, track, flush, destroy } from './tracker';

// ── Privacy functions ─────────────────────────────────────────────────────────
// Re-exported from tracker.ts which re-exports them from privacy/
export {
  optOut,
  optIn,
  isOptedOut,
  giveConsent,
  withdrawConsent,
} from './privacy';

// ── Constants ─────────────────────────────────────────────────────────────────
export { EventTypes } from './events/event-types';
export { SDK_VERSION } from './version';

// ── Types ─────────────────────────────────────────────────────────────────────
// Everything a consumer might need to type their own code
export type {
  TrackingEvent,
  EventType,
  EventProperties,
  MediaAdapterInterface,
} from './types';
export type { AnalyticsConfig } from './config/types';
