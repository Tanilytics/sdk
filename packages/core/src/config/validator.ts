import type { AnalyticsConfig } from './types';

export function validate(config: AnalyticsConfig): void {
  // ── siteToken ────────────────────────────────────────────────────────────

  if (!config.siteToken || typeof config.siteToken !== 'string') {
    throw new Error(
      '[AnalyticsSDK] siteToken is required.\n' +
      'Get yours from the dashboard under Settings → Sites.\n' +
      'Example: init({ siteToken: "sk_live_abc123" })',
    );
  }

  if (config.siteToken.trim().length < 8) {
    throw new Error(
      `[AnalyticsSDK] siteToken "${config.siteToken}" looks invalid — too short.\n` +
      'Check your dashboard for the correct token.',
    );
  }

  // ── endpoint ─────────────────────────────────────────────────────────────

  if (config.endpoint !== undefined) {
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

  // ── flushInterval ─────────────────────────────────────────────────────────

  if (config.flushInterval !== undefined) {
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

  // ── maxBatchSize ──────────────────────────────────────────────────────────

  if (config.maxBatchSize !== undefined) {
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

  // ── maxQueueSize ──────────────────────────────────────────────────────────
if (config.maxQueueSize !== undefined) {
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
// ── debug ──────────────────────────────────────────────────────────
  if (config.debug !== undefined && typeof config.debug !== 'boolean') {
    throw new Error(
      `[AnalyticsSDK] debug must be a boolean.\n` +
      `Received: ${config.debug}`,
    );
  }
  
  // ── requireConsent ──────────────────────────────────────────────────────────
  if (config.requireConsent !== undefined && typeof config.requireConsent !== 'boolean') {
    throw new Error(
      `[AnalyticsSDK] requireConsent must be a boolean.\n` +
      `Received: ${config.requireConsent}`,
    );
  }
  // ── respectDoNotTrack ──────────────────────────────────────────────────────────
  if (config.respectDoNotTrack !== undefined && typeof config.respectDoNotTrack !== 'boolean') {
    throw new Error(
      `[AnalyticsSDK] respectDoNotTrack must be a boolean.\n` +
      `Received: ${config.respectDoNotTrack}`,
    );
  }
  
  // ── autocapture ──────────────────────────────────────────────────────────
  if (config.autocapture !== undefined) {
    if (typeof config.autocapture !== 'object' || config.autocapture === null) {
      throw new Error(
        `[AnalyticsSDK] autocapture must be an object.\n` +
        `Received: ${config.autocapture}`,
      );
    }
  for (const [key, value] of Object.entries(config.autocapture ?? {})) {
    if (typeof value !== 'boolean') {
      throw new Error(
        `[AnalyticsSDK] autocapture.${key} must be a boolean.\n` +
        `Received: ${value}`,
      );
    }
  }
    
}
}

  