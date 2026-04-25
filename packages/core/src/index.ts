// Public API surface for tanilytics
//
// Only symbols exported from this file are part of the public API.
// Consumers import from 'tanilytics' — never from internal paths.
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
import { VERSION } from './version';

const tanilytics = {
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
  VERSION,
} as const;

export default tanilytics;

// Types
// Everything a consumer might need to type their own code
export type {
  TrackingEvent,
  EventType,
  EventProperties,
  IngestionEvent,
  IngestionPayload,
  SessionContext,
  MediaAdapterApi,
  MediaAdapterInterface,
  MediaEventType,
} from './types';
export type { TanilyticsConfig } from './config/types';
