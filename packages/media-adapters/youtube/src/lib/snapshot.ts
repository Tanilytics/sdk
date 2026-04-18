import type { VideoSnapshot, YouTubePlayer, YouTubeVideoData } from './types';

export function readSnapshot(player: YouTubePlayer): VideoSnapshot {
  const currentTime = readNumber(() => player.getCurrentTime());
  const duration = readNumber(() => player.getDuration());
  const videoUrl = readString(() => player.getVideoUrl());
  const videoData = readVideoData(player);

  return {
    bufferedFraction: readNumber(() => player.getVideoLoadedFraction()),
    currentTime,
    duration,
    title: sanitiseString(videoData?.title),
    videoId:
      sanitiseString(videoData?.video_id) ?? readVideoIdFromUrl(videoUrl),
    videoUrl,
  };
}

export function computePercent(
  currentTime: number | undefined,
  duration: number | undefined,
): number | undefined {
  if (currentTime === undefined || duration === undefined || duration <= 0) {
    return undefined;
  }

  return Math.max(0, Math.min(100, Math.floor((currentTime / duration) * 100)));
}

function readVideoData(player: YouTubePlayer): YouTubeVideoData | undefined {
  try {
    return player.getVideoData();
  } catch {
    return undefined;
  }
}

function readVideoIdFromUrl(videoUrl: string | undefined): string | undefined {
  if (videoUrl === undefined) {
    return undefined;
  }

  try {
    const parsed = new URL(videoUrl);
    return sanitiseString(parsed.searchParams.get('v') ?? undefined);
  } catch {
    return undefined;
  }
}

function readNumber(read: () => number): number | undefined {
  try {
    const value = read();

    if (!Number.isFinite(value)) {
      return undefined;
    }

    return Number(value.toFixed(3));
  } catch {
    return undefined;
  }
}

function readString(read: () => string): string | undefined {
  try {
    return sanitiseString(read());
  } catch {
    return undefined;
  }
}

function sanitiseString(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
