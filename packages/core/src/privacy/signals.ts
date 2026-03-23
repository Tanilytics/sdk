import { readOptOut, readConsent } from './storage';


let _requireConsent = false;
let _respectDoNotTrack = true;

export function configureSignals(opts: {
  requireConsent: boolean;
  respectDoNotTrack: boolean;
}): void {
  _requireConsent = opts.requireConsent;
  _respectDoNotTrack = opts.respectDoNotTrack;
}

export function isOptedOut(): boolean {
    return readOptOut();
}

export function hasConsent(): boolean {
    return readConsent();
}

export function isDoNotTrackEnabled(): boolean {
  try {
    return (
      navigator.doNotTrack === '1' ||
      // Legacy IE/Edge
      (navigator as any).msDoNotTrack === '1'
    );
  } catch {
    return false;
  }
}

export function computeIsTrackingAllowed(): boolean {
    if (isOptedOut()) {
        return false;
    }
    if ( _respectDoNotTrack && isDoNotTrackEnabled() ) {
        return false;
    }
    if (_requireConsent && !hasConsent()) {
        return false;
    }
    return true;
}
