import { afterEach, describe, expect, it, vi } from 'vitest';

import { withRetry } from './retry';

describe('withRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stops immediately on permanent failure', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: false, retryable: false });

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
  });

  it('returns the thrown error message after max attempts', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fn = vi.fn().mockRejectedValue(new Error('network exploded'));
    const promise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
    expect(result.finalError).toBe('network exploded');
  });
});
