import type { AnalyticsConfig, ResolvedConfig } from './types';
import { DEFAULT_CONFIG } from './defaults';

export function merge(config: AnalyticsConfig): ResolvedConfig {
  const resolved: ResolvedConfig = {
    siteToken: config.siteToken,
    endpoint: config.endpoint ?? DEFAULT_CONFIG.endpoint,
    flushInterval: config.flushInterval ?? DEFAULT_CONFIG.flushInterval,
    maxBatchSize: config.maxBatchSize ?? DEFAULT_CONFIG.maxBatchSize,
    debug: config.debug ?? DEFAULT_CONFIG.debug,
  };

  // Freeze so no module can accidentally mutate config after init
  return Object.freeze(resolved);
}