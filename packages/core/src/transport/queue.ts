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


  public enqueue(event: TrackingEvent): void {
    if (this.events.length >= this.config.maxQueueSize) {
      this.events.shift(); 
    }

    this.events.push(event);

    if (this.events.length >= this.config.maxBatchSize) {
      void this.flush();
    }
  }

  
  public async flush(): Promise<void> {
    // Prevent concurrent flushes
    if (this.isFlushing || this.events.length === 0) return;

    this.isFlushing = true;

    let inFlightBatch: TrackingEvent[] | null = null;

    try {
      while (this.events.length > 0) {
        inFlightBatch = this.events.splice(0, this.config.maxBatchSize);
        const result = await sendBatch(inFlightBatch, this.config.senderConfig);

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

  // ── Page unload handling ───────────────────────────────────────────────────

  private handleVisibilityChange(): void {
    if (typeof document === 'undefined') return;

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
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pagehide', this.onPageHide);
  }

  private detachUnloadListeners(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pagehide', this.onPageHide);
  }
}