import { type AnalyticsConfig } from '@analytics-sdk/core';

export function youtube(): string {
  const config: Partial<AnalyticsConfig> = { debug: true };

  return config.debug ? 'youtube' : 'youtube';
}
