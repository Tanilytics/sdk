import type { TanilyticsConfig, ResolvedConfig } from './types';
import { DEFAULT_CONFIG, resolveDefaultEndpoint } from './defaults';

export function merge(config: TanilyticsConfig): ResolvedConfig {
  const resolved: ResolvedConfig = {
    siteToken: config.siteToken,
    endpoint: resolveDefaultEndpoint(config.endpoint),
    flushInterval: config.flushInterval ?? DEFAULT_CONFIG.flushInterval,
    maxBatchSize: config.maxBatchSize ?? DEFAULT_CONFIG.maxBatchSize,
    maxQueueSize: config.maxQueueSize ?? DEFAULT_CONFIG.maxQueueSize,
    compress: config.compress ?? DEFAULT_CONFIG.compress,
    debug: config.debug ?? DEFAULT_CONFIG.debug,
    requireConsent: config.requireConsent ?? DEFAULT_CONFIG.requireConsent,
    respectDoNotTrack:
      config.respectDoNotTrack ?? DEFAULT_CONFIG.respectDoNotTrack,
    autocapture: resolveAutocapture(config.autocapture),
  };

  return deepFreeze(resolved);
}

function resolveAutocapture(config: TanilyticsConfig['autocapture']) {
  if (config === undefined || config === true) {
    return { ...DEFAULT_CONFIG.autocapture };
  }

  if (config === false) {
    return disableAllAutocapture();
  }

  return {
    ...DEFAULT_CONFIG.autocapture,
    ...config,
  };
}

function disableAllAutocapture(): ResolvedConfig['autocapture'] {
  return {
    pageViews: false,
    scrollDepth: false,
    timeOnPage: false,
    clicks: false,
    formSubmissions: false,
  };
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
