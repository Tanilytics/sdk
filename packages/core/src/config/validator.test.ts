import { describe, expect, it } from 'vitest';

import type { AnalyticsConfig } from './types';
import { validate } from './validator';

function makeValidConfig(
  overrides: Partial<AnalyticsConfig> = {},
): AnalyticsConfig {
  return {
    siteToken: 'sk_live_abc12345',
    ...overrides,
  };
}

describe('validate', () => {
  describe('siteToken', () => {
    it('throws when siteToken is missing', () => {
      expect(() => validate({} as AnalyticsConfig)).toThrow(
        /siteToken is required/,
      );
    });

    it('throws when siteToken is too short after trim', () => {
      expect(() =>
        validate(makeValidConfig({ siteToken: '  short ' })),
      ).toThrow(/too short/);
    });

    it('accepts siteToken when trimmed length is valid', () => {
      expect(() =>
        validate(makeValidConfig({ siteToken: ' 12345678 ' })),
      ).not.toThrow();
    });
  });

  describe('endpoint', () => {
    it('throws for malformed endpoint URL', () => {
      expect(() =>
        validate(makeValidConfig({ endpoint: 'not-a-url' })),
      ).toThrow(/not a valid URL/);
    });

    it('throws for non-https endpoint outside localhost', () => {
      expect(() =>
        validate(makeValidConfig({ endpoint: 'http://example.com/ingest' })),
      ).toThrow(/must use HTTPS/);
    });

    it('accepts localhost development endpoints over http', () => {
      expect(() =>
        validate(makeValidConfig({ endpoint: 'http://localhost:3000/ingest' })),
      ).not.toThrow();
      expect(() =>
        validate(makeValidConfig({ endpoint: 'http://127.0.0.1:3000/ingest' })),
      ).not.toThrow();
      expect(() =>
        validate(makeValidConfig({ endpoint: 'http://ingest.local/events' })),
      ).not.toThrow();
    });
  });

  describe('numeric bounds', () => {
    it('enforces flushInterval minimum and integer requirement', () => {
      expect(() => validate(makeValidConfig({ flushInterval: 499 }))).toThrow(
        /flushInterval/,
      );
      expect(() => validate(makeValidConfig({ flushInterval: 500.5 }))).toThrow(
        /flushInterval/,
      );
      expect(() =>
        validate(makeValidConfig({ flushInterval: 500 })),
      ).not.toThrow();
    });

    it('enforces maxBatchSize bounds', () => {
      expect(() => validate(makeValidConfig({ maxBatchSize: 0 }))).toThrow(
        /maxBatchSize/,
      );
      expect(() => validate(makeValidConfig({ maxBatchSize: 201 }))).toThrow(
        /maxBatchSize/,
      );
      expect(() =>
        validate(makeValidConfig({ maxBatchSize: 1 })),
      ).not.toThrow();
      expect(() =>
        validate(makeValidConfig({ maxBatchSize: 200 })),
      ).not.toThrow();
    });

    it('enforces maxQueueSize bounds', () => {
      expect(() => validate(makeValidConfig({ maxQueueSize: 0 }))).toThrow(
        /maxQueueSize/,
      );
      expect(() => validate(makeValidConfig({ maxQueueSize: 10001 }))).toThrow(
        /maxQueueSize/,
      );
      expect(() =>
        validate(makeValidConfig({ maxQueueSize: 1 })),
      ).not.toThrow();
      expect(() =>
        validate(makeValidConfig({ maxQueueSize: 10000 })),
      ).not.toThrow();
    });
  });

  describe('boolean and object fields', () => {
    it('throws when debug is not boolean', () => {
      expect(() =>
        validate(makeValidConfig({ debug: 'true' as unknown as boolean })),
      ).toThrow(/debug must be a boolean/);
    });

    it('throws when requireConsent is not boolean', () => {
      expect(() =>
        validate(makeValidConfig({ requireConsent: 1 as unknown as boolean })),
      ).toThrow(/requireConsent must be a boolean/);
    });

    it('throws when respectDoNotTrack is not boolean', () => {
      expect(() =>
        validate(
          makeValidConfig({ respectDoNotTrack: 'yes' as unknown as boolean }),
        ),
      ).toThrow(/respectDoNotTrack must be a boolean/);
    });

    it('throws when autocapture is null', () => {
      expect(() =>
        validate(
          makeValidConfig({
            autocapture: null as unknown as AnalyticsConfig['autocapture'],
          }),
        ),
      ).toThrow(/autocapture must be a boolean or an object/);
    });

    it('accepts autocapture as a boolean', () => {
      expect(() =>
        validate(makeValidConfig({ autocapture: true })),
      ).not.toThrow();

      expect(() =>
        validate(makeValidConfig({ autocapture: false })),
      ).not.toThrow();
    });

    it('throws when an autocapture field is not boolean', () => {
      expect(() =>
        validate(
          makeValidConfig({
            autocapture: { pageViews: 'yes' as unknown as boolean },
          }),
        ),
      ).toThrow(/autocapture\.pageViews must be a boolean/);
    });
  });
});
