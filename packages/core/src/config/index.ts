import { validate } from './validator';
import { merge } from './merger';
import type { AnalyticsConfig, ResolvedConfig } from './types';

export type { AnalyticsConfig, ResolvedConfig };

/**
 * The single function the Tracker calls.
 * Validateexport interface AnalyticsConfig {
    siteToken: string;
    endpoint?: string;
    flushInterval?: number;
    maxBatchSize?: number;
    debug?: boolean;
}
export interface ResolvedConfig {
  readonly siteToken: string;
  readonly endpoint: string;
  readonly flushInterval: number;
  readonly maxBatchSize: number;
  readonly debug: boolean;
}s first — throws on invalid input.
 * Merges second — returns complete resolved config.
 */
export function validateAndMergeConfig(config: AnalyticsConfig): ResolvedConfig {
  validate(config);
  return merge(config);
}