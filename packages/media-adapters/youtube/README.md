# @tanilytics/adapter-youtube

YouTube iframe adapter for `tanilytics`.

## Installation

```bash
npm install tanilytics @tanilytics/adapter-youtube
```

## Usage

Your iframe must use a YouTube embed URL with both `enablejsapi=1` and `origin`.

```html
<iframe
  id="hero-video"
  src="https://www.youtube.com/embed/abc123xyz89?enablejsapi=1&origin=https://example.com"
  allow="autoplay; fullscreen"
></iframe>
```

```ts
import tanilytics from 'tanilytics';
import { youtubeAdapter } from '@tanilytics/adapter-youtube';

tanilytics.init({
  siteToken: 'sk_live_abc12345',
  endpoint: 'https://ingest.example.com/api/v1/events',
  adapters: [youtubeAdapter()],
});
```

`youtubeAdapter()` automatically discovers supported YouTube embed iframes already on the page. If you want to target one specific iframe, pass it explicitly:

```ts
const iframe = document.querySelector<HTMLIFrameElement>('#hero-video');

if (iframe !== null) {
  tanilytics.init({
    siteToken: 'sk_live_abc12345',
    endpoint: 'https://ingest.example.com/api/v1/events',
    adapters: [youtubeAdapter({ iframe })],
  });
}
```

The adapter emits the core media event types:

- `media_play`
- `media_pause`
- `media_seek`
- `media_progress`
- `media_buffer`
- `media_complete`

Progress milestones default to `25`, `50`, `75`, and `90` percent and can be customised:

```ts
youtubeAdapter({
  iframe,
  progressPercentages: [10, 25, 50, 75, 95],
  progressPollMs: 1000,
  seekThresholdSeconds: 2,
});
```

`seekThresholdSeconds` controls how large a jump must be before the adapter emits
`media_seek`.
