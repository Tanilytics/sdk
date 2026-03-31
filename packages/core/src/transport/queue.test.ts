import type { TrackingEvent } from '../types';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./sender', () => ({
  sendBatch: vi.fn(),
}));

vi.mock('./beacon', () => ({
  sendBeacon: vi.fn(() => ({ sent: false })),
}));

import { EventQueue } from './queue';
import { sendBatch } from './sender';

function makeEvent(id: string): TrackingEvent {
  return {
    eventId: id,
    siteToken: 'site_token',
    eventType: 'custom',
    clientTimestamp: Date.now(),
    url: 'https://example.com',
    referrer: '',
    sessionId: 'session_1',
    deviceType: 'desktop',
    screenWidth: 1920,
    viewportWidth: 1200,
    language: 'en-US',
    sdkVersion: '0.0.0-test',
  };
}

describe('EventQueue', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('flush drains all queued events in sequential batches', async () => {
    let resolveFirstSend:
      | ((value: { ok: boolean; retryable: boolean }) => void)
      | undefined;

    const mockSendBatch = vi.mocked(sendBatch);
    mockSendBatch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstSend = resolve;
          })
      )
      .mockResolvedValue({ ok: true, retryable: false });

    const queue = new EventQueue({
      maxBatchSize: 2,
      maxQueueSize: 10,
      flushInterval: 60_000,
      senderConfig: {
        endpoint: 'https://api.example.com/ingest',
        siteToken: 'site_token',
        debug: false,
      },
    });

    queue.enqueue(makeEvent('1'));
    queue.enqueue(makeEvent('2'));
    queue.enqueue(makeEvent('3'));
    queue.enqueue(makeEvent('4'));
    queue.enqueue(makeEvent('5'));

    resolveFirstSend?.({ ok: true, retryable: false });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSendBatch).toHaveBeenCalledTimes(3);
    expect(queue.size).toBe(0);

    queue.destroy();
  });

  it('destroy does not clear events queued while another flush is in progress', async () => {
    let resolveFirstSend:
      | ((value: { ok: boolean; retryable: boolean }) => void)
      | undefined;

    const mockSendBatch = vi.mocked(sendBatch);
    mockSendBatch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstSend = resolve;
        })
    );

    const queue = new EventQueue({
      maxBatchSize: 1,
      maxQueueSize: 10,
      flushInterval: 60_000,
      senderConfig: {
        endpoint: 'https://api.example.com/ingest',
        siteToken: 'site_token',
        debug: false,
      },
    });

    queue.enqueue(makeEvent('in-flight'));

    // Let the first flush start, then queue an additional event that
    // should not be wiped by destroy().
    await Promise.resolve();
    queue.enqueue(makeEvent('queued-during-flush'));

    queue.destroy();

    expect(queue.size).toBe(1);

    resolveFirstSend?.({ ok: true, retryable: false });
    await Promise.resolve();
  });
});
