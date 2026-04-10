import { validate } from './validator';
import { merge } from './merger';
import type { AnalyticsConfig, ResolvedConfig } from './types';

export type { AnalyticsConfig, ResolvedConfig };

/**
 * The single function the Tracker calls.
 * Validates first — throws on invalid input.
 * Merges second — returns complete resolved config.
 */
export function validateAndMergeConfig(
  config: AnalyticsConfig,
): ResolvedConfig {
  validate(config);
  return merge(config);
}
