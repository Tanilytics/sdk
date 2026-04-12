# Tanilytics Analytics SDK

Tanilytics Analytics SDK is a TypeScript monorepo for a browser analytics client and related media adapter packages.

## Packages

- `@analytics-sdk/core`: browser analytics SDK
- `@analytics-sdk/adapter-videojs`: Video.js adapter package scaffold
- `@analytics-sdk/adapter-hlsjs`: hls.js adapter package scaffold
- `@analytics-sdk/adapter-youtube`: YouTube adapter package scaffold

Today, the core package contains the real SDK implementation. The media adapter packages are present in the workspace, but are still minimal scaffolds.

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
npm install @analytics-sdk/core
```

For local repository development:

```bash
bun install
```

## Quick Start

```ts
import analytics from '@analytics-sdk/core';

analytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
});

analytics.track('audio_downloaded', {
  audioId: 'aud_123',
  format: 'mp3',
  source: 'player',
});

analytics.track('signup_clicked', {
  plan: 'pro',
});
```

You can also provide the ingestion endpoint through the `INGESTION_URL` environment variable instead of passing `endpoint` to `analytics.init()`.

## Public API

The current public API for `@analytics-sdk/core` is a default export object with:

- `analytics.init(config)`
- `analytics.track(eventName, properties?)`
- `analytics.flush()`
- `analytics.destroy()`
- `analytics.optOut()`
- `analytics.optIn()`
- `analytics.isOptedOut()`
- `analytics.giveConsent()`
- `analytics.withdrawConsent()`
- `analytics.EventTypes`
- `analytics.SDK_VERSION`

The package also exports types including `AnalyticsConfig`, `EventType`, `EventProperties`, and `IngestionEvent`.

## Event Model

Manual tracking accepts any custom event name:

```ts
analytics.track('audio_downloaded', {
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

`analytics.init()` accepts this shape:

```ts
interface AnalyticsConfig {
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
analytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
  autocapture: true,
});

analytics.init({
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

## Privacy Controls

The SDK exposes helpers for common privacy flows:

```ts
import analytics from '@analytics-sdk/core';

analytics.optOut();
analytics.optIn();
analytics.giveConsent();
analytics.withdrawConsent();

console.log(analytics.isOptedOut());
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
bunx nx build @analytics-sdk/core
bunx nx test @analytics-sdk/core
bunx nx lint @analytics-sdk/core
bunx nx typecheck @analytics-sdk/core

# single core test file
bunx nx test @analytics-sdk/core -- --run src/config/validator.test.ts

# single named core test
bunx nx test @analytics-sdk/core -- --run src/config/validator.test.ts -t "throws when siteToken is missing"

# adapter example
bunx nx test @analytics-sdk/adapter-videojs -- --run src/lib/videojs.spec.ts
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
