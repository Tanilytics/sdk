// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  attachScrollDepthTracker,
  detachScrollDepthTracker,
  resetScrollDepth,
} from './scroll-depth';

const mockTrack = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

// Mock IntersectionObserver — jsdom does not implement it
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  observed: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.observed = this.observed.filter((o) => o !== el);
  }
  disconnect() {
    this.observed = [];
  }

  // Test helper — simulate an element becoming visible
  trigger(el: Element) {
    this.callback(
      [
        {
          target: el,
          isIntersecting: true,
          intersectionRatio: 1,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver
    );
  }
}

let mockObserver: MockIntersectionObserver;

beforeEach(() => {
  mockTrack.mockClear();
  document.body.innerHTML = '';

  // Create a proper constructor function that works with 'new' operator
  class IntersectionObserverMock extends MockIntersectionObserver {
    constructor(cb: IntersectionObserverCallback) {
      super(cb);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      mockObserver = this;
    }
  }

  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

  // Initialize mockObserver by calling the stubbed constructor
  new IntersectionObserverMock(noop);

  attachScrollDepthTracker({ track: mockTrack });
});

afterEach(() => {
  detachScrollDepthTracker();
  vi.unstubAllGlobals();
});

describe('Scroll depth tracking', () => {
  it('fires scroll_depth event when sentinel becomes visible', () => {
    const sentinel = document.querySelector('[data-analytics-sentinel="25"]')!;
    mockObserver.trigger(sentinel);

    expect(mockTrack).toHaveBeenCalledWith(
      'scroll_depth',
      expect.objectContaining({ milestone: 25 })
    );
  });

  it('fires each milestone exactly once', () => {
    const sentinel = document.querySelector('[data-analytics-sentinel="50"]')!;

    mockObserver.trigger(sentinel);
    mockObserver.trigger(sentinel);
    mockObserver.trigger(sentinel);

    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('fires all four milestones independently', () => {
    [25, 50, 75, 100].forEach((milestone) => {
      const sentinel = document.querySelector(
        `[data-analytics-sentinel="${milestone}"]`
      )!;
      mockObserver.trigger(sentinel);
    });

    expect(mockTrack).toHaveBeenCalledTimes(4);
  });

  it('includes timeToReach in the event properties', () => {
    const sentinel = document.querySelector('[data-analytics-sentinel="25"]')!;
    mockObserver.trigger(sentinel);

    const props = mockTrack.mock.calls[0][1];
    expect(typeof props.timeToReach).toBe('number');
    expect(props.timeToReach).toBeGreaterThanOrEqual(0);
  });

  it('resets milestones after resetScrollDepth()', () => {
    const sentinel25 = document.querySelector(
      '[data-analytics-sentinel="25"]'
    )!;
    mockObserver.trigger(sentinel25);
    expect(mockTrack).toHaveBeenCalledTimes(1);

    resetScrollDepth();
    mockTrack.mockClear();

    // After reset, new sentinels are placed
    const newSentinel = document.querySelector(
      '[data-analytics-sentinel="25"]'
    )!;
    mockObserver.trigger(newSentinel);
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('does not fire after detach', () => {
    detachScrollDepthTracker();
    mockTrack.mockClear();

    const sentinel = document.querySelector('[data-analytics-sentinel="25"]');
    expect(sentinel).toBeNull(); // sentinels removed
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
