export interface RetryOptions {
  maxAttempts: number; // Total attempts including the first one
  baseDelayMs: number; // Delay before second attempt
}

export interface RetryResult<T> {
  success: boolean;
  value?: T;
  attempts: number;
  finalError?: string;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
};

/**
 * Calls fn() up to maxAttempts times with exponential backoff between attempts.
 * Stops retrying immediately if fn() signals a permanent failure.
 *
 * fn() must return { retryable: boolean } so the retry loop knows
 * whether to try again or give up immediately.
 */
export async function withRetry<T extends { ok: boolean; retryable: boolean }>(
  fn: () => Promise<T>,
  opts: Partial<RetryOptions> = {},
): Promise<RetryResult<T>> {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  let lastResult: T | undefined;
  let lastThrownError: string | undefined;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      const result = await fn();

      if (result.ok) {
        return { success: true, value: result, attempts: attempt };
      }

      // Permanent failure — do not retry
      if (!result.retryable) {
        return { success: false, value: result, attempts: attempt };
      }

      lastResult = result;

      // Retryable failure — wait before next attempt
      if (attempt < options.maxAttempts) {
        await sleep(getBackoffDelay(attempt, options.baseDelayMs));
      }
    } catch (err) {
      // Unexpected throw — treat as retryable
      lastThrownError = err instanceof Error ? err.message : 'unknown';

      if (attempt < options.maxAttempts) {
        await sleep(getBackoffDelay(attempt, options.baseDelayMs));
      }
    }
  }

  return {
    success: false,
    value: lastResult,
    attempts: options.maxAttempts,
    finalError: lastThrownError ?? 'Max attempts reached',
  };
}

// Helpers

/**
 * Exponential backoff with jitter.
 *
 * attempt 1 → ~1000ms
 * attempt 2 → ~2000ms
 * attempt 3 → ~4000ms
 *
 * Jitter (0–500ms random) prevents multiple SDK instances from
 * all retrying at exactly the same moment after a server hiccup.
 */
function getBackoffDelay(attempt: number, baseDelayMs: number): number {
  const exponential = baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 500;
  return exponential + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
