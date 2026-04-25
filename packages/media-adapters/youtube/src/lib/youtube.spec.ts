// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { youtubeAdapter } from './youtube';

interface MockYouTubePlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getVideoLoadedFraction(): number;
  getVideoUrl(): string;
  getVideoData(): { video_id?: string; title?: string };
  getIframe(): HTMLIFrameElement;
}

interface MockPlayerState {
  player: MockYouTubePlayer;
  setCurrentTime(value: number): void;
  setDuration(value: number): void;
  setLoadedFraction(value: number): void;
  setVideoData(value: { video_id?: string; title?: string }): void;
  setVideoUrl(value: string): void;
}

function createIframe(
  src = 'https://www.youtube.com/embed/abc123xyz89?enablejsapi=1&origin=https://example.com',
): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.src = src;
  document.body.appendChild(iframe);
  return iframe;
}

function createMockPlayer(iframe: HTMLIFrameElement): MockPlayerState {
  let currentTime = 0;
  let duration = 100;
  let loadedFraction = 0.5;
  let videoUrl = 'https://www.youtube.com/watch?v=abc123xyz89';
  let videoData: { video_id?: string; title?: string } = {
    video_id: 'abc123xyz89',
    title: 'Test video',
  };

  return {
    player: {
      getCurrentTime: () => currentTime,
      getDuration: () => duration,
      getIframe: () => iframe,
      getVideoData: () => videoData,
      getVideoLoadedFraction: () => loadedFraction,
      getVideoUrl: () => videoUrl,
    },
    setCurrentTime(value) {
      currentTime = value;
    },
    setDuration(value) {
      duration = value;
    },
    setLoadedFraction(value) {
      loadedFraction = value;
    },
    setVideoData(value) {
      videoData = value;
    },
    setVideoUrl(value) {
      videoUrl = value;
    },
  };
}

function installYouTubeApi(
  players: Map<HTMLIFrameElement, MockYouTubePlayer>,
): {
  emitReady(iframe: HTMLIFrameElement): void;
  emitStateChange(iframe: HTMLIFrameElement, state: number): void;
  playerCtor: ReturnType<typeof vi.fn>;
  states: { BUFFERING: number; ENDED: number; PAUSED: number; PLAYING: number };
} {
  const events = new Map<
    HTMLIFrameElement,
    {
      onReady?: (event: { target: MockYouTubePlayer }) => void;
      onStateChange?: (event: {
        data: number;
        target: MockYouTubePlayer;
      }) => void;
    }
  >();
  const states = {
    BUFFERING: 3,
    ENDED: 0,
    PAUSED: 2,
    PLAYING: 1,
  };
  const playerCtor = vi.fn(function (
    this: unknown,
    target: HTMLIFrameElement,
    options?: {
      events?: {
        onReady?: (event: { target: MockYouTubePlayer }) => void;
        onStateChange?: (event: {
          data: number;
          target: MockYouTubePlayer;
        }) => void;
      };
    },
  ) {
    const player = players.get(target);

    if (player === undefined) {
      throw new Error('Missing mock player for iframe.');
    }

    events.set(target, { ...options?.events });
    return player;
  });
  const youtubeApi = {
    Player: playerCtor,
    PlayerState: states,
  };

  vi.stubGlobal('YT', youtubeApi);
  window.YT = youtubeApi;

  return {
    emitReady(iframe) {
      const player = players.get(iframe);
      if (player === undefined) {
        throw new Error('Missing mock player for iframe.');
      }

      events.get(iframe)?.onReady?.({ target: player });
    },
    emitStateChange(iframe, state) {
      const player = players.get(iframe);
      if (player === undefined) {
        throw new Error('Missing mock player for iframe.');
      }

      events.get(iframe)?.onStateChange?.({ data: state, target: player });
    },
    playerCtor,
    states,
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function attachSingleIframeAdapter({
  adapterOptions,
  configurePlayer,
}: {
  adapterOptions?: Parameters<typeof youtubeAdapter>[0];
  configurePlayer?: (playerState: MockPlayerState) => void;
} = {}): Promise<{
  adapter: ReturnType<typeof youtubeAdapter>;
  iframe: HTMLIFrameElement;
  playerState: MockPlayerState;
  trackMedia: ReturnType<typeof vi.fn>;
  youtubeApi: ReturnType<typeof installYouTubeApi>;
}> {
  const iframe = createIframe();
  const playerState = createMockPlayer(iframe);

  configurePlayer?.(playerState);

  const youtubeApi = installYouTubeApi(new Map([[iframe, playerState.player]]));
  const trackMedia = vi.fn();
  const adapter = youtubeAdapter({ iframe, ...adapterOptions });

  adapter.attach({ trackMedia });
  await flushMicrotasks();

  return {
    adapter,
    iframe,
    playerState,
    trackMedia,
    youtubeApi,
  };
}

async function attachSeekToEndScenario(): Promise<{
  iframe: HTMLIFrameElement;
  playerState: MockPlayerState;
  trackMedia: ReturnType<typeof vi.fn>;
  youtubeApi: ReturnType<typeof installYouTubeApi>;
}> {
  const { iframe, playerState, trackMedia, youtubeApi } =
    await attachSingleIframeAdapter({
      adapterOptions: { seekThresholdSeconds: 2 },
      configurePlayer(player) {
        player.setDuration(100);
      },
    });

  youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

  playerState.setCurrentTime(1);
  await vi.advanceTimersByTimeAsync(1000);
  playerState.setCurrentTime(2);
  await vi.advanceTimersByTimeAsync(1000);

  return {
    iframe,
    playerState,
    trackMedia,
    youtubeApi,
  };
}

function expectSeekToEndWithoutProgressBackfill(
  trackMedia: ReturnType<typeof vi.fn>,
): void {
  const progressCalls = trackMedia.mock.calls.filter(
    ([eventType]) => eventType === 'media_progress',
  );
  const seekCalls = trackMedia.mock.calls.filter(
    ([eventType]) => eventType === 'media_seek',
  );

  expect(progressCalls).toHaveLength(0);
  expect(seekCalls).toHaveLength(1);
  expect(seekCalls[0]?.[1]).toMatchObject({
    current_time: 100,
    delta_seconds: 98,
    from_time: 2,
    to_time: 100,
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete window.YT;
  delete window.onYouTubeIframeAPIReady;
});

describe('youtubeAdapter', () => {
  it('requires enablejsapi=1 and origin on an explicit iframe src', () => {
    const missingEnableJsApi = createIframe(
      'https://www.youtube.com/embed/abc123xyz89?origin=https://example.com',
    );
    const missingOrigin = createIframe(
      'https://www.youtube.com/embed/abc123xyz89?enablejsapi=1',
    );

    expect(() =>
      youtubeAdapter({ iframe: missingEnableJsApi }).attach({
        trackMedia: vi.fn(),
      }),
    ).toThrow(/enablejsapi=1/);

    expect(() =>
      youtubeAdapter({ iframe: missingOrigin }).attach({
        trackMedia: vi.fn(),
      }),
    ).toThrow(/origin query parameter/);
  });

  it('detects all valid YouTube iframes by default', async () => {
    const firstIframe = createIframe();
    const secondIframe = createIframe(
      'https://www.youtube-nocookie.com/embed/xyz987abc65?enablejsapi=1&origin=https://example.com',
    );
    createIframe(
      'https://www.youtube.com/embed/ignored?origin=https://example.com',
    );
    createIframe(
      'https://example.com/embed/not-youtube?enablejsapi=1&origin=https://example.com',
    );

    const firstPlayer = createMockPlayer(firstIframe);
    const secondPlayer = createMockPlayer(secondIframe);
    secondPlayer.setVideoData({
      title: 'Other video',
      video_id: 'xyz987abc65',
    });
    secondPlayer.setVideoUrl('https://www.youtube.com/watch?v=xyz987abc65');

    const youtubeApi = installYouTubeApi(
      new Map([
        [firstIframe, firstPlayer.player],
        [secondIframe, secondPlayer.player],
      ]),
    );
    const trackMedia = vi.fn();

    youtubeAdapter().attach({ trackMedia });
    await flushMicrotasks();

    expect(youtubeApi.playerCtor).toHaveBeenCalledTimes(2);
    expect(youtubeApi.playerCtor).toHaveBeenNthCalledWith(
      1,
      firstIframe,
      expect.any(Object),
    );
    expect(youtubeApi.playerCtor).toHaveBeenNthCalledWith(
      2,
      secondIframe,
      expect.any(Object),
    );
  });

  it('maps YouTube playback state changes to media events', async () => {
    const { iframe, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter();

    youtubeApi.emitReady(iframe);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.BUFFERING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
      'media_buffer',
    ]);
    expect(trackMedia.mock.calls[0]?.[1]).toMatchObject({
      provider: 'youtube',
      title: 'Test video',
      video_id: 'abc123xyz89',
      video_url: 'https://www.youtube.com/watch?v=abc123xyz89',
    });
  });

  it('emits media_play when playback starts after initial buffering', async () => {
    const { iframe, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter();

    youtubeApi.emitStateChange(iframe, youtubeApi.states.BUFFERING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
    ]);
  });

  it('emits media_play when playback resumes from pause through buffering', async () => {
    const { iframe, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter();

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.BUFFERING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
      'media_pause',
      'media_play',
    ]);
  });

  it('emits media_pause before media_play when playback resumes without seeking', async () => {
    const { iframe, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter();

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
      'media_pause',
      'media_play',
    ]);
  });

  it('emits media_pause immediately when playback is paused', async () => {
    const { iframe, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter();

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
      'media_pause',
    ]);
  });

  it('does not emit media_buffer when buffering occurs before first play', async () => {
    const { iframe, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter();

    youtubeApi.emitStateChange(iframe, youtubeApi.states.BUFFERING);

    expect(trackMedia).not.toHaveBeenCalled();
  });

  it('does not emit media_buffer when buffering occurs while paused', async () => {
    const { iframe, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter();

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.BUFFERING);

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
      'media_pause',
    ]);
  });

  it('tracks multiple detected iframes independently', async () => {
    const firstIframe = createIframe();
    const secondIframe = createIframe(
      'https://www.youtube.com/embed/xyz987abc65?enablejsapi=1&origin=https://example.com',
    );
    const firstPlayer = createMockPlayer(firstIframe);
    const secondPlayer = createMockPlayer(secondIframe);
    secondPlayer.setVideoData({
      video_id: 'xyz987abc65',
      title: 'Second video',
    });
    secondPlayer.setVideoUrl('https://www.youtube.com/watch?v=xyz987abc65');

    const youtubeApi = installYouTubeApi(
      new Map([
        [firstIframe, firstPlayer.player],
        [secondIframe, secondPlayer.player],
      ]),
    );
    const trackMedia = vi.fn();

    youtubeAdapter().attach({ trackMedia });
    await flushMicrotasks();

    youtubeApi.emitStateChange(firstIframe, youtubeApi.states.PLAYING);
    youtubeApi.emitStateChange(secondIframe, youtubeApi.states.PLAYING);

    expect(
      trackMedia.mock.calls.filter(([eventType]) => eventType === 'media_play'),
    ).toHaveLength(2);
    expect(trackMedia.mock.calls[0]?.[1]).toMatchObject({
      video_id: 'abc123xyz89',
    });
    expect(trackMedia.mock.calls[1]?.[1]).toMatchObject({
      video_id: 'xyz987abc65',
    });
  });

  it('continues attaching other iframes when one player creation fails', async () => {
    const firstIframe = createIframe();
    const secondIframe = createIframe(
      'https://www.youtube.com/embed/xyz987abc65?enablejsapi=1&origin=https://example.com',
    );
    const firstPlayer = createMockPlayer(firstIframe);
    const secondPlayer = createMockPlayer(secondIframe);
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const youtubeApi = installYouTubeApi(
      new Map([
        [firstIframe, firstPlayer.player],
        [secondIframe, secondPlayer.player],
      ]),
    );

    youtubeApi.playerCtor.mockImplementationOnce(() => {
      throw new Error('Player creation failed.');
    });

    const trackMedia = vi.fn();

    youtubeAdapter().attach({ trackMedia });
    await flushMicrotasks();

    expect(youtubeApi.playerCtor).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(
      '[Tanilytics] Failed to initialise YouTube player for iframe.',
      firstIframe,
      expect.any(Error),
    );

    youtubeApi.emitStateChange(secondIframe, youtubeApi.states.PLAYING);

    expect(trackMedia).toHaveBeenCalledWith(
      'media_play',
      expect.objectContaining({
        video_id: 'abc123xyz89',
      }),
    );
  });

  it('emits milestone progress and seek events while playing', async () => {
    vi.useFakeTimers();

    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: { seekThresholdSeconds: 2 },
        configurePlayer(player) {
          player.setDuration(4);
        },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    playerState.setCurrentTime(1);
    await vi.advanceTimersByTimeAsync(1000);
    playerState.setCurrentTime(2);
    await vi.advanceTimersByTimeAsync(1000);
    playerState.setCurrentTime(3);
    await vi.advanceTimersByTimeAsync(1000);
    playerState.setCurrentTime(0);
    await vi.advanceTimersByTimeAsync(1000);

    const progressCalls = trackMedia.mock.calls.filter(
      ([eventType]) => eventType === 'media_progress',
    );
    const seekCall = trackMedia.mock.calls.find(
      ([eventType]) => eventType === 'media_seek',
    );

    expect(progressCalls).toHaveLength(3);
    expect(
      progressCalls.map(([, properties]) => properties?.progress_percent),
    ).toEqual([25, 50, 75]);
    expect(seekCall?.[1]).toMatchObject({
      current_time: 0,
      delta_seconds: -3,
      from_time: 3,
      to_time: 0,
    });
  });

  it('does not backfill progress milestones when playback seeks to the end', async () => {
    vi.useFakeTimers();

    const { playerState, trackMedia } = await attachSeekToEndScenario();

    playerState.setCurrentTime(100);
    await vi.advanceTimersByTimeAsync(1000);

    expectSeekToEndWithoutProgressBackfill(trackMedia);
  });

  it('does not backfill progress milestones when resuming at the end after a seek', async () => {
    vi.useFakeTimers();

    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSeekToEndScenario();

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);
    playerState.setCurrentTime(100);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    await vi.advanceTimersByTimeAsync(1000);

    expectSeekToEndWithoutProgressBackfill(trackMedia);
  });

  it('does not emit media_seek for small playback jumps while playing', async () => {
    vi.useFakeTimers();

    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        configurePlayer(player) {
          player.setDuration(30);
        },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    playerState.setCurrentTime(1);
    await vi.advanceTimersByTimeAsync(1000);
    playerState.setCurrentTime(2.4);
    await vi.advanceTimersByTimeAsync(1000);

    expect(
      trackMedia.mock.calls.filter(([eventType]) => eventType === 'media_seek'),
    ).toHaveLength(0);
  });

  it('does not emit media_seek when normal playback sampling is delayed', async () => {
    vi.useFakeTimers();

    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: { progressPollMs: 10_000, seekThresholdSeconds: 2 },
        configurePlayer(player) {
          player.setDuration(30);
        },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    playerState.setCurrentTime(10);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(
      trackMedia.mock.calls.filter(([eventType]) => eventType === 'media_seek'),
    ).toHaveLength(0);
  });

  it('respects configured seekThresholdSeconds when detecting larger jumps', async () => {
    vi.useFakeTimers();

    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: { seekThresholdSeconds: 4 },
        configurePlayer(player) {
          player.setDuration(30);
        },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    playerState.setCurrentTime(1);
    await vi.advanceTimersByTimeAsync(1000);
    playerState.setCurrentTime(6);
    await vi.advanceTimersByTimeAsync(1000);

    const seekCalls = trackMedia.mock.calls.filter(
      ([eventType]) => eventType === 'media_seek',
    );

    expect(seekCalls).toHaveLength(1);
    expect(seekCalls[0]?.[1]).toMatchObject({
      current_time: 6,
      delta_seconds: 5,
      from_time: 1,
      to_time: 6,
    });
  });

  it('does not emit media_seek when a pause-resume jump stays below the configured threshold', async () => {
    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: { seekThresholdSeconds: 4 },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);

    playerState.setCurrentTime(3);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(
      trackMedia.mock.calls.filter(([eventType]) => eventType === 'media_seek'),
    ).toHaveLength(0);
  });

  it('does not emit media_seek when resuming from a normal pause after stale playback sampling', async () => {
    vi.useFakeTimers();

    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: {
          progressPercentages: [100],
          progressPollMs: 10_000,
          seekThresholdSeconds: 2,
        },
        configurePlayer(player) {
          player.setCurrentTime(115.517);
          player.setDuration(214);
        },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    playerState.setCurrentTime(122.481);
    await vi.advanceTimersByTimeAsync(6_964);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);

    playerState.setCurrentTime(122.755);
    await vi.advanceTimersByTimeAsync(296);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
      'media_pause',
      'media_play',
    ]);
  });

  it('emits media_seek when a pause-resume jump reaches the configured threshold', async () => {
    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: { seekThresholdSeconds: 3 },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);

    playerState.setCurrentTime(3);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    const seekCalls = trackMedia.mock.calls.filter(
      ([eventType]) => eventType === 'media_seek',
    );

    expect(seekCalls).toHaveLength(1);
    expect(seekCalls[0]?.[1]).toMatchObject({
      current_time: 3,
      delta_seconds: 3,
      from_time: 0,
      to_time: 3,
    });
  });

  it('emits media_seek without transient pause or play for keyboard-style jumps', async () => {
    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: { seekThresholdSeconds: 10 },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    playerState.setCurrentTime(10);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
      'media_seek',
    ]);
    expect(trackMedia.mock.calls[1]?.[1]).toMatchObject({
      current_time: 10,
      delta_seconds: 10,
      from_time: 0,
      to_time: 10,
    });
  });

  it('emits media_seek for repeated paused states during keyboard-style jumps', async () => {
    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: { seekThresholdSeconds: 10 },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    playerState.setCurrentTime(10.6);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);
    playerState.setCurrentTime(10.4);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
      'media_seek',
    ]);
    expect(trackMedia.mock.calls[1]?.[1]).toMatchObject({
      current_time: 10.4,
      delta_seconds: 10.4,
      from_time: 0,
      to_time: 10.4,
    });
  });

  it('emits media_seek for paused buffering keyboard jumps without duplicate pauses', async () => {
    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: { seekThresholdSeconds: 10 },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    playerState.setCurrentTime(10.7);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.BUFFERING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);
    playerState.setCurrentTime(10.5);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
      'media_seek',
    ]);
    expect(trackMedia.mock.calls[1]?.[1]).toMatchObject({
      current_time: 10.5,
      delta_seconds: 10.5,
      from_time: 0,
      to_time: 10.5,
    });
  });

  it('emits media_seek for large jumps across buffering transitions', async () => {
    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: { seekThresholdSeconds: 10 },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    playerState.setCurrentTime(30);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.BUFFERING);
    playerState.setCurrentTime(55);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.BUFFERING);
    playerState.setCurrentTime(72);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    const seekCalls = trackMedia.mock.calls.filter(
      ([eventType]) => eventType === 'media_seek',
    );

    expect(seekCalls).toHaveLength(1);
    expect(seekCalls[0]?.[1]).toMatchObject({
      current_time: 72,
      delta_seconds: 72,
      from_time: 0,
      to_time: 72,
    });
  });

  it('does not emit media_seek for small jumps across buffering transitions', async () => {
    const { iframe, playerState, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter({
        adapterOptions: { seekThresholdSeconds: 10 },
      });

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    playerState.setCurrentTime(5);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.BUFFERING);
    playerState.setCurrentTime(9);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(
      trackMedia.mock.calls.filter(([eventType]) => eventType === 'media_seek'),
    ).toHaveLength(0);
  });

  it('emits media_complete once when playback ends', async () => {
    const { iframe, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter();

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.ENDED);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.ENDED);

    expect(
      trackMedia.mock.calls.filter(
        ([eventType]) => eventType === 'media_complete',
      ),
    ).toHaveLength(1);
  });

  it('ignores late callbacks after detach and preserves detected iframes', async () => {
    const { adapter, iframe, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter();

    adapter.detach();

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);

    expect(trackMedia).not.toHaveBeenCalled();
    expect(document.body.contains(iframe)).toBe(true);
  });

  it('preserves a pause emitted before detach', async () => {
    const { adapter, iframe, trackMedia, youtubeApi } =
      await attachSingleIframeAdapter();

    youtubeApi.emitStateChange(iframe, youtubeApi.states.PLAYING);
    youtubeApi.emitStateChange(iframe, youtubeApi.states.PAUSED);
    adapter.detach();

    expect(trackMedia.mock.calls.map(([eventType]) => eventType)).toEqual([
      'media_play',
      'media_pause',
    ]);
  });

  it('loads the iframe API script once and preserves existing ready callbacks', async () => {
    const firstIframe = createIframe();
    const secondIframe = createIframe(
      'https://www.youtube-nocookie.com/embed/xyz987abc65?enablejsapi=1&origin=https://example.com',
    );
    const previousReadyCallback = vi.fn();
    const firstPlayer = createMockPlayer(firstIframe).player;
    const secondPlayer = createMockPlayer(secondIframe).player;
    const playerCtor = vi.fn(function (
      this: unknown,
      target: HTMLIFrameElement,
    ) {
      return target === firstIframe ? firstPlayer : secondPlayer;
    });

    window.onYouTubeIframeAPIReady = previousReadyCallback;

    youtubeAdapter().attach({ trackMedia: vi.fn() });

    expect(
      document.querySelectorAll(
        'script[src="https://www.youtube.com/iframe_api"]',
      ),
    ).toHaveLength(1);

    const youtubeApi = {
      Player: playerCtor,
      PlayerState: {
        BUFFERING: 3,
        ENDED: 0,
        PAUSED: 2,
        PLAYING: 1,
      },
    };

    vi.stubGlobal('YT', youtubeApi);
    window.YT = youtubeApi;
    window.onYouTubeIframeAPIReady?.();
    await flushMicrotasks();

    expect(previousReadyCallback).toHaveBeenCalledTimes(1);
    expect(playerCtor).toHaveBeenCalledTimes(2);
  });
});
