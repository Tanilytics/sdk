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

export function configurePrivacy(opts: {
  requireConsent: boolean;
  respectDoNotTrack: boolean;
}): void {
  configureSignals(opts);
}


export function isTrackingAllowed(): boolean {
  return computeIsTrackingAllowed();
}


export function optOut(): void {
  writeOptOut();
}


export function optIn(): void {
  clearOptOut();
}

export function isOptedOut(): boolean {
  return checkOptedOut();
}


export function giveConsent(): void {
  writeConsent();
}

export function withdrawConsent(): void {
  clearConsent();
  writeOptOut();
}