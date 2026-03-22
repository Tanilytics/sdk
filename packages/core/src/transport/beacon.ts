import type { TrackingEvent } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Beacon API — used during page unload
//
// navigator.sendBeacon() is specifically designed for sending data
// when a page is closing. Unlike fetch(), it:
//   - Completes even after the page is destroyed
//   - Is fire-and-forget — no response, no retry
//   - Has a size limit (~64KB depending on browser)
//
// Use this only for the final flush on page unload.
// Use sender.ts for all normal flushes.
// ─────────────────────────────────────────────────────────────────────────────

export interface BeaconResult {
  sent: boolean;
  reason?: string;
}

/**
 * Sends events via the Beacon API.
 * Returns immediately — there is no confirmation of delivery.
 */
export function sendBeacon(
  events: TrackingEvent[],
  endpoint: string,
  siteToken: string,
): BeaconResult {
  // Beacon is not available in all environments
  if (!navigator.sendBeacon) {
    return { sent: false, reason: 'sendBeacon not available' };
  }

  if (events.length === 0) {
    return { sent: true };
  }

  try {
    const payload = JSON.stringify({ events });

    // Beacon requires a Blob with explicit content type
    // because it cannot set custom headers
    const blob = new Blob([payload], { type: 'application/json' });

    // sendBeacon returns false if the browser cannot queue the request
    // (usually because the payload is too large)
    const accepted = navigator.sendBeacon(
      // Append site token as query param since Beacon cannot set headers
      `${endpoint}?st=${encodeURIComponent(siteToken)}`,
      blob,
    );

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