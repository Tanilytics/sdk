import type { TrackingEvent } from '../types';
import { sendBatch } from './sender';
import { sendBeacon } from './beacon';
import type { SenderConfig } from './sender';


export interface QueueConfig {
  maxBatchSize: number;
  maxQueueSize: number;
  flushInterval: number;
  senderConfig: SenderConfig;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * EventQueue holds events in memory and flushes them in batches.
 *
 * Flush triggers (in order of priority):
 * 1. Page unload  → sendBeacon (fire and forget)
 * 2. Batch full   → immediate flush via sender
 * 3. Timer        → scheduled flush every flushInterval ms
 */
export class EventQueue {
  private events: TrackingEvent[] = [];
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

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Add an event to the queue.
   * Triggers an immediate flush if the batch size is reached.
   */
  public enqueue(event: TrackingEvent): void {
    // Enforce max queue size — drop oldest event to make room
    if (this.events.length >= this.config.maxQueueSize) {
      this.events.shift(); // remove oldest
    }

    this.events.push(event);

    // Flush immediately if we have a full batch
    if (this.events.length >= this.config.maxBatchSize) {
      void this.flush();
    }
  }

  /**
   * Flush all queued events immediately.
   * Safe to call at any time — concurrent calls are protected by isFlushing.
   */
  public async flush(): Promise<void> {
    // Prevent concurrent flushes
    if (this.isFlushing || this.events.length === 0) return;

    this.isFlushing = true;

    // Take a snapshot and clear the queue BEFORE the async send
    // New events arriving during the send go into a fresh queue
    // If send fails, we re-queue the snapshot — no events are lost
    const batch = this.events.splice(0, this.config.maxBatchSize);

    try {
      const result = await sendBatch(batch, this.config.senderConfig);

      if (!result.ok) {
        // Send failed after all retries — put events back at the front
        this.events.unshift(...batch);
      }
    } catch {
      // Unexpected error — re-queue to try again next cycle
      this.events.unshift(...batch);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Flush remaining events and shut down all timers and listeners.
   * Call this when the SDK is destroyed.
   */
  public destroy(): void {
    this.stopTimer();
    this.detachUnloadListeners();
    // Final flush attempt — may not complete if called during shutdown
    void this.flush();
    this.events = [];
  }

  /** How many events are currently queued */
  public get size(): number {
    return this.events.length;
  }

  // ── Timer management ───────────────────────────────────────────────────────

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

  // ── Page unload handling ───────────────────────────────────────────────────

  private handleVisibilityChange(): void {
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

    const result = sendBeacon(
      this.events,
      this.config.senderConfig.endpoint,
      this.config.senderConfig.siteToken,
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
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pagehide', this.onPageHide);
  }

  private detachUnloadListeners(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pagehide', this.onPageHide);
  }
}