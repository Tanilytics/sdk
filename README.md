# Tanilytics Analytics SDK

Tanilytics Analytics SDK is a TypeScript monorepo for a browser analytics client and related media adapter packages.

## Packages

- `tanilytics`: browser analytics SDK
- `@tanilytics/adapter-videojs`: Video.js adapter package scaffold
- `@tanilytics/adapter-hlsjs`: hls.js adapter package scaffold
- `@tanilytics/adapter-youtube`: YouTube iframe adapter for the core SDK

Today, the core package contains the main SDK implementation. The YouTube adapter is usable as a core extension, while the other media adapter packages are still minimal scaffolds.

## Core SDK Features

- one-time SDK initialization with a module-level singleton
- manual event tracking with typed event names
- automatic page view tracking, including SPA navigation
- autocapture for clicks, form submissions, scroll depth, and time on page
- batching, queued delivery, retry handling, and `sendBeacon` on unload
- session management with session persistence in browser storage
- privacy controls for opt-out, consent, and Do Not Track support
- strict TypeScript public API

## Installation

Package consumers install from npm:

```bash
npm install tanilytics
```

For local repository development:

```bash
bun install
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

tanilytics.track('signup_clicked', {
  plan: 'pro',
});
```

You can also provide the ingestion endpoint through the `INGESTION_URL` environment variable instead of passing `endpoint` to `tanilytics.init()`.

## Public API

The current public API for `tanilytics` is a default export object with:

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

The package also exports types including `TanilyticsConfig`, `EventType`, `EventProperties`, and `IngestionEvent`.

`TanilyticsConfig` also supports `adapters?: readonly MediaAdapterInterface[]` for media extensions.

## Media Adapters

Adapters are registered through `tanilytics.init()` and emit the core media event types through the same privacy, session, and queue pipeline.

```ts
import tanilytics from 'tanilytics';
import { youtubeAdapter } from '@tanilytics/adapter-youtube';

tanilytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
  adapters: [youtubeAdapter()],
});
```

`youtubeAdapter()` auto-detects supported YouTube embed iframes already on the page. Pass `youtubeAdapter({ iframe })` to scope tracking to one embed.

## Event Model

Manual tracking accepts any custom event name:

```ts
tanilytics.track('audio_downloaded', {
  audioId: 'aud_123',
  format: 'mp3',
});
```

These events are sent with `event_type: 'custom'` and a separate `event_name` field.

The SDK also emits fixed internal event types for autocapture and media adapters:

- `PAGE_VIEW`
- `PAGE_LEAVE`
- `CLICK`
- `FORM_SUBMIT`
- `SCROLL`
- `MEDIA_PLAY`
- `MEDIA_PAUSE`
- `MEDIA_SEEK`
- `MEDIA_PROGRESS`
- `MEDIA_BUFFER`
- `MEDIA_COMPLETE`
- `CUSTOM`

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

Current defaults:

- `flushInterval: 10000`
- `maxBatchSize: 100`
- `maxQueueSize: 1000`
- `compress: true`
- `debug: false`
- `requireConsent: false`
- `respectDoNotTrack: true`
- `autocapture: true`

Autocapture can be configured in two ways:

```ts
tanilytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
  autocapture: true,
});

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

- `autocapture: true` enables all built-in autocapture features
- `autocapture: false` disables all built-in autocapture features
- `autocapture: { ... }` overrides individual features

Validation rules currently enforced by the SDK include:

- `siteToken` is required and must be between 8 and 64 characters after trimming
- `endpoint` must be a valid URL
- non-HTTPS endpoints are only allowed for localhost-style development hosts
- `flushInterval` must be an integer `>= 500`
- `maxBatchSize` must be an integer between `1` and `200`
- `maxQueueSize` must be an integer between `1` and `10000`
- `compress` must be a boolean
- `adapters` must be an array of objects with `name`, `attach(api)`, and `detach()`

## Privacy Controls

The SDK exposes helpers for common privacy flows:

```ts
import tanilytics from 'tanilytics';

tanilytics.optOut();
tanilytics.optIn();
tanilytics.giveConsent();
tanilytics.withdrawConsent();

console.log(tanilytics.isOptedOut());
```

Current privacy behavior:

- opt-out blocks all tracking
- Do Not Track is respected by default
- consent is optional by default
- if `requireConsent` is enabled, events are blocked until consent is granted

## Development

Run commands from the repository root.

```bash
# install dependencies
bun install

# build all packages
bunx nx run-many -t build

# test all packages
bunx nx run-many -t test

# lint all packages
bunx nx run-many -t lint

# typecheck all packages
bunx nx run-many -t typecheck

# format and size checks
bun run format:check
bun run size:check
```

Useful per-project commands:

```bash
# core
bunx nx build tanilytics
bunx nx test tanilytics
bunx nx lint tanilytics
bunx nx typecheck tanilytics

# single core test file
bunx nx test tanilytics -- --run src/config/validator.test.ts

# single named core test
bunx nx test tanilytics -- --run src/config/validator.test.ts -t "throws when siteToken is missing"

# adapter example
bunx nx test @tanilytics/adapter-videojs -- --run src/lib/videojs.spec.ts
```

## Repository Structure

```text
packages/
  core/
  media-adapters/
    videojs/
    hlsjs/
    youtube/
nx.json
tsconfig.json
tsconfig.base.json
eslint.config.mjs
vitest.workspace.ts
```
