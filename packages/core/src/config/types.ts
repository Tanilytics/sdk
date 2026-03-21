export interface AnalyticsConfig {
    siteToken: string;
    endpoint?: string;
    flushInterval?: number;
    maxBatchSize?: number;
    debug?: boolean;
}
export interface ResolvedConfig {
  readonly siteToken: string;
  readonly endpoint: string;
  readonly flushInterval: number;
  readonly maxBatchSize: number;
  readonly debug: boolean;
}