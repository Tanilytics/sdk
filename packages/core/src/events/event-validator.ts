import type { EventProperties } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Reserved field names — property keys that would shadow TrackingEvent fields
// A consumer passing { sessionId: 'fake' } should not be able to override
// the real sessionId that the SDK stamps onto every event
// ─────────────────────────────────────────────────────────────────────────────

const RESERVED_KEYS = new Set([
  'eventId',
  'siteToken',
  'eventType',
  'clientTimestamp',
  'url',
  'referrer',
  'sessionId',
  'deviceType',
  'screenWidth',
  'viewportWidth',
  'language',
  'sdkVersion',
]);

const MAX_PROPERTIES = 20;
const MAX_STRING_LENGTH = 500;

// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  sanitised: EventProperties;
  warnings: string[];
}

/**
 * Validates and sanitises event properties before they are attached to an event.
 *
 * Strategy: never drop the entire event due to bad properties.
 * Instead, strip invalid properties, attach the rest, and warn in debug mode.
 * A partial event with some properties stripped is better than no event at all.
 */
export function validateProperties(
  properties: EventProperties | undefined,
  debug: boolean,
): ValidationResult {
  // No properties — nothing to validate
  if (properties === undefined) {
    return { valid: true, sanitised: {}, warnings: [] };
  }

  const sanitised: EventProperties = {};
  const warnings: string[] = [];

  // Check total count first
  const keys = Object.keys(properties);
  if (keys.length > MAX_PROPERTIES) {
    warnings.push(
      `[AnalyticsSDK] track() received ${keys.length} properties but the maximum is ${MAX_PROPERTIES}. ` +
      `Extra properties will be dropped.`,
    );
  }

  // Process each property — take up to MAX_PROPERTIES
  for (const key of keys.slice(0, MAX_PROPERTIES)) {
    // Check for reserved keys
    if (RESERVED_KEYS.has(key)) {
      warnings.push(
        `[AnalyticsSDK] Property key "${key}" is reserved and cannot be used. ` +
        `It has been dropped. Rename it to something like "custom_${key}".`,
      );
      continue;
    }

    const value = properties[key];

    // Check value type — must be a primitive
    if (!isAllowedValue(value)) {
      warnings.push(
        `[AnalyticsSDK] Property "${key}" has an invalid value type ` +
        `(${typeof value}). Only string, number, boolean, and null are allowed. ` +
        `It has been dropped.`,
      );
      continue;
    }

    // Truncate long strings
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      warnings.push(
        `[AnalyticsSDK] Property "${key}" was truncated to ${MAX_STRING_LENGTH} characters.`,
      );
      sanitised[key] = value.slice(0, MAX_STRING_LENGTH);
      continue;
    }

    sanitised[key] = value;
  }

  // Log warnings in debug mode
  if (debug && warnings.length > 0) {
    warnings.forEach((w) => console.warn(w));
  }

  return {
    valid: warnings.length === 0,
    sanitised,
    warnings,
  };
}

function isAllowedValue(value: unknown): value is string | number | boolean | null {
  if (value === null) return true;
  const t = typeof value;
  return t === 'string' || t === 'number' || t === 'boolean';
}