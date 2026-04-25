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
import type { EventProperties } from 'tanilytics';

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
    handleBufferingState(
      adapterApi,
      config,
      context,
      youtubeApi,
      currentSnapshot,
      nextState,
    );
    return;
  }

  if (nextState === youtubeApi.PlayerState.PLAYING) {
    handlePlayingState(
      adapterApi,
      config,
      context,
      isAttached,
      youtubeApi,
      currentSnapshot,
      nextState,
    );
    return;
  }

  handleInactiveState(
    adapterApi,
    config,
    context,
    youtubeApi,
    currentSnapshot,
    nextState,
  );
}

function handleBufferingState(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  youtubeApi: YouTubeIframeApi,
  currentSnapshot: VideoSnapshot,
  nextState: number,
): void {
  stopProgressPolling(context);

  if (
    context.lastPlayerState === youtubeApi.PlayerState.PAUSED &&
    !shouldDeferPendingPauseForSeek(config, context)
  ) {
    emitPendingPause(adapterApi, context);
  }

  if (context.lastPlayerState !== youtubeApi.PlayerState.BUFFERING) {
    context.stateBeforeBuffering = context.lastPlayerState;
  }

  if (
    context.stateBeforeBuffering === youtubeApi.PlayerState.PLAYING &&
    context.bufferStartTime === null
  ) {
    context.bufferStartTime =
      context.lastCurrentTime ?? currentSnapshot.currentTime ?? null;
  }

  if (shouldEmitBufferEvent(context, youtubeApi)) {
    context.isBuffering = true;
    emit(adapterApi, context, 'media_buffer', {
      buffered_fraction: currentSnapshot.bufferedFraction,
    });
  }

  context.lastPlayerState = nextState;
  updateSamplingBaseline(context, currentSnapshot.currentTime);
}

function handlePlayingState(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  isAttached: () => boolean,
  youtubeApi: YouTubeIframeApi,
  currentSnapshot: VideoSnapshot,
  nextState: number,
): void {
  resetLifecycleForReplay(context, currentSnapshot);
  const didSeekAfterBuffering = emitSeekAfterBuffering(
    adapterApi,
    config,
    context,
    youtubeApi,
    currentSnapshot,
  );
  const didSeekOnResume = emitSeekOnResume(
    adapterApi,
    config,
    context,
    youtubeApi,
    currentSnapshot,
  );
  const didEmitSeek = didSeekAfterBuffering || didSeekOnResume;

  const resumedFromBuffer =
    context.lastPlayerState === youtubeApi.PlayerState.BUFFERING &&
    context.stateBeforeBuffering === youtubeApi.PlayerState.PLAYING;
  const resumedFromPause =
    context.lastPlayerState === youtubeApi.PlayerState.PAUSED;
  const resumedFromBufferedPause =
    context.lastPlayerState === youtubeApi.PlayerState.BUFFERING &&
    context.stateBeforeBuffering === youtubeApi.PlayerState.PAUSED;

  clearBufferingState(context);
  context.hasStartedPlayback = true;
  context.hasCompletedPlayback = false;

  if (resumedFromPause || resumedFromBufferedPause) {
    if (didEmitSeek) {
      clearPendingPause(context);
    } else {
      emitPendingPause(adapterApi, context);
      emit(adapterApi, context, 'media_play');
      clearPendingPause(context);
    }
  } else if (!resumedFromBuffer) {
    emit(adapterApi, context, 'media_play');
  }

  updateSamplingBaseline(context, currentSnapshot.currentTime);
  startProgressPolling(adapterApi, config, context, isAttached);
  context.lastPlayerState = nextState;
}

function handleInactiveState(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  youtubeApi: YouTubeIframeApi,
  currentSnapshot: VideoSnapshot,
  nextState: number,
): void {
  const previousCurrentTime = context.lastCurrentTime;
  const previousSampleAt = context.lastSampleAt;

  stopProgressPolling(context);
  updateSamplingBaseline(context, currentSnapshot.currentTime);

  if (nextState === youtubeApi.PlayerState.PAUSED) {
    handlePausedState(
      adapterApi,
      config,
      context,
      youtubeApi,
      currentSnapshot,
      previousCurrentTime,
      previousSampleAt,
    );
  }

  if (nextState === youtubeApi.PlayerState.ENDED) {
    handleEndedState(adapterApi, context);
  }

  context.lastPlayerState = nextState;
}

function handlePausedState(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  youtubeApi: YouTubeIframeApi,
  currentSnapshot: VideoSnapshot,
  previousCurrentTime: number | null,
  previousSampleAt: number | null,
): void {
  const alreadyPaused =
    context.lastPlayerState === youtubeApi.PlayerState.PAUSED ||
    (context.lastPlayerState === youtubeApi.PlayerState.BUFFERING &&
      context.stateBeforeBuffering === youtubeApi.PlayerState.PAUSED);

  clearBufferingState(context);

  if (!context.hasStartedPlayback || context.hasCompletedPlayback) {
    return;
  }

  const pauseTime = currentSnapshot.currentTime ?? previousCurrentTime;
  const pauseSeekBaseline = resolvePauseSeekBaseline(
    config,
    previousCurrentTime,
    previousSampleAt,
    pauseTime,
  );

  recordPauseState(
    adapterApi,
    context,
    pauseTime,
    pauseSeekBaseline,
    alreadyPaused,
  );
  context.pausedAtTime ??= pauseTime;
}

function recordPauseState(
  adapterApi: YouTubeMediaAdapterApi,
  context: PlaybackContext,
  pauseTime: number | null,
  pauseSeekBaseline: number | null,
  alreadyPaused: boolean,
): void {
  if (pauseTime === null || alreadyPaused) {
    return;
  }

  context.pausedAtTime = pauseTime;

  if (pauseSeekBaseline !== pauseTime) {
    context.pendingPauseTime = pauseTime;
    context.pendingPauseFromTime = pauseSeekBaseline;
    return;
  }

  emit(adapterApi, context, 'media_pause', {
    current_time: pauseTime,
  });
  context.pendingPauseTime = null;
  context.pendingPauseFromTime = pauseTime;
}

function handleEndedState(
  adapterApi: YouTubeMediaAdapterApi,
  context: PlaybackContext,
): void {
  emitPendingPause(adapterApi, context);
  clearBufferingState(context);

  if (context.hasCompletedPlayback) {
    return;
  }

  emit(adapterApi, context, 'media_complete', { percent: 100 });
  context.hasCompletedPlayback = true;
}

function shouldEmitBufferEvent(
  context: PlaybackContext,
  youtubeApi: YouTubeIframeApi,
): boolean {
  return (
    context.hasStartedPlayback &&
    context.lastPlayerState === youtubeApi.PlayerState.PLAYING &&
    !context.isBuffering
  );
}

function resetLifecycleForReplay(
  context: PlaybackContext,
  currentSnapshot: VideoSnapshot,
): void {
  if (
    !context.hasCompletedPlayback ||
    (currentSnapshot.currentTime ?? Infinity) > VIDEO_REPLAY_THRESHOLD_SECONDS
  ) {
    return;
  }

  resetVideoLifecycle(context);

  if (currentSnapshot.videoId !== undefined) {
    context.lastVideoId = currentSnapshot.videoId;
  }
}

function emitSeekOnResume(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  youtubeApi: YouTubeIframeApi,
  currentSnapshot: VideoSnapshot,
): boolean {
  const resumedFromPause =
    context.lastPlayerState === youtubeApi.PlayerState.PAUSED;
  const resumedFromBufferedPause =
    context.lastPlayerState === youtubeApi.PlayerState.BUFFERING &&
    context.stateBeforeBuffering === youtubeApi.PlayerState.PAUSED;
  const pauseFromTime = context.pendingPauseFromTime ?? context.lastCurrentTime;

  if (
    (!resumedFromPause && !resumedFromBufferedPause) ||
    pauseFromTime === null ||
    currentSnapshot.currentTime === undefined ||
    Math.abs(currentSnapshot.currentTime - pauseFromTime) <
      config.seekThresholdSeconds
  ) {
    return false;
  }

  emitSeek(adapterApi, context, pauseFromTime, currentSnapshot.currentTime);

  return true;
}

function emitSeekAfterBuffering(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  youtubeApi: YouTubeIframeApi,
  currentSnapshot: VideoSnapshot,
): boolean {
  if (
    context.lastPlayerState !== youtubeApi.PlayerState.BUFFERING ||
    context.stateBeforeBuffering !== youtubeApi.PlayerState.PLAYING ||
    context.bufferStartTime === null ||
    currentSnapshot.currentTime === undefined ||
    Math.abs(currentSnapshot.currentTime - context.bufferStartTime) <
      config.seekThresholdSeconds
  ) {
    return false;
  }

  emitSeek(
    adapterApi,
    context,
    context.bufferStartTime,
    currentSnapshot.currentTime,
  );

  return true;
}

function clearBufferingState(context: PlaybackContext): void {
  context.bufferStartTime = null;
  context.isBuffering = false;
  context.stateBeforeBuffering = null;
}

function emitPendingPause(
  adapterApi: YouTubeMediaAdapterApi,
  context: PlaybackContext,
): void {
  if (context.pendingPauseTime === null) {
    return;
  }

  emit(adapterApi, context, 'media_pause', {
    current_time: context.pendingPauseTime,
  });
  context.pendingPauseFromTime = null;
  context.pendingPauseTime = null;
  context.pausedAtTime = null;
}

function clearPendingPause(context: PlaybackContext): void {
  context.pendingPauseFromTime = null;
  context.pendingPauseTime = null;
  context.pausedAtTime = null;
}

function shouldDeferPendingPauseForSeek(
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
): boolean {
  if (context.pendingPauseFromTime === null || context.pausedAtTime === null) {
    return false;
  }

  return (
    Math.abs(context.pausedAtTime - context.pendingPauseFromTime) >=
    config.seekThresholdSeconds
  );
}

function resolvePauseSeekBaseline(
  config: ResolvedYouTubeAdapterOptions,
  previousCurrentTime: number | null,
  previousSampleAt: number | null,
  pauseTime: number | null,
): number | null {
  if (pauseTime === null) {
    return null;
  }

  if (
    previousCurrentTime === null ||
    previousSampleAt === null ||
    computeSeekDelta(previousCurrentTime, pauseTime, previousSampleAt) <
      config.seekThresholdSeconds
  ) {
    return pauseTime;
  }

  return previousCurrentTime;
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

  const didSeek = detectSeek(adapterApi, config, context, snapshot.currentTime);

  if (!didSeek) {
    emitProgress(adapterApi, config, context, snapshot);
  }

  updateSamplingBaseline(context, snapshot.currentTime);
}

function detectSeek(
  adapterApi: YouTubeMediaAdapterApi,
  config: ResolvedYouTubeAdapterOptions,
  context: PlaybackContext,
  currentTime: number,
): boolean {
  if (context.lastCurrentTime === null || context.lastSampleAt === null) {
    return false;
  }

  const seekDelta = computeSeekDelta(
    context.lastCurrentTime,
    currentTime,
    context.lastSampleAt,
  );

  if (seekDelta >= config.seekThresholdSeconds) {
    emitSeek(adapterApi, context, context.lastCurrentTime, currentTime);
    return true;
  }

  return false;
}

function computeSeekDelta(
  fromTime: number,
  toTime: number,
  lastSampleAt: number,
): number {
  const elapsedSeconds = Math.max(0, (Date.now() - lastSampleAt) / 1000);
  const actualDelta = toTime - fromTime;

  return actualDelta < 0
    ? Math.abs(actualDelta)
    : Math.abs(actualDelta - elapsedSeconds);
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
    snapshot.duration <= 0 ||
    context.lastCurrentTime === null
  ) {
    return;
  }

  const previousPercent = computePercent(
    context.lastCurrentTime,
    snapshot.duration,
  );
  const percent = computePercent(snapshot.currentTime, snapshot.duration);

  if (previousPercent === undefined || percent === undefined) {
    return;
  }

  for (const milestone of config.progressPercentages) {
    if (
      percent < milestone ||
      previousPercent >= milestone ||
      context.emittedProgress.has(milestone)
    ) {
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
