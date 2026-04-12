# @analytics-sdk/core

Browser analytics SDK for Tanilytics.

## Usage

```ts
import analytics from '@analytics-sdk/core';

analytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
  compress: true,
  autocapture: true,
});

analytics.track('audio_downloaded', {
  audioId: 'aud_123',
  format: 'mp3',
});
```

## Development

- Build: `bunx nx build @analytics-sdk/core`
- Test: `bunx nx test @analytics-sdk/core`
- Lint: `bunx nx lint @analytics-sdk/core`
- Typecheck: `bunx nx typecheck @analytics-sdk/core`
