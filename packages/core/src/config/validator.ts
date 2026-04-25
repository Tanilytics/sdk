import type { AnalyticsConfig } from './types';

export function validate(config: AnalyticsConfig): void {
  validateSiteToken(config);
  validateEndpoint(config);
  validateFlushInterval(config);
  validateMaxBatchSize(config);
  validateMaxQueueSize(config);
  validateBooleanField(config, 'compress');
  validateBooleanField(config, 'debug');
  validateBooleanField(config, 'requireConsent');
  validateBooleanField(config, 'respectDoNotTrack');
  validateAutocapture(config);
  validateAdapters(config);
}

function validateSiteToken(config: AnalyticsConfig): void {
  if (!config.siteToken || typeof config.siteToken !== 'string') {
    throw new Error(
      '[AnalyticsSDK] siteToken is required.\n' +
        'Get yours from the dashboard under Settings → Sites.\n' +
        'Example: analytics.init({ siteToken: "sk_live_abc123" })',
    );
  }

  if (config.siteToken.trim().length < 8) {
    throw new Error(
      `[AnalyticsSDK] siteToken "${config.siteToken}" looks invalid — too short.\n` +
        'Check your dashboard for the correct token.',
    );
  }

  if (config.siteToken.trim().length > 64) {
    throw new Error(
      `[AnalyticsSDK] siteToken "${config.siteToken}" is too long.\n` +
        'The ingestion schema limits site_id to 64 characters.',
    );
  }
}

function validateEndpoint(config: AnalyticsConfig): void {
  if (config.endpoint === undefined) {
    return;
  }

  let parsed: URL;

  try {
    parsed = new URL(config.endpoint);
  } catch {
    throw new Error(
      `[AnalyticsSDK] endpoint "${config.endpoint}" is not a valid URL.\n` +
        'Example: endpoint: "https://ingest.your-instance.com/api/v1/events"',
    );
  }

  const isLocalhost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname.endsWith('.local');

  if (parsed.protocol !== 'https:' && !isLocalhost) {
    throw new Error(
      `[AnalyticsSDK] endpoint must use HTTPS. Received: "${config.endpoint}"\n` +
        'HTTP is only allowed for localhost during development.',
    );
  }
}

function validateFlushInterval(config: AnalyticsConfig): void {
  if (config.flushInterval === undefined) {
    return;
  }

  if (
    typeof config.flushInterval !== 'number' ||
    !Number.isInteger(config.flushInterval) ||
    config.flushInterval < 500
  ) {
    throw new Error(
      `[AnalyticsSDK] flushInterval must be an integer >= 500ms.\n` +
        `Received: ${config.flushInterval}`,
    );
  }
}

function validateMaxBatchSize(config: AnalyticsConfig): void {
  if (config.maxBatchSize === undefined) {
    return;
  }

  if (
    typeof config.maxBatchSize !== 'number' ||
    !Number.isInteger(config.maxBatchSize) ||
    config.maxBatchSize < 1 ||
    config.maxBatchSize > 200
  ) {
    throw new Error(
      `[AnalyticsSDK] maxBatchSize must be an integer between 1 and 200.\n` +
        `Received: ${config.maxBatchSize}`,
    );
  }
}

function validateMaxQueueSize(config: AnalyticsConfig): void {
  if (config.maxQueueSize === undefined) {
    return;
  }

  if (
    typeof config.maxQueueSize !== 'number' ||
    !Number.isInteger(config.maxQueueSize) ||
    config.maxQueueSize < 1 ||
    config.maxQueueSize > 10000
  ) {
    throw new Error(
      `[AnalyticsSDK] maxQueueSize must be an integer between 1 and 10000.\n` +
        `Received: ${config.maxQueueSize}`,
    );
  }
}

type BooleanConfigKey =
  | 'compress'
  | 'debug'
  | 'requireConsent'
  | 'respectDoNotTrack';

function validateBooleanField(
  config: AnalyticsConfig,
  field: BooleanConfigKey,
): void {
  const value = config[field];

  if (value !== undefined && typeof value !== 'boolean') {
    throw new Error(
      `[AnalyticsSDK] ${field} must be a boolean.\n` + `Received: ${value}`,
    );
  }
}

function validateAutocapture(config: AnalyticsConfig): void {
  if (config.autocapture === undefined) {
    return;
  }

  if (typeof config.autocapture === 'boolean') {
    return;
  }

  if (typeof config.autocapture !== 'object' || config.autocapture === null) {
    throw new Error(
      `[AnalyticsSDK] autocapture must be a boolean or an object.\n` +
        `Received: ${config.autocapture}`,
    );
  }

  for (const [key, value] of Object.entries(config.autocapture)) {
    if (typeof value !== 'boolean') {
      throw new TypeError(
        `[AnalyticsSDK] autocapture.${key} must be a boolean.\n` +
          `Received: ${value}`,
      );
    }
  }
}

function validateAdapters(config: AnalyticsConfig): void {
  if (config.adapters === undefined) {
    return;
  }

  if (!Array.isArray(config.adapters)) {
    throw new TypeError(
      `[AnalyticsSDK] adapters must be an array.\n` +
        `Received: ${config.adapters}`,
    );
  }

  for (const [index, adapter] of config.adapters.entries()) {
    if (typeof adapter !== 'object' || adapter === null) {
      throw new Error(
        `[AnalyticsSDK] adapters[${index}] must be an object.\n` +
          `Received: ${adapter}`,
      );
    }

    if (typeof adapter.name !== 'string' || adapter.name.trim().length === 0) {
      throw new Error(
        `[AnalyticsSDK] adapters[${index}].name must be a non-empty string.`,
      );
    }

    if (typeof adapter.attach !== 'function') {
      throw new TypeError(
        `[AnalyticsSDK] adapters[${index}].attach must be a function.`,
      );
    }

    if (typeof adapter.detach !== 'function') {
      throw new TypeError(
        `[AnalyticsSDK] adapters[${index}].detach must be a function.`,
      );
    }
  }
}
