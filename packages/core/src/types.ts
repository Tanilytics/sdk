/**
 * Fixed event types emitted by SDK internals such as autocapture.
 * Keep this aligned with the server-side enum.
 */
export type InternalEventType =
  | 'page_view'
  | 'page_leave'
  | 'click'
  | 'form_submit'
  | 'scroll'
  | 'media_play'
  | 'media_pause'
  | 'media_seek'
  | 'media_progress'
  | 'media_buffer'
  | 'media_complete';

/**
 * Event types accepted by the ingestion service.
 * Custom caller-defined names are represented by event_type='custom'
 * and a separate event_name field.
 */
export type EventType = InternalEventType | 'custom';

/**
 * Arbitrary properties attached to an event by the caller.
 * The ingestion schema allows an object without further constraints.
 */
export type EventProperties = Record<string, unknown>;

export interface SessionContext {
  screen_width: number;
  screen_height: number;
  language: string;
  timezone: string;
}

/**
 * A single ingestion event item.
 * Produced by buildEvent(). Never mutated after creation.
 */
export interface IngestionEvent {
  event_id: string;
  event_type: EventType;
  event_name?: string;
  timestamp: number;
  url: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  properties?: EventProperties;
}

/**
 * Top-level payload sent to the ingestion service.
 */
export interface IngestionPayload {
  site_id: string;
  visitor_id: string;
  session_context: SessionContext;
  events: IngestionEvent[];
}

/**
 * Backwards-compatible alias for the ingestion event shape.
 * The SDK now uses ingestion-aligned fields internally.
 */
export type TrackingEvent = IngestionEvent;

/**
 * Interface every media adapter must implement.
 * Allows the core SDK to treat all adapters identically.
 */
export interface MediaAdapterInterface {
  readonly name: string;
  attach(): void;
  detach(): void;
}
