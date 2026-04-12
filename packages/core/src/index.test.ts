import { describe, expect, it } from 'vitest';

import analytics from './index';

describe('core public API', () => {
  it('exports the singleton API as the default export', () => {
    expect(typeof analytics.init).toBe('function');
    expect(typeof analytics.track).toBe('function');
    expect(typeof analytics.flush).toBe('function');
    expect(typeof analytics.destroy).toBe('function');
    expect(typeof analytics.optOut).toBe('function');
    expect(typeof analytics.optIn).toBe('function');
    expect(typeof analytics.isOptedOut).toBe('function');
    expect(typeof analytics.giveConsent).toBe('function');
    expect(typeof analytics.withdrawConsent).toBe('function');
  });

  it('exposes runtime constants on the default export', () => {
    expect(analytics.EventTypes.PAGE_VIEW).toBe('page_view');
    expect(analytics.EventTypes.CLICK).toBe('click');
    expect(analytics.EventTypes.CUSTOM).toBe('custom');
    expect(typeof analytics.SDK_VERSION).toBe('string');
  });
});
