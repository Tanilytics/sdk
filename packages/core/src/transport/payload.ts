import type {
  IngestionEvent,
  IngestionPayload,
  SessionContext,
} from '../types';

export function buildSessionContext(): SessionContext {
  return {
    screen_width: readScreenWidth(),
    screen_height: readScreenHeight(),
    language: readLanguage(),
    timezone: readTimezone(),
  };
}

export function buildPayload(
  events: IngestionEvent[],
  visitorId: string,
  siteId: string,
): IngestionPayload {
  return {
    site_id: siteId,
    visitor_id: visitorId,
    session_context: buildSessionContext(),
    events,
  };
}

function readScreenWidth(): number {
  try {
    return window.screen.width;
  } catch {
    return 0;
  }
}

function readScreenHeight(): number {
  try {
    return window.screen.height;
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

function readTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}
