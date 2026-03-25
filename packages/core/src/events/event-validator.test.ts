import { afterEach, describe, expect, it, vi } from 'vitest';

import { validateProperties } from './event-validator';

describe('events/event-validator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns valid with empty sanitised object when properties are undefined', () => {
    const result = validateProperties(undefined, false);

    expect(result).toEqual({ valid: true, sanitised: {}, warnings: [] });
  });

  it('drops reserved keys and invalid value types', () => {
    const result = validateProperties(
      {
        eventType: 'custom',
        goodString: 'ok',
        badObject: { nested: true } as unknown as string,
        badArray: [] as unknown as string,
        badFunction: (() => 'nope') as unknown as string,
      },
      false,
    );

    expect(result.valid).toBe(false);
    expect(result.sanitised).toEqual({ goodString: 'ok' });
    expect(result.warnings.some((w) => w.includes('reserved'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('invalid value type'))).toBe(true);
  });

  it('truncates long strings to max length', () => {
    const long = 'a'.repeat(700);
    const result = validateProperties({ bio: long }, false);

    expect(result.valid).toBe(false);
    expect(result.sanitised.bio).toBe('a'.repeat(500));
    expect(result.warnings.some((w) => w.includes('truncated to 500'))).toBe(true);
  });

  it('keeps only first 20 properties', () => {
    const props: Record<string, string> = {};
    for (let i = 0; i < 25; i++) {
      props[`k${i}`] = `v${i}`;
    }

    const result = validateProperties(props, false);

    expect(Object.keys(result.sanitised)).toHaveLength(20);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes('maximum is 20'))).toBe(true);
  });

  it('logs warnings only in debug mode', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    validateProperties({ eventId: 'reserved-key' }, false);
    expect(warnSpy).not.toHaveBeenCalled();

    validateProperties({ eventId: 'reserved-key' }, true);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('remains valid when all values are allowed primitives', () => {
    const result = validateProperties(
      {
        plan: 'pro',
        seats: 12,
        active: true,
        notes: null,
      },
      false,
    );

    expect(result).toEqual({
      valid: true,
      sanitised: {
        plan: 'pro',
        seats: 12,
        active: true,
        notes: null,
      },
      warnings: [],
    });
  });
});
