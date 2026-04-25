import { loadYouTubeIframeApi } from './api-loader';
import { resolveOptions } from './config';
import { resolveTargetIframes } from './discovery';
import { cleanupPlaybackContext, createPlayerEventHandlers } from './events';
import { createPlaybackContext, resetPlaybackState } from './state';
import type {
  PlaybackContext,
  YouTubeIframeAdapter,
  YouTubeIframeAdapterOptions,
} from './types';

export type {
  YouTubeIframeAdapterOptions,
  YouTubeIframeAdapter,
  YouTubeMediaAdapterApi,
} from './types';

export function youtubeAdapter(
  options: YouTubeIframeAdapterOptions = {},
): YouTubeIframeAdapter {
  const config = resolveOptions(options);

  let attachToken = 0;
  let isAttached = false;
  const contexts = new Map<HTMLIFrameElement, PlaybackContext>();

  return {
    name: 'youtube',
    attach(api) {
      if (isAttached) return;

      isAttached = true;

      const targetIframes = resolveTargetIframes(config.iframe);

      if (targetIframes.length === 0) {
        return;
      }

      const currentToken = ++attachToken;

      void loadYouTubeIframeApi()
        .then((youtubeApi) => {
          if (!isActive(currentToken)) return;

          for (const iframe of targetIframes) {
            const context = createPlaybackContext(iframe);

            try {
              context.player = new youtubeApi.Player(iframe, {
                events: createPlayerEventHandlers({
                  adapterApi: api,
                  config,
                  context,
                  isAttached: () => isActive(currentToken),
                  youtubeApi,
                }),
              });

              contexts.set(iframe, context);
            } catch (error) {
              console.warn(
                '[Tanilytics] Failed to initialise YouTube player for iframe.',
                iframe,
                error,
              );
            }
          }
        })
        .catch((error) => {
          if (!isActive(currentToken)) return;

          console.warn(
            '[Tanilytics] Failed to initialise media adapter "youtube".',
            error,
          );
        });
    },
    detach() {
      if (!isAttached) return;

      isAttached = false;
      attachToken += 1;

      for (const context of contexts.values()) {
        cleanupPlaybackContext(context);
        resetPlaybackState(context);
        context.player = null;
      }

      contexts.clear();
    },
  };

  function isActive(token: number): boolean {
    return isAttached && attachToken === token;
  }
}

export const youtube = youtubeAdapter;
