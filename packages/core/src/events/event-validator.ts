import type { EventProperties } from '../types';

export interface ValidationResult {
  valid: boolean;
  sanitised: EventProperties;
  warnings: string[];
}

export function validateProperties(
  properties: EventProperties | undefined,
  debug: boolean,
): ValidationResult {
  if (properties === undefined) {
    return { valid: true, sanitised: {}, warnings: [] };
  }

  const warnings: string[] = [];

  if (
    typeof properties !== 'object' ||
    properties === null ||
    Array.isArray(properties)
  ) {
    const warning =
      '[AnalyticsSDK] track() received invalid properties. Expected an object.';
    warnings.push(warning);

    if (debug) {
      console.warn(warning);
    }

    return { valid: false, sanitised: {}, warnings };
  }

  // Log warnings in debug mode
  if (debug && warnings.length > 0) {
    warnings.forEach((w) => console.warn(w));
  }

  return {
    valid: true,
    sanitised: { ...properties },
    warnings,
  };
}
