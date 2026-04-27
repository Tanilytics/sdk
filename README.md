<div align="center">
  <h1>Tanilytics SDK</h1>
</div>

<div align="center">
  <h3>Lightweight browser analytics for modern web applications.</h3>
</div>

![npm](https://img.shields.io/npm/dm/tanilytics) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Tanilytics is a TypeScript SDK for browser analytics. It helps you track user interactions, page views, and media events with a small, predictable API — all while respecting user privacy and degrading safely around browser APIs.

**Documentation**: To learn more about Tanilytics, check out the packages and examples below.

## ⚡️ Quick Install

You can use npm, pnpm, yarn or bun to install Tanilytics:

```bash
npm install tanilytics
```

For media adapter packages:

```bash
npm install @tanilytics/adapter-youtube
```

For local repository development:

```bash
bun install
```

## 🚀 Why use Tanilytics?

Tanilytics helps developers build privacy-respecting analytics into web applications through a focused, lightweight SDK.

Use Tanilytics for:

- **Automatic event tracking**. Capture page views, clicks, form submissions, scroll depth, and time on page without manual instrumentation.
- **Media analytics**. Track video and audio playback through adapters for YouTube, Video.js, and hls.js — all piped through the same event queue and privacy controls.
- **Privacy by default**. Built-in opt-out, consent management, and Do Not Track support keep you aligned with privacy expectations.
- **Reliable delivery**. Events are batched, queued, and retried with `sendBeacon` fallback on page unload — so you don't lose data.
- **Session management**. Sessions are persisted in browser storage with configurable timeouts.
- **Strict TypeScript API**. Full type safety for configuration, events, and public methods with no implicit `any`.
- **Small footprint**. Designed to stay lightweight and easy to integrate without bloating your bundle.

## 📦 Packages

This is a TypeScript monorepo with the following packages:

| Package                       | Path                              | Description                       |
| ----------------------------- | --------------------------------- | --------------------------------- |
| `tanilytics`                  | `packages/core`                   | Main browser analytics SDK        |
| `@tanilytics/adapter-youtube` | `packages/media-adapters/youtube` | YouTube iframe media adapter      |
| `@tanilytics/adapter-videojs` | `packages/media-adapters/videojs` | Video.js adapter package scaffold |
| `@tanilytics/adapter-hlsjs`   | `packages/media-adapters/hlsjs`   | hls.js adapter package scaffold   |

Today, the core package contains the main SDK implementation. The YouTube adapter is usable as a core extension, while the other media adapter packages are still minimal scaffolds.

## 🌐 Supported Environments

Tanilytics is written in TypeScript and can be used in:

- Node.js (for build/tooling)
- Browser (ESM and UMD bundles)
- Bundlers (Vite, Webpack, Rollup, etc.)

## 🚀 Quick Start

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

## 📖 Additional Resources

- **Public API**: `tanilytics.init(config)`, `tanilytics.track(eventName, properties?)`, `tanilytics.flush()`, `tanilytics.destroy()`, `tanilytics.optOut()`, `tanilytics.optIn()`, `tanilytics.isOptedOut()`, `tanilytics.giveConsent()`, `tanilytics.withdrawConsent()`, `tanilytics.EventTypes`, `tanilytics.VERSION`
- **Media Adapters**: Register adapters through `tanilytics.init({ adapters: [youtubeAdapter()] })` to track media events through the same privacy, session, and queue pipeline.
- **Configuration**: Supports `siteToken`, `endpoint`, `flushInterval`, `maxBatchSize`, `maxQueueSize`, `compress`, `debug`, `requireConsent`, `respectDoNotTrack`, `autocapture`, and `adapters`.
- **Event Model**: Manual tracking accepts any custom event name. Internal event types include `PAGE_VIEW`, `PAGE_LEAVE`, `CLICK`, `FORM_SUBMIT`, `SCROLL`, `MEDIA_PLAY`, `MEDIA_PAUSE`, `MEDIA_SEEK`, `MEDIA_PROGRESS`, `MEDIA_BUFFER`, `MEDIA_COMPLETE`, and `CUSTOM`.

## 🛠️ Development

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

## 📁 Repository Structure

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

## 💁 Contributing

As an open-source project, we are open to contributions — whether in the form of bug fixes, new features, improved documentation, or feedback.

When submitting a pull request:

1. **Fill out the PR template** - Describe what your PR does, why it's needed, and any relevant context
2. **Link related issues** - Use closing keywords like `Fixes #123` to automatically close issues when your PR is merged
3. **Keep PRs focused** - One feature or fix per PR makes review easier and faster
4. **Add tests** - Include tests for new functionality close to the changed implementation
5. **Update documentation** - If your change affects public APIs, update the relevant docs
6. **Run checks locally** - Make sure `bunx nx run-many -t lint`, `bun run format:check`, and `bunx nx run-many -t test` pass before pushing

### Review Process

- A maintainer will review your PR and may request changes
- Please respond to feedback in a timely manner
- Once approved, a maintainer will merge your PR
