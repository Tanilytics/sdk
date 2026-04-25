# tanilytics

Browser analytics SDK for Tanilytics.

## Installation

```bash
npm install tanilytics
```

## Quick Start

```ts
import tanilytics from 'tanilytics';

tanilytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
});

tanilytics.track('audio_downloaded', {
  audioId: 'aud_123',
  format: 'mp3',
  source: 'player',
});
```

You can also provide the ingestion endpoint through the `INGESTION_URL` environment variable instead of passing `endpoint` to `tanilytics.init()`.

## Features

- One-time SDK initialization with a module-level singleton
- Manual event tracking for custom product events
- Built-in autocapture for page views, clicks, form submissions, scroll depth, and time on page
- Media adapter extensions that emit internal media events through the core pipeline
- Batching, queued delivery, retries, and `sendBeacon` support on unload
- Session persistence in browser storage
- Privacy controls for opt-out, consent, and Do Not Track
- Strict TypeScript types for configuration and event payloads

## Usage

### Initialize the SDK

Call `tanilytics.init()` once at application startup.

```ts
import tanilytics from 'tanilytics';

tanilytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
  compress: true,
  debug: false,
  autocapture: true,
});
```

Important runtime behavior:

- `init()` is ignored after the first successful call unless you call `destroy()` first
- `track()` called before `init()` drops the event and logs a warning
- `flush()` is async and resolves when the queue has been flushed

### Track custom events

```ts
tanilytics.track('signup_clicked', {
  plan: 'pro',
  source: 'pricing_page',
});
```

Custom event names are trimmed, must be non-empty, and have a maximum length of 100 characters.

### Configure autocapture

Autocapture is enabled by default. You can leave it as-is, pass `false` to disable all built-in autocapture, or pass an object to control individual features.

Enable everything:

```ts
tanilytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
  autocapture: true,
});
```

Disable autocapture completely:

```ts
tanilytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
  autocapture: false,
});
```

Or opt into individual features:

```ts
tanilytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
  autocapture: {
    pageViews: true,
    clicks: true,
    formSubmissions: true,
    scrollDepth: true,
    timeOnPage: false,
  },
});
```

### Register media adapters

Media adapters are configured through `tanilytics.init()` and run independently from built-in autocapture.

```ts
import tanilytics from 'tanilytics';
import { youtubeAdapter } from '@tanilytics/adapter-youtube';

tanilytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
  adapters: [youtubeAdapter()],
});
```

`youtubeAdapter()` auto-detects supported YouTube embed iframes already present in the document. Pass `youtubeAdapter({ iframe })` if you want to scope tracking to one embed.

### Privacy controls

```ts
import tanilytics from 'tanilytics';

tanilytics.optOut();
tanilytics.optIn();
tanilytics.giveConsent();
tanilytics.withdrawConsent();

console.log(tanilytics.isOptedOut());
```

Current privacy behavior:

- Opt-out blocks all tracking
- Do Not Track is respected by default
- Consent is optional by default
- If `requireConsent` is enabled, events are blocked until consent is granted

## Public API

The default export exposes:

- `tanilytics.init(config)`
- `tanilytics.track(eventName, properties?)`
- `tanilytics.flush()`
- `tanilytics.destroy()`
- `tanilytics.optOut()`
- `tanilytics.optIn()`
- `tanilytics.isOptedOut()`
- `tanilytics.giveConsent()`
- `tanilytics.withdrawConsent()`
- `tanilytics.EventTypes`
- `tanilytics.VERSION`

The package also exports types including `TanilyticsConfig`, `EventType`, `EventProperties`, `IngestionEvent`, `IngestionPayload`, `SessionContext`, `MediaAdapterInterface`, `MediaAdapterApi`, and `MediaEventType`.

## Event Model

Manual tracking accepts any custom event name:

```ts
tanilytics.track('audio_downloaded', {
  audioId: 'aud_123',
  format: 'mp3',
});
```

These events are sent with `event_type: 'custom'` and a separate `event_name` field.

The SDK also emits fixed internal event types for autocapture and adapters through `tanilytics.EventTypes`:

- `page_view`
- `page_leave`
- `click`
- `form_submit`
- `scroll`
- `media_play`
- `media_pause`
- `media_seek`
- `media_progress`
- `media_buffer`
- `media_complete`
- `custom`

## Configuration

`tanilytics.init()` accepts this shape:

```ts
interface TanilyticsConfig {
  siteToken: string;
  endpoint?: string;
  flushInterval?: number;
  maxBatchSize?: number;
  maxQueueSize?: number;
  compress?: boolean;
  debug?: boolean;
  requireConsent?: boolean;
  respectDoNotTrack?: boolean;
  autocapture?:
    | boolean
    | {
        pageViews?: boolean;
        scrollDepth?: boolean;
        timeOnPage?: boolean;
        clicks?: boolean;
        formSubmissions?: boolean;
      };
  adapters?: readonly MediaAdapterInterface[];
}
```

Defaults:

- `flushInterval: 10000`
- `maxBatchSize: 100`
- `maxQueueSize: 1000`
- `compress: true`
- `debug: false`
- `requireConsent: false`
- `respectDoNotTrack: true`
- `autocapture`: all built-in features enabled

Validation rules enforced by the SDK include:

- `siteToken` is required and must be between 8 and 64 characters after trimming
- `endpoint` must be a valid URL
- Non-HTTPS endpoints are only allowed for localhost-style development hosts
- `flushInterval` must be an integer `>= 500`
- `maxBatchSize` must be an integer between `1` and `200`
- `maxQueueSize` must be an integer between `1` and `10000`
- `compress`, `debug`, `requireConsent`, and `respectDoNotTrack` must be booleans when provided
- `autocapture` must be either a boolean or an object containing boolean feature flags
- `adapters` must be an array of objects with `name`, `attach(api)`, and `detach()`
