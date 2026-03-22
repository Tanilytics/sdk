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
    // change this
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
}