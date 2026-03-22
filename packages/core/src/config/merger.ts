import type { AnalyticsConfig, ResolvedConfig } from './types';
import { DEFAULT_CONFIG } from './defaults';

export function merge(config: AnalyticsConfig): ResolvedConfig {
  const resolved: ResolvedConfig = {
    siteToken: config.siteToken,
    endpoint: config.endpoint ?? DEFAULT_CONFIG.endpoint,
    flushInterval: config.flushInterval ?? DEFAULT_CONFIG.flushInterval,
    maxBatchSize: config.maxBatchSize ?? DEFAULT_CONFIG.maxBatchSize,
    maxQueueSize: config.maxQueueSize ?? DEFAULT_CONFIG.maxQueueSize,
    debug: config.debug ?? DEFAULT_CONFIG.debug,
    requireConsent: config.requireConsent ?? DEFAULT_CONFIG.requireConsent,
    respectDoNotTrack:
      config.respectDoNotTrack ?? DEFAULT_CONFIG.respectDoNotTrack,
    autocapture: {
      ...DEFAULT_CONFIG.autocapture,
      ...config.autocapture,
    },
  };

  // Freeze so no module can accidentally mutate config after init
  return Object.freeze(resolved);
}