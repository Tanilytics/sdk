const KEYS = {
  OPT_OUT: 'tanilytics_optout',
  CONSENT: 'tanilytics_consent',
} as const;

export function readOptOut(): boolean {
  try {
    return localStorage.getItem(KEYS.OPT_OUT) === '1';
  } catch {
    return false;
  }
}

export function readConsent(): boolean {
  try {
    return localStorage.getItem(KEYS.CONSENT) === '1';
  } catch {
    return false;
  }
}

export function writeOptOut(): void {
  try {
    localStorage.setItem(KEYS.OPT_OUT, '1');
  } catch {
    throw new Error(
      '[AnalyticsSDK] Could not persist opt-out — localStorage is unavailable. ' +
        'The opt-out will not survive a page reload.'
    );
  }
}

export function clearOptOut(): void {
  try {
    localStorage.removeItem(KEYS.OPT_OUT);
  } catch {
    // Ignore
  }
}

export function writeConsent(): void {
  try {
    localStorage.setItem(KEYS.CONSENT, '1');
  } catch {
    throw new Error(
      '[AnalyticsSDK] Could not persist consent — localStorage is unavailable.'
    );
  }
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(KEYS.CONSENT);
  } catch {
    // Ignore
  }
}
