import { describe, expect, it } from 'vitest';

import * as autocapture from './index';

describe('autocapture/index exports', () => {
  it('exports attach and detach functions', () => {
    expect(typeof autocapture.attachPageViewTracker).toBe('function');
    expect(typeof autocapture.detachPageViewTracker).toBe('function');
    expect(typeof autocapture.attachClickTracker).toBe('function');
    expect(typeof autocapture.detachClickTracker).toBe('function');
    expect(typeof autocapture.attachFormTracker).toBe('function');
    expect(typeof autocapture.detachFormTracker).toBe('function');
    expect(typeof autocapture.attachScrollDepthTracker).toBe('function');
    expect(typeof autocapture.detachScrollDepthTracker).toBe('function');
    expect(typeof autocapture.resetScrollDepth).toBe('function');
    expect(typeof autocapture.attachTimeOnPageTracker).toBe('function');
    expect(typeof autocapture.detachTimeOnPageTracker).toBe('function');
    expect(typeof autocapture.resetTimeOnPage).toBe('function');
  });
});
