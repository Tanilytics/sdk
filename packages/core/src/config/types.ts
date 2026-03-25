export interface AnalyticsConfig {
  siteToken: string;
  endpoint?: string;
  flushInterval?: number;
  maxBatchSize?: number;
  maxQueueSize?: number;
  debug?: boolean;
  requireConsent?: boolean;
  respectDoNotTrack?: boolean;
  autocapture?: Partial<AutocaptureConfig>;
}

export interface ResolvedConfig {
  readonly siteToken: string;
  readonly endpoint: string;
  readonly flushInterval: number;
  readonly maxBatchSize: number;
  readonly maxQueueSize: number;
  readonly debug: boolean;
  readonly requireConsent: boolean;
  readonly respectDoNotTrack: boolean;
  readonly autocapture: AutocaptureConfig;
}

export interface AutocaptureConfig {
  pageViews: boolean;
  scrollDepth: boolean;
  timeOnPage: boolean;
  clicks: boolean;
  formSubmissions: boolean;
}
