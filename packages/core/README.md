# @analytics-sdk/core

Browser analytics SDK for Tanilytics.

## Usage

```ts
import analytics from '@analytics-sdk/core';

analytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
});

analytics.track(analytics.EventTypes.CLICK, {
  action: 'newsletter_signup',
});
```

## Development

- Build: `bunx nx build @analytics-sdk/core`
- Test: `bunx nx test @analytics-sdk/core`
- Lint: `bunx nx lint @analytics-sdk/core`
- Typecheck: `bunx nx typecheck @analytics-sdk/core`
