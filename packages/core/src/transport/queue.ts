import type { IngestionEvent } from '../types';
import { sendBatch } from './sender';
import { sendBeacon } from './beacon';
import type { SenderConfig } from './sender';

export interface QueueConfig {
  maxBatchSize: number;
  maxQueueSize: number;
  flushInterval: number;
  senderConfig: SenderConfig;
}

interface QueuedEvent {
  visitorId: string;
  event: IngestionEvent;
}

export class EventQueue {
  private events: QueuedEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private readonly config: QueueConfig;

  // Bound references — needed to remove the same listener we added
  private readonly onVisibilityChange: () => void;
  private readonly onPageHide: () => void;

  constructor(config: QueueConfig) {
    this.config = config;
    this.onVisibilityChange = this.handleVisibilityChange.bind(this);
    this.onPageHide = this.handlePageHide.bind(this);

    this.startTimer();
    this.attachUnloadListeners();
  }

  public enqueue(event: IngestionEvent, visitorId: string): void {
    if (this.events.length >= this.config.maxQueueSize) {
      this.events.shift();
    }

    this.events.push({ visitorId, event });

    if (this.events.length >= this.config.maxBatchSize) {
      void this.flush();
    }
  }

  public async flush(): Promise<void> {
    // Prevent concurrent flushes
    if (this.isFlushing || this.events.length === 0) return;

    this.isFlushing = true;

    let inFlightBatch: QueuedEvent[] | null = null;

    try {
      while (this.events.length > 0) {
        inFlightBatch = this.takeNextBatch();
        const result = await sendBatch(
          inFlightBatch.map((entry) => entry.event),
          this.config.senderConfig,
          inFlightBatch[0].visitorId,
        );

        if (!result.ok) {
          this.events.unshift(...inFlightBatch);
          break;
        }

        inFlightBatch = null;
      }
    } catch {
      if (inFlightBatch !== null) {
        this.events.unshift(...inFlightBatch);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  public destroy(): void {
    this.stopTimer();
    this.detachUnloadListeners();
    void this.flush();
  }

  public get size(): number {
    return this.events.length;
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      void this.flush();
    }, this.config.flushInterval);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Page unload handling

  private handleVisibilityChange(): void {
    if (globalThis.document === undefined) return;

    // Fire when tab becomes hidden — user switched tabs or minimised
    if (document.visibilityState === 'hidden') {
      this.flushViaBeacon();
    }
  }

  private handlePageHide(): void {
    // pagehide covers cases visibilitychange misses:
    // browser close, tab close, navigation away
    this.flushViaBeacon();
  }

  private flushViaBeacon(): void {
    if (this.events.length === 0) return;

    const inFlightBatch = this.takeNextBatch();

    const result = sendBeacon(
      inFlightBatch.map((entry) => entry.event),
      this.config.senderConfig.endpoint,
      this.config.senderConfig.siteToken,
      inFlightBatch[0].visitorId,
    );

    if (result.sent) {
      // Beacon accepted — clear the queue
      // We will never know if it actually delivered but the browser
      // guarantees it will try
      this.events = [];
    }
    // If beacon failed, events stay in queue — they will be sent
    // if the user comes back to the tab (visibilitychange visible)
  }

  private attachUnloadListeners(): void {
    if (
      globalThis.document === undefined ||
      globalThis.window === undefined
    ) {
      return;
    }

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    globalThis.window.addEventListener('pagehide', this.onPageHide);
  }

  private detachUnloadListeners(): void {
    if (
      globalThis.document === undefined ||
      globalThis.window === undefined
    ) {
      return;
    }

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    globalThis.window.removeEventListener('pagehide', this.onPageHide);
  }

  private takeNextBatch(): QueuedEvent[] {
    const batch: QueuedEvent[] = [];
    const firstVisitorId = this.events[0]?.visitorId;

    if (firstVisitorId === undefined) {
      return batch;
    }

    while (
      batch.length < this.config.maxBatchSize &&
      this.events.length > 0 &&
      this.events[0].visitorId === firstVisitorId
    ) {
      const next = this.events.shift();
      if (next === undefined) break;
      batch.push(next);
    }

    return batch;
  }
}
