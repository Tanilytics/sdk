import { validate } from './validator';
import { merge } from './merger';
import type { TanilyticsConfig, ResolvedConfig } from './types';

export type { TanilyticsConfig, ResolvedConfig } from './types';

/**
 * The single function the Tracker calls.
 * Validates first — throws on invalid input.
 * Merges second — returns complete resolved config.
 */
export function validateAndMergeConfig(
  config: TanilyticsConfig,
): ResolvedConfig {
  validate(config);
  return merge(config);
}
