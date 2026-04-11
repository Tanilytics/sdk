import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventProperties } from '../types';
import { validateProperties } from './event-validator';

describe('events/event-validator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns valid with empty sanitised object when properties are undefined', () => {
    const result = validateProperties(undefined, false);

    expect(result).toEqual({ valid: true, sanitised: {}, warnings: [] });
  });

  it('passes through nested property objects unchanged', () => {
    const result = validateProperties(
      {
        goodString: 'ok',
        nested: { deep: true },
        list: [1, 2, 3],
      },
      false,
    );

    expect(result.valid).toBe(true);
    expect(result.sanitised).toEqual({
      goodString: 'ok',
      nested: { deep: true },
      list: [1, 2, 3],
    });
    expect(result.warnings).toEqual([]);
  });

  it('drops non-object properties values', () => {
    const result = validateProperties(
      ['not-an-object'] as unknown as EventProperties,
      false,
    );

    expect(result.valid).toBe(false);
    expect(result.sanitised).toEqual({});
    expect(result.warnings[0]).toContain('Expected an object');
  });

  it('logs warnings only in debug mode', () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    validateProperties(['bad'] as unknown as EventProperties, false);
    expect(warnSpy).not.toHaveBeenCalled();

    validateProperties(['bad'] as unknown as EventProperties, true);
    expect(warnSpy).toHaveBeenCalled();
  });
});
