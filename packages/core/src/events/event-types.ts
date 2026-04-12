import type { InternalEventType } from '../types';

/**
 * Canonical event type constants.
 *
 * Always use these instead of raw strings.
 * They are intended for SDK-controlled internal events such as autocapture.
 *
 * @example
 * import analytics from '@analytics-sdk/core'
 * analytics.track('audio_downloaded', { format: 'mp3' })
 */
export const EventTypes = {
  PAGE_VIEW: 'page_view' as InternalEventType,
  PAGE_LEAVE: 'page_leave' as InternalEventType,
  CLICK: 'click' as InternalEventType,
  FORM_SUBMIT: 'form_submit' as InternalEventType,
  SCROLL: 'scroll' as InternalEventType,
  MEDIA_PLAY: 'media_play' as InternalEventType,
  MEDIA_PAUSE: 'media_pause' as InternalEventType,
  MEDIA_SEEK: 'media_seek' as InternalEventType,
  MEDIA_PROGRESS: 'media_progress' as InternalEventType,
  MEDIA_BUFFER: 'media_buffer' as InternalEventType,
  MEDIA_COMPLETE: 'media_complete' as InternalEventType,
  CUSTOM: 'custom' as const,
} as const;
