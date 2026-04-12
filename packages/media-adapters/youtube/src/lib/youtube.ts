import { SDK_VERSION, type AnalyticsConfig } from '@analytics-sdk/core';

export function youtube(): string {
  const config: Partial<AnalyticsConfig> = { debug: Boolean(SDK_VERSION) };

  return config.debug ? 'youtube' : 'youtube';
}
