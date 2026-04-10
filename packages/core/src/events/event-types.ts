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
  PAGE_LEAVE: 'page_leave' as EventType,
  CLICK: 'click' as EventType,
  FORM_SUBMIT: 'form_submit' as EventType,
  SCROLL: 'scroll' as EventType,
  MEDIA_PLAY: 'media_play' as EventType,
  MEDIA_PAUSE: 'media_pause' as EventType,
  MEDIA_SEEK: 'media_seek' as EventType,
  MEDIA_PROGRESS: 'media_progress' as EventType,
  MEDIA_BUFFER: 'media_buffer' as EventType,
  MEDIA_COMPLETE: 'media_complete' as EventType,
} as const;
