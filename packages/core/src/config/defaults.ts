import type { ResolvedConfig } from '../types';

export const DEFAULT_CONFIG: Omit<ResolvedConfig, 'siteToken'> = {
  endpoint: 'https://ingest-service/api/v1/events',
  flushInterval: 3000,
  maxBatchSize: 50,
  debug: false,
};