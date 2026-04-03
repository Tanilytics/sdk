// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  attachTimeOnPageTracker,
  detachTimeOnPageTracker,
  resetTimeOnPage,
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
    window.dispatchEvent(new Event('pagehide'));

    expect(mockTrack).toHaveBeenCalledWith(
      'page_leave',
      expect.objectContaining({ duration: expect.any(Number) })
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

    window.dispatchEvent(new Event('pagehide'));

    const props = mockTrack.mock.calls[0][1];
    // Should be ~5000ms not ~15000ms
    expect(props.duration).toBeLessThan(6000);
    expect(props.duration).toBeGreaterThan(4000);
  });

  it('does not fire for very short visits under 1 second', () => {
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event('pagehide'));
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('resets timer on SPA navigation', () => {
    // Advance time while page is visible
    vi.advanceTimersByTime(5000);

    // Fire pagehide to accumulate the 5000ms (calls accumulateActiveTime + flushActiveTime)
    // Note: flushActiveTime will fire the event and reset _activeTime back to 0
    window.dispatchEvent(new Event('pagehide'));

    // Should have fired for the previous page
    expect(mockTrack).toHaveBeenCalledTimes(1);
    const firstEventProps = mockTrack.mock.calls[0][1];
    expect(firstEventProps.duration).toBeLessThan(6000);
    expect(firstEventProps.duration).toBeGreaterThan(4000);

    mockTrack.mockClear();

    // Now call resetTimeOnPage to simulate SPA navigation reset
    resetTimeOnPage();

    // Fresh timer for new page
    vi.advanceTimersByTime(3000);
    window.dispatchEvent(new Event('pagehide'));

    const props = mockTrack.mock.calls[0][1];
    expect(props.duration).toBeLessThan(4000);
    expect(props.duration).toBeGreaterThan(2000);
  });
});
