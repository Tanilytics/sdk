import { describe, expect, it } from 'vitest';

import * as autocapture from './index';

describe('autocapture/index exports', () => {
  it('exports attach and detach functions', () => {
    expect(typeof autocapture.attachPageViewTracker).toBe('function');
    expect(typeof autocapture.detachPageViewTracker).toBe('function');
  });
});
