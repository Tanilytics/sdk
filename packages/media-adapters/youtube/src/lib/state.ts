import type { PlaybackContext, VideoSnapshot } from './types';

export function createPlaybackContext(
  iframe: HTMLIFrameElement,
): PlaybackContext {
  return {
    iframe,
    player: null,
    pollTimer: null,
    lastCurrentTime: null,
    lastPlayerState: null,
    stateBeforeBuffering: null,
    lastSampleAt: null,
    lastVideoId: null,
    hasStartedPlayback: false,
    hasCompletedPlayback: false,
    isBuffering: false,
    emittedProgress: new Set<number>(),
  };
}

export function syncVideoLifecycle(
  context: PlaybackContext,
  snapshot: VideoSnapshot,
): void {
  if (
    snapshot.videoId === undefined ||
    snapshot.videoId === context.lastVideoId
  ) {
    return;
  }

  context.lastVideoId = snapshot.videoId;
  resetVideoLifecycle(context);
}

export function resetVideoLifecycle(context: PlaybackContext): void {
  context.hasStartedPlayback = false;
  context.hasCompletedPlayback = false;
  context.isBuffering = false;
  context.emittedProgress.clear();
}

export function resetPlaybackState(context: PlaybackContext): void {
  resetVideoLifecycle(context);
  context.lastCurrentTime = null;
  context.lastPlayerState = null;
  context.stateBeforeBuffering = null;
  context.lastSampleAt = null;
  context.lastVideoId = null;
}

export function updateSamplingBaseline(
  context: PlaybackContext,
  currentTime?: number,
): void {
  if (currentTime === undefined) {
    context.lastCurrentTime = null;
    context.lastSampleAt = null;
    return;
  }

  context.lastCurrentTime = currentTime;
  context.lastSampleAt = Date.now();
}
