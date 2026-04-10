import type { IngestionEvent } from '../types';
import { buildPayload } from './payload';

export interface BeaconResult {
  sent: boolean;
  reason?: string;
}

export function sendBeacon(
  events: IngestionEvent[],
  endpoint: string,
  siteToken: string,
  visitorId: string
): BeaconResult {
  // Beacon is not available in all environments
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.sendBeacon !== 'function'
  ) {
    return { sent: false, reason: 'sendBeacon not available' };
  }

  if (events.length === 0) {
    return { sent: true };
  }

  try {
    const payload = JSON.stringify(buildPayload(events, visitorId, siteToken));

    const blob = new Blob([payload], { type: 'application/json' });

    const accepted = navigator.sendBeacon(buildBeaconUrl(endpoint), blob);

    if (!accepted) {
      return {
        sent: false,
        reason: 'Browser rejected beacon — payload may be too large',
      };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: `Beacon error: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
}

function buildBeaconUrl(endpoint: string): string {
  const url = new URL(endpoint);
  return url.toString();
}
