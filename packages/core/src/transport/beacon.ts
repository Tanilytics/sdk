import type { TrackingEvent } from '../types';

export interface BeaconResult {
  sent: boolean;
  reason?: string;
}


export function sendBeacon(
  events: TrackingEvent[],
  endpoint: string,
  siteToken: string,
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
    const payload = JSON.stringify({ events });

    const blob = new Blob([payload], { type: 'application/json' });

    const accepted = navigator.sendBeacon(buildBeaconUrl(endpoint, siteToken), blob);

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

function buildBeaconUrl(endpoint: string, siteToken: string): string {
  try {
    const url = new URL(endpoint);
    url.searchParams.set('st', siteToken);
    return url.toString();
  } catch {
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${separator}st=${encodeURIComponent(siteToken)}`;
  }
}