// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  attachTimeOnPageTracker,
  detachTimeOnPageTracker,
  resetTimeOnPage,
  flushTimeOnPage,
} from './time-on-page';

const mockTrack = vi.fn();

beforeEach(() => {
  mockTrack.mockClear();
  vi.useFakeTimers();

  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    writable: true,
    configurable: true,
  });

  attachTimeOnPageTracker({ track: mockTrack });
});

afterEach(() => {
  detachTimeOnPageTracker();
  vi.useRealTimers();
});

describe('Time on page tracking', () => {
  it('fires page_leave event on page hide', () => {
    vi.advanceTimersByTime(5000);
    globalThis.dispatchEvent(new Event('pagehide'));

    expect(mockTrack).toHaveBeenCalledWith(
      'page_leave',
      expect.objectContaining({ duration: expect.any(Number) }),
    );
  });

  it('does not count time when page is hidden', () => {
    vi.advanceTimersByTime(3000);

    // Page goes hidden
    Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));

    // More time passes while hidden — should not count
    vi.advanceTimersByTime(10000);

    // Page comes back
    Object.defineProperty(document, 'visibilityState', { value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));

    vi.advanceTimersByTime(2000);

    globalThis.dispatchEvent(new Event('pagehide'));

    const props = mockTrack.mock.calls[0][1];
    // Should be ~5000ms not ~15000ms
    expect(props.duration).toBeLessThan(6000);
    expect(props.duration).toBeGreaterThan(4000);
  });

  it('does not fire for very short visits under 1 second', () => {
    vi.advanceTimersByTime(500);
    globalThis.dispatchEvent(new Event('pagehide'));
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('resets timer on SPA navigation without firing page_leave', () => {
    vi.advanceTimersByTime(5000);

    // resetTimeOnPage simulates SPA navigation: it resets timers
    // but no longer fires PAGE_LEAVE — that is the page-view tracker's job
    resetTimeOnPage();

    // No page_leave event should have been fired
    expect(mockTrack).not.toHaveBeenCalled();

    // Fresh timer for new page
    vi.advanceTimersByTime(3000);
    globalThis.dispatchEvent(new Event('pagehide'));

    const props = mockTrack.mock.calls[0][1];
    expect(props.duration).toBeLessThan(4000);
    expect(props.duration).toBeGreaterThan(2000);
  });

  it('flushTimeOnPage returns duration and resets accumulator', () => {
    vi.advanceTimersByTime(5000);

    const duration = flushTimeOnPage();

    expect(duration).toBe(5000);

    // Accumulator should be reset — further flushes return null if no time passes
    const secondFlush = flushTimeOnPage();
    expect(secondFlush).toBeNull();

    // No event should have been fired — flushTimeOnPage does not track
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('flushTimeOnPage returns null for durations under 1 second', () => {
    vi.advanceTimersByTime(500);

    const duration = flushTimeOnPage();

    expect(duration).toBeNull();
  });
});
