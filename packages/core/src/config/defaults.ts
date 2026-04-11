import type { ResolvedConfig } from './types';

export const INGESTION_URL_ENV_VAR = 'INGESTION_URL';

type BaseDefaultConfig = Omit<ResolvedConfig, 'siteToken' | 'endpoint'>;

export const DEFAULT_CONFIG: BaseDefaultConfig = {
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,
  debug: false,
  requireConsent: false,
  respectDoNotTrack: true,
  autocapture: {
    pageViews: true,
    scrollDepth: true,
    timeOnPage: true,
    clicks: true,
    formSubmissions: true,
  },
};

function readIngestionUrlFromEnv(): string | undefined {
  if (typeof process === 'undefined' || !process.env) {
    return undefined;
  }

  return process.env[INGESTION_URL_ENV_VAR];
}

export function resolveDefaultEndpoint(explicitEndpoint?: string): string {
  const endpoint = explicitEndpoint ?? readIngestionUrlFromEnv();

  if (typeof endpoint === 'string' && endpoint.trim().length > 0) {
    return endpoint;
  }

  throw new Error(
    `[AnalyticsSDK] endpoint is required. Set ${INGESTION_URL_ENV_VAR} or pass endpoint explicitly in init().`,
  );
}
