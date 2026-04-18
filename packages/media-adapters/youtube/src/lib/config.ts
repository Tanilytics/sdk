import {
  DEFAULT_PROGRESS_PERCENTAGES,
  DEFAULT_PROGRESS_POLL_MS,
  DEFAULT_SEEK_THRESHOLD_SECONDS,
} from './constants';
import type {
  ResolvedYouTubeAdapterOptions,
  YouTubeIframeAdapterOptions,
} from './types';

export function resolveOptions(
  options: YouTubeIframeAdapterOptions,
): ResolvedYouTubeAdapterOptions {
  if (
    options.iframe !== undefined &&
    !(options.iframe instanceof HTMLIFrameElement)
  ) {
    throw new Error(
      '[AnalyticsSDK] The YouTube adapter requires iframe to be an HTMLIFrameElement.',
    );
  }

  const progressPollMs = options.progressPollMs ?? DEFAULT_PROGRESS_POLL_MS;
  if (!Number.isInteger(progressPollMs) || progressPollMs < 100) {
    throw new Error('[AnalyticsSDK] progressPollMs must be an integer >= 100.');
  }

  const seekThresholdSeconds =
    options.seekThresholdSeconds ?? DEFAULT_SEEK_THRESHOLD_SECONDS;

  if (seekThresholdSeconds <= 0) {
    throw new Error(
      '[AnalyticsSDK] seekThresholdSeconds must be greater than 0.',
    );
  }

  return {
    iframe: options.iframe,
    progressPercentages: normaliseProgressPercentages(
      options.progressPercentages,
    ),
    progressPollMs,
    seekThresholdSeconds,
  };
}

function normaliseProgressPercentages(
  progressPercentages: readonly number[] | undefined,
): readonly number[] {
  const values = progressPercentages ?? DEFAULT_PROGRESS_PERCENTAGES;

  const uniqueSortedValues = [...new Set(values)]
    .filter((value) => Number.isInteger(value) && value > 0 && value <= 100)
    .sort((left, right) => left - right);

  if (uniqueSortedValues.length === 0) {
    throw new Error(
      '[AnalyticsSDK] progressPercentages must include at least one integer between 1 and 100.',
    );
  }

  return uniqueSortedValues;
}
