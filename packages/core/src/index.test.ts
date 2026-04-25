import { describe, expect, it } from 'vitest';

import tanilytics from './index';

describe('core public API', () => {
  it('exports the singleton API as the default export', () => {
    expect(typeof tanilytics.init).toBe('function');
    expect(typeof tanilytics.track).toBe('function');
    expect(typeof tanilytics.flush).toBe('function');
    expect(typeof tanilytics.destroy).toBe('function');
    expect(typeof tanilytics.optOut).toBe('function');
    expect(typeof tanilytics.optIn).toBe('function');
    expect(typeof tanilytics.isOptedOut).toBe('function');
    expect(typeof tanilytics.giveConsent).toBe('function');
    expect(typeof tanilytics.withdrawConsent).toBe('function');
  });

  it('exposes runtime constants on the default export', () => {
    expect(tanilytics.EventTypes.PAGE_VIEW).toBe('page_view');
    expect(tanilytics.EventTypes.CLICK).toBe('click');
    expect(tanilytics.EventTypes.CUSTOM).toBe('custom');
    expect(typeof tanilytics.VERSION).toBe('string');
  });
});
