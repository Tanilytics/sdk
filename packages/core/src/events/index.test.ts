import { describe, expect, it } from 'vitest';

import * as events from './index';

describe('events/index exports', () => {
  it('exports the events public api', () => {
    expect(typeof events.buildEvent).toBe('function');
    expect(typeof events.configureSiteToken).toBe('function');
    expect(typeof events.validateProperties).toBe('function');
    expect(typeof events.EventTypes).toBe('object');
  });
});
