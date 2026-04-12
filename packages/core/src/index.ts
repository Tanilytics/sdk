// Public API surface for @analytics-sdk/core
//
// Only symbols exported from this file are part of the public API.
// Consumers import from '@analytics-sdk/core' — never from internal paths.
// Adding something here is a commitment to support it across versions.

import { EventTypes } from './events/event-types';
import {
  giveConsent,
  isOptedOut,
  optIn,
  optOut,
  withdrawConsent,
} from './privacy';
import { destroy, flush, init, track } from './tracker';
import { SDK_VERSION } from './version';

const analytics = {
  init,
  track,
  flush,
  destroy,
  optOut,
  optIn,
  isOptedOut,
  giveConsent,
  withdrawConsent,
  EventTypes,
  SDK_VERSION,
} as const;

export default analytics;

// Types
// Everything a consumer might need to type their own code
export type {
  TrackingEvent,
  EventType,
  EventProperties,
  IngestionEvent,
  IngestionPayload,
  SessionContext,
  MediaAdapterInterface,
} from './types';
export type { AnalyticsConfig } from './config/types';
