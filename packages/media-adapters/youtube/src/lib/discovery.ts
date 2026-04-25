import { YOUTUBE_EMBED_HOSTS } from './constants';

export function resolveTargetIframes(
  explicitIframe?: HTMLIFrameElement,
): HTMLIFrameElement[] {
  if (explicitIframe !== undefined) {
    validateIframe(explicitIframe);
    return [explicitIframe];
  }

  return Array.from(document.querySelectorAll('iframe')).filter((iframe) => {
    try {
      validateIframe(iframe);
      return true;
    } catch {
      return false;
    }
  });
}

export function validateIframe(iframe: HTMLIFrameElement): URL {
  const src = iframe.getAttribute('src')?.trim();

  if (!src) {
    throw new Error(
      '[Tanilytics] The YouTube adapter requires an iframe with a src attribute.',
    );
  }

  const parsed = new URL(src, window.location.href);

  if (!YOUTUBE_EMBED_HOSTS.has(parsed.hostname)) {
    throw new Error(
      '[Tanilytics] The YouTube adapter only supports youtube.com and youtube-nocookie.com embed iframes.',
    );
  }

  if (!parsed.pathname.startsWith('/embed')) {
    throw new Error(
      '[Tanilytics] The YouTube adapter only supports YouTube embed iframe URLs.',
    );
  }

  if (parsed.searchParams.get('enablejsapi') !== '1') {
    throw new Error(
      '[Tanilytics] The YouTube adapter requires enablejsapi=1 on the iframe src.',
    );
  }

  if ((parsed.searchParams.get('origin') ?? '').trim().length === 0) {
    throw new Error(
      '[Tanilytics] The YouTube adapter requires an origin query parameter on the iframe src.',
    );
  }

  return parsed;
}
