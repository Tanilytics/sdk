import type {
  IngestionEvent,
  InternalEventType,
  EventProperties,
} from '../types';
import { generateSecureUuid } from '../random';

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
    event_id: generateSecureUuid(),
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
