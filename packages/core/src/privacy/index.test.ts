import { describe, expect, it } from 'vitest';

import * as privacy from './index';

describe('privacy/index exports', () => {
  it('exports the public privacy api', () => {
    expect(typeof privacy.configurePrivacy).toBe('function');
    expect(typeof privacy.isTrackingAllowed).toBe('function');
    expect(typeof privacy.optOut).toBe('function');
    expect(typeof privacy.optIn).toBe('function');
    expect(typeof privacy.isOptedOut).toBe('function');
    expect(typeof privacy.giveConsent).toBe('function');
    expect(typeof privacy.withdrawConsent).toBe('function');
  });
});
