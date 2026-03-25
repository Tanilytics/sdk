import type { EventType } from '../types';

/**
 * Canonical event type constants.
 *
 * Always use these instead of raw strings.
 * The type system will catch typos at compile time.
 *
 * @example
 * import { EventTypes } from '@analytics-sdk/core'
 * track(EventTypes.CUSTOM, { action: 'newsletter_signup' })
 */
export const EventTypes = {
  PAGE_VIEW: 'page_view' as EventType,
  SCROLL_DEPTH: 'scroll_depth' as EventType,
  TIME_ON_PAGE: 'time_on_page' as EventType,
  CLICK: 'click' as EventType,
  FORM_SUBMIT: 'form_submit' as EventType,
  MEDIA_PLAY: 'media_play' as EventType,
  MEDIA_PAUSE: 'media_pause' as EventType,
  MEDIA_SEEK: 'media_seek' as EventType,
  MEDIA_ENDED: 'media_ended' as EventType,
  MEDIA_PROGRESS: 'media_progress' as EventType,
  MEDIA_ERROR: 'media_error' as EventType,
  CUSTOM: 'custom' as EventType,
} as const;
