import type {
  IngestionEvent,
  InternalEventType,
  EventProperties,
} from '../types';

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
 * Builds a single SDK-controlled ingestion event item.
 */
export function buildInternalEvent(
  eventType: InternalEventType,
  properties?: EventProperties,
): IngestionEvent {
  const event = buildBaseEvent(eventType);

  attachProperties(event, properties);

  return event;
}

/**
 * Builds a custom caller-defined ingestion event item.
 */
export function buildCustomEvent(
  eventName: string,
  properties?: EventProperties,
): IngestionEvent {
  const event = buildBaseEvent('custom');
  event.event_name = eventName;

  attachProperties(event, properties);

  return event;
}

function buildBaseEvent(
  eventType: IngestionEvent['event_type'],
): IngestionEvent {
  if (_siteToken.trim().length === 0) {
    throw new Error(
      '[AnalyticsSDK] Site token is not configured. ' +
        'Ensure init() has been called before tracking events.',
    );
  }

  const event: IngestionEvent = {
    event_id: generateEventId(),
    event_type: eventType,
    timestamp: Date.now(),
    url: readUrl(),
  };

  const referrer = readReferrer();
  if (referrer !== '') {
    event.referrer = referrer;
  }

  const { utmSource, utmMedium, utmCampaign } = readUtmParameters();
  if (utmSource !== undefined) event.utm_source = utmSource;
  if (utmMedium !== undefined) event.utm_medium = utmMedium;
  if (utmCampaign !== undefined) event.utm_campaign = utmCampaign;

  return event;
}

function attachProperties(
  event: IngestionEvent,
  properties?: EventProperties,
): void {
  if (properties !== undefined && Object.keys(properties).length > 0) {
    event.properties = properties;
  }
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
      '',
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16,
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
    const url = new URL(window.location.href);

    // clean up the url to return only canonical URL string
    url.search = '';
    url.hash = '';

    return url.toString();
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

function readUtmParameters(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
} {
  try {
    const params = new URL(window.location.href).searchParams;

    return {
      utmSource: params.get('utm_source') ?? undefined,
      utmMedium: params.get('utm_medium') ?? undefined,
      utmCampaign: params.get('utm_campaign') ?? undefined,
    };
  } catch {
    return {};
  }
}
