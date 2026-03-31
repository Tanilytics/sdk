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

  return deepFreeze(resolved);
}

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const value = (obj as Record<string, unknown>)[prop];
      deepFreeze(value);
    });
    Object.freeze(obj);
  }
  return obj;
}
