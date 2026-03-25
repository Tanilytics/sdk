import { describe, expect, it } from 'vitest';

import * as session from './index';

describe('session/index exports', () => {
  it('exports SessionManager', () => {
    expect(typeof session.SessionManager).toBe('function');
  });
});
