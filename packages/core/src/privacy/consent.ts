import {
  writeOptOut,
  clearOptOut,
  writeConsent,
  clearConsent,
} from './storage';
import {
  configureSignals,
  computeIsTrackingAllowed,
  isOptedOut as checkOptedOut,
} from './signals';

// ─────────────────────────────────────────────────────────────────────────────
// Public API — these are the only functions other modules import
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called once by the Tracker during init().
 * Copies config settings into privacy module state.
 */
export function configurePrivacy(opts: {
  requireConsent: boolean;
  respectDoNotTrack: boolean;
}): void {
  configureSignals(opts);
}

/**
 * The gate. Called before every event is constructed.
 * Returns false → event is dropped, nothing is sent.
 * Returns true  → proceed with event construction.
 */
export function isTrackingAllowed(): boolean {
  return computeIsTrackingAllowed();
}

/**
 * Opt the current user out of all tracking.
 * Persists across page reloads via localStorage.
 * Safe to call before init().
 */
export function optOut(): void {
  writeOptOut();
}

/**
 * Reverse a previous optOut().
 * Safe to call before init().
 */
export function optIn(): void {
  clearOptOut();
}

/**
 * Returns true if the user is currently opted out.
 * Useful for rendering the state of a consent banner.
 */
export function isOptedOut(): boolean {
  return checkOptedOut();
}

/**
 * Record that the user has given consent.
 * Only has an effect when requireConsent: true was passed to init().
 * Safe to call before init().
 */
export function giveConsent(): void {
  writeConsent();
}

/**
 * Withdraw consent and simultaneously opt out.
 * Calling this means the user explicitly does not want to be tracked.
 */
export function withdrawConsent(): void {
  clearConsent();
  // Withdrawing consent also opts the user out — they are expressing
  // a clear preference to not be tracked
  writeOptOut();
}