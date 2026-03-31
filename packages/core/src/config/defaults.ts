import type { ResolvedConfig } from './types';

export const DEFAULT_CONFIG: Omit<ResolvedConfig, 'siteToken'> = {
  endpoint: 'https://ingest-service/api/v1/events',
  flushInterval: 3000,
  maxBatchSize: 50,
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
