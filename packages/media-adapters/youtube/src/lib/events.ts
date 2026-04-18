import { VIDEO_REPLAY_THRESHOLD_SECONDS } from './constants';
import { computePercent, readSnapshot } from './snapshot';
import {
  resetVideoLifecycle,
  syncVideoLifecycle,
  updateSamplingBaseline,
} from './state';
import type {
  PlaybackContext,
  ResolvedYouTubeAdapterOptions,
  YouTubeIframeApi,
  YouTubeMediaAdapterApi,
  YouTubeMediaEventType,
  YouTubePlayerEvent,
  VideoSnapshot,
} from './types';
import type { EventProperties } from '@analytics-sdk/core';

interface CreatePlayerEventHandlersOptions {
  adapterApi: YouTubeMediaAdapterApi;
  config: ResolvedYouTubeAdapterOptions;
  context: PlaybackContext;
  isAttached(): boolean;
  youtubeApi: YouTubeIframeApi;
}

export function createPlayerEventHandlers({
  adapterApi,
  config,
  context,
  isAttached,
  youtubeApi,
}: CreatePlayerEventHandlersOptions) {
  return {
    onReady(event: YouTubePlayerEvent): void {
      if (!isAttached()) return;
      context.player = event.target;
      syncVideoLifecycle(context, readSnapshot(event.target));
    },
    onStateChange(event: YouTubePlayerEvent): void {
      if (!isAttached()) return;
      context.player = event.target;
      handleStateChange({
        adapterApi,
        config,
        context,
        event,
        isAttached,
        youtubeApi,
      });
    },
  };
}

export function cleanupPlaybackContext(context: PlaybackContext): void {
  stopProgressPolling(context);
}

interface HandleStateChangeOptions {
  adapterApi: YouTubeMediaAdapterApi;
  config: ResolvedYouTubeAdapterOptions;
  context: PlaybackContext;
  event: YouTubePlayerEvent;
  isAttached: () => boolean;
  youtubeApi: YouTubeIframeApi;
}

function handleStateChange({
  adapterApi,
  config,
  context,
  event,
  isAttached,
  youtubeApi,
}: HandleStateChangeOptions): void {
  const nextState = event.data;

  if (typeof nextState !== 'number') {
    return;
  }

  const currentSnapshot = readSnapshot(event.target);
  syncVideoLifecycle(context, currentSnapshot);

  if (nextState === youtubeApi.PlayerState.BUFFERING) {
    stopProgressPolling(context);
    if (context.lastPlayerState !== youtubeApi.PlayerState.BUFFERING) {
      context.stateBeforeBuffering = context.lastPlayerState;
    }

    if (
      context.hasStartedPlayback &&
      context.lastPlayerState === youtubeApi.PlayerState.PLAYING &&
      !context.isBuffering
    ) {
      context.isBuffering = true;
      emit(adapterApi, context, 'media_buffer', {
        buffered_fraction: currentSnapshot.bufferedFraction,
      });
    }

    context.lastPlayerState = nextState;
    updateSamplingBaseline(context, currentSnapshot.currentTime);
    return;
  }

  if (nextState === youtubeApi.PlayerState.PLAYING) {
    if (
      context.hasCompletedPlayback &&
      (currentSnapshot.currentTime ?? Infinity) <=
        VIDEO_REPLAY_THRESHOLD_SECONDS
    ) {
      resetVideoLifecycle(context);
      if (currentSnapshot.videoId !== undefined) {
        context.lastVideoId = currentSnapshot.videoId;
      }
    }

    if (
      context.lastPlayerState === youtubeApi.PlayerState.PAUSED &&
      context.lastCurrentTime !== null &&
      currentSnapshot.currentTime !== undefined &&
      Math.abs(currentSnapshot.currentTime - context.lastCurrentTime) >
        config.seekThresholdSeconds
    ) {
      emitSeek(
        adapterApi,
        context,
        context.lastCurrentTime,
        currentSnapshot.currentTime,
      );
    }

    const resumedFromBuffer =
      context.lastPlayerState === youtubeApi.PlayerState.BUFFERING &&
      context.stateBeforeBuffering === youtubeApi.PlayerState.PLAYING;

    context.isBuffering = false;
    context.stateBeforeBuffering = null;
    context.hasStartedPlayback = true;
    context.hasCompletedPlayback = false;

    if (!resumedFromBuffer) {
      emit(adapterApi, context, 'media_play');
    }

    updateSamplingBaseline(context, currentSnapshot.currentTime);
    startProgressPolling(adapterApi, config, context, isAttached);
    context.lastPlayerState = nextState;
    return;
  }

  stopProgressPolling(context);
  updateSamplingBaseline(context, currentSnapshot.currentTime);

  if (nextState === youtubeApi.PlayerState.PAUSED) {
    context.isBuffering = false;
    context.stateBeforeBuffering = null;

    if (context.hasStartedPlayback && !context.hasCompletedPlayback) {
      emit(adapterApi, context, 'media_pause');
    }
  }

  if (nextState === youtubeApi.PlayerState.ENDED) {
    context.isBuffering = false;
    context.stateBeforeBuffering = null;

    if (!context.hasCompletedPlayback) {
      emit(adapterApi, context, 'media_complete', { percent: 100 });
      context.hasCompletedPlayback = true;
    }
  }

  context.lastPlayerState = nextState;
}

function startProgressPolling(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  isAttached: () => boolean,
): void {
  stopProgressPolling(context);

  context.pollTimer = window.setInterval(() => {
    samplePlayback(adapterApi, config, context, isAttached);
  }, config.progressPollMs);
}

function stopProgressPolling(context: PlaybackContext): void {
  if (context.pollTimer === null) {
    return;
  }

  window.clearInterval(context.pollTimer);
  context.pollTimer = null;
}

function samplePlayback(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  isAttached: () => boolean,
): void {
  if (!isAttached() || context.player === null) {
    return;
  }

  const snapshot = readSnapshot(context.player);
  syncVideoLifecycle(context, snapshot);

  if (snapshot.currentTime === undefined) {
    return;
  }

  detectSeek(adapterApi, config, context, snapshot.currentTime);
  emitProgress(adapterApi, config, context, snapshot);
  updateSamplingBaseline(context, snapshot.currentTime);
}

function detectSeek(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  currentTime: number,
): void {
  if (context.lastCurrentTime === null || context.lastSampleAt === null) {
    return;
  }

  const elapsedSeconds = Math.max(
    0,
    (Date.now() - context.lastSampleAt) / 1000,
  );
  const actualDelta = currentTime - context.lastCurrentTime;

  if (Math.abs(actualDelta - elapsedSeconds) > config.seekThresholdSeconds) {
    emitSeek(adapterApi, context, context.lastCurrentTime, currentTime);
  }
}

function emitProgress(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  snapshot: VideoSnapshot,
): void {
  if (
    snapshot.currentTime === undefined ||
    snapshot.duration === undefined ||
    snapshot.duration <= 0
  ) {
    return;
  }

  const percent = computePercent(snapshot.currentTime, snapshot.duration);

  if (percent === undefined) {
    return;
  }

  for (const milestone of config.progressPercentages) {
    if (percent < milestone || context.emittedProgress.has(milestone)) {
      continue;
    }

    context.emittedProgress.add(milestone);
    emit(adapterApi, context, 'media_progress', {
      percent: milestone,
      progress_percent: milestone,
    });
  }
}

function emitSeek(
  adapterApi: YouTubeMediaAdapterApi,
  context: PlaybackContext,
  fromTime: number,
  toTime: number,
): void {
  emit(adapterApi, context, 'media_seek', {
    current_time: toTime,
    delta_seconds: Number((toTime - fromTime).toFixed(3)),
    from_time: fromTime,
    to_time: toTime,
  });
}

function emit(
  adapterApi: YouTubeMediaAdapterApi,
  context: PlaybackContext,
  eventType: YouTubeMediaEventType,
  extraProperties?: EventProperties,
): void {
  if (context.player === null) {
    return;
  }

  const snapshot = readSnapshot(context.player);
  const properties: EventProperties = { provider: 'youtube' };

  if (snapshot.videoId !== undefined) {
    properties.video_id = snapshot.videoId;
  }

  if (snapshot.videoUrl !== undefined) {
    properties.video_url = snapshot.videoUrl;
  }

  if (snapshot.title !== undefined) {
    properties.title = snapshot.title;
  }

  if (snapshot.currentTime !== undefined) {
    properties.current_time = snapshot.currentTime;
  }

  if (snapshot.duration !== undefined) {
    properties.duration = snapshot.duration;
  }

  const percent = computePercent(snapshot.currentTime, snapshot.duration);
  if (percent !== undefined) {
    properties.percent = percent;
  }

  if (extraProperties !== undefined) {
    Object.assign(properties, extraProperties);
  }

  adapterApi.trackMedia(eventType, properties);
}
