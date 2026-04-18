import type { EventProperties } from '@analytics-sdk/core';

export type YouTubeMediaEventType =
  | 'media_play'
  | 'media_pause'
  | 'media_seek'
  | 'media_progress'
  | 'media_buffer'
  | 'media_complete';

export interface YouTubeVideoData {
  video_id?: string;
  title?: string;
}

export interface YouTubePlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getVideoLoadedFraction(): number;
  getVideoUrl(): string;
  getVideoData(): YouTubeVideoData;
  getIframe(): HTMLIFrameElement;
}

export interface YouTubePlayerEvent {
  readonly data?: number;
  readonly target: YouTubePlayer;
}

export interface YouTubePlayerEvents {
  readonly onReady?: (event: YouTubePlayerEvent) => void;
  readonly onStateChange?: (event: YouTubePlayerEvent) => void;
}

export interface YouTubePlayerOptions {
  readonly events?: YouTubePlayerEvents;
}

export interface YouTubePlayerStateMap {
  readonly BUFFERING: number;
  readonly ENDED: number;
  readonly PAUSED: number;
  readonly PLAYING: number;
}

export interface YouTubeIframeApi {
  readonly Player: new (
    target: HTMLIFrameElement,
    options?: YouTubePlayerOptions,
  ) => YouTubePlayer;
  readonly PlayerState: YouTubePlayerStateMap;
}

export interface VideoSnapshot {
  readonly bufferedFraction?: number;
  readonly currentTime?: number;
  readonly duration?: number;
  readonly title?: string;
  readonly videoId?: string;
  readonly videoUrl?: string;
}

export interface PlaybackContext {
  iframe: HTMLIFrameElement;
  player: YouTubePlayer | null;
  pollTimer: number | null;
  bufferStartTime: number | null;
  lastCurrentTime: number | null;
  lastPlayerState: number | null;
  stateBeforeBuffering: number | null;
  lastSampleAt: number | null;
  lastVideoId: string | null;
  hasStartedPlayback: boolean;
  hasCompletedPlayback: boolean;
  isBuffering: boolean;
  emittedProgress: Set<number>;
}

export interface YouTubeMediaAdapterApi {
  trackMedia(
    eventType: YouTubeMediaEventType,
    properties?: EventProperties,
  ): void;
}

export interface YouTubeIframeAdapter {
  readonly name: 'youtube';
  attach(api: YouTubeMediaAdapterApi): void;
  detach(): void;
}

export interface YouTubeIframeAdapterOptions {
  iframe?: HTMLIFrameElement;
  progressPercentages?: readonly number[];
  progressPollMs?: number;
  seekThresholdSeconds?: number;
}

export interface ResolvedYouTubeAdapterOptions {
  readonly iframe?: HTMLIFrameElement;
  readonly progressPercentages: readonly number[];
  readonly progressPollMs: number;
  readonly seekThresholdSeconds: number;
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
