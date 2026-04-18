import { YOUTUBE_IFRAME_API_SRC } from './constants';
import type { YouTubeIframeApi } from './types';

let youtubeIframeApiPromise: Promise<YouTubeIframeApi> | null = null;

export async function loadYouTubeIframeApi(): Promise<YouTubeIframeApi> {
  if (window.YT?.Player !== undefined) {
    return window.YT;
  }

  if (youtubeIframeApiPromise !== null) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise<YouTubeIframeApi>((resolve, reject) => {
    const existingReadyCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      existingReadyCallback?.();

      if (window.YT?.Player === undefined) {
        reject(
          new Error('YouTube IFrame API loaded without window.YT.Player.'),
        );
        return;
      }

      resolve(window.YT);
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_IFRAME_API_SRC}"]`,
    );

    if (existingScript !== null) {
      return;
    }

    const script = document.createElement('script');
    script.src = YOUTUBE_IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => {
      youtubeIframeApiPromise = null;
      reject(new Error('Failed to load the YouTube IFrame API script.'));
    };

    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
}
