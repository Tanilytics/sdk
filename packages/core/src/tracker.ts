import type {
  InternalEventType,
  EventProperties,
  MediaAdapterApi,
  MediaAdapterInterface,
  MediaEventType,
} from './types';
import type { TanilyticsConfig, ResolvedConfig } from './config/types';
import { validateAndMergeConfig } from './config';
import { configurePrivacy, isTrackingAllowed } from './privacy';
import { SessionManager } from './session';
import {
  buildCustomEvent,
  buildInternalEvent,
  configureSiteToken,
} from './events';
import { validateProperties } from './events/event-validator';
import { EventQueue } from './transport';
import type { QueueConfig } from './transport/queue';
import {
  attachClickTracker,
  attachFormTracker,
  attachPageViewTracker,
  attachScrollDepthTracker,
  attachTimeOnPageTracker,
  detachClickTracker,
  detachFormTracker,
  detachPageViewTracker,
  detachScrollDepthTracker,
  detachTimeOnPageTracker,
  resetScrollDepth,
  resetTimeOnPage,
} from './autocapture';
import { EventTypes } from './events/event-types';
import { VERSION } from './version';

// Module-level singleton
//
// The SDK is designed to be initialised once per page.
// The singleton is stored here at the module level — not on window —
// so it is scoped to the SDK's own module closure and cannot be
// tampered with by external code.

let _instance: TanilyticsTracker | null = null;

// Public module-level functions
//
// These are what consumers import and call.
// They are thin wrappers around the singleton instance.

/**
 * Initialises the analytics SDK.
 * Call this once at application startup.
 *
 * @example
 * import tanilytics from 'tanilytics'
 * tanilytics.init({ siteToken: 'sk_live_abc123' })
 */
export function init(config: TanilyticsConfig): TanilyticsTracker {
  if (_instance !== null) {
    console.warn(
      '[Tanilytics] init() was called more than once. ' +
        'The second call has been ignored. ' +
        'If you need to re-initialise, call destroy() first.',
    );
    return _instance;
  }

  _instance = new TanilyticsTracker(config);
  return _instance;
}

/**
 * Fires a custom tracking event manually.
 *
 * @example
 * import tanilytics from 'tanilytics'
 * tanilytics.track('audio_downloaded', { format: 'mp3' })
 */
export function track(eventName: string, properties?: EventProperties): void {
  if (_instance === null) {
    console.warn(
      '[Tanilytics] track() was called before init(). ' +
        'The event has been dropped. ' +
        'Ensure init() is called at application startup.',
    );
    return;
  }
  _instance.track(eventName, properties);
}

/**
 * Opt the current user out of all tracking.
 * Persists across page reloads.
 * Safe to call before init().
 */
export {
  optOut,
  optIn,
  isOptedOut,
  giveConsent,
  withdrawConsent,
} from './privacy';

/**
 * Flush all queued events immediately.
 * Useful before programmatic navigation or logout.
 */
export async function flush(): Promise<void> {
  if (_instance === null) return;
  await _instance.flush();
}

/**
 * Tear down the SDK — stops all timers, removes all listeners,
 * flushes remaining events, and resets the singleton.
 * Call this before re-initialising with different config.
 */
export function destroy(): void {
  if (_instance === null) return;
  _instance.destroy();
  _instance = null;
}

// TanilyticsTracker class
//
// The orchestrator. Creates and wires all modules together.
// Consumers never interact with this class directly — they use the
// module-level functions above.

export class TanilyticsTracker {
  private readonly config: ResolvedConfig;
  private readonly session: SessionManager;
  private readonly queue: EventQueue;
  private readonly adapters: readonly MediaAdapterInterface[];
  private isDestroyed = false;

  constructor(userConfig: TanilyticsConfig) {
    // Step 1: Validate and resolve config
    // This is the first thing that runs.
    // If config is invalid, the constructor throws immediately
    // and nothing else is initialised.
    this.config = validateAndMergeConfig(userConfig);
    this.adapters = [...(userConfig.adapters ?? [])];

    // Step 2: Configure privacy
    // Must happen before any event is built or sent.
    // Copies requireConsent and respectDoNotTrack from config
    // into the privacy module's own state.
    configurePrivacy({
      requireConsent: this.config.requireConsent,
      respectDoNotTrack: this.config.respectDoNotTrack,
    });

    // Step 3: Inject site token into event builder
    // The event builder stamps this onto every event.
    // Done here so buildEvent() does not need the token as an argument.
    configureSiteToken(this.config.siteToken);

    // Step 4: Initialise session manager
    // Loads existing session from sessionStorage or creates a fresh one.
    this.session = new SessionManager();

    // Step 5: Initialise event queue
    // Wires the flush callback to the transport sender.
    // Starts the flush timer and attaches unload listeners.
    const queueConfig: QueueConfig = {
      maxBatchSize: this.config.maxBatchSize,
      maxQueueSize: this.config.maxQueueSize,
      flushInterval: this.config.flushInterval,
      senderConfig: {
        endpoint: this.config.endpoint,
        siteToken: this.config.siteToken,
        compress: this.config.compress,
        debug: this.config.debug,
      },
    };
    this.queue = new EventQueue(queueConfig);

    // Step 6: Start autocapture
    // Must happen LAST — all modules must be ready before autocapture
    // starts firing events into them.
    const { pageViews, clicks, formSubmissions, scrollDepth, timeOnPage } =
      this.config.autocapture;

    // Fire the initial page view first
    if (pageViews) {
      this.trackInternal(EventTypes.PAGE_VIEW, { navigationType: 'load' });
    }

    // Then attach the SPA navigation listener for subsequent page views
    const mediaAdapterApi: MediaAdapterApi = {
      trackMedia: (eventType, properties) =>
        this.trackMedia(eventType, properties),
    };

    try {
      if (pageViews) {
        attachPageViewTracker({
          track: (eventType, properties) => {
            this.trackInternal(eventType as InternalEventType, properties);

            // Reset per-page autocapture state after SPA page view events.
            if (eventType === EventTypes.PAGE_VIEW) {
              if (scrollDepth) {
                resetScrollDepth();
              }
              if (timeOnPage) {
                resetTimeOnPage();
              }
            }
          },
          config: this.config,
        });
      }

      if (clicks) {
        attachClickTracker({
          track: (eventType, properties) =>
            this.trackInternal(eventType as InternalEventType, properties),
        });
      }

      if (formSubmissions) {
        attachFormTracker({
          track: (eventType, properties) =>
            this.trackInternal(eventType as InternalEventType, properties),
        });
      }

      if (scrollDepth) {
        attachScrollDepthTracker({
          track: (eventType, properties) =>
            this.trackInternal(eventType as InternalEventType, properties),
        });
      }

      if (timeOnPage) {
        attachTimeOnPageTracker({
          track: (eventType, properties) =>
            this.trackInternal(eventType as InternalEventType, properties),
        });
      }

      for (const adapter of this.adapters) {
        try {
          adapter.attach(mediaAdapterApi);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown adapter error.';

          throw new Error(
            `[Tanilytics] Failed to attach media adapter "${adapter.name}". ${message}`,
            { cause: error },
          );
        }
      }
    } catch (error) {
      this.destroy();
      throw error;
    }

    if (this.config.debug) {
      console.info(`[Tanilytics] Initialised v${VERSION}`, {
        siteToken: this.config.siteToken.slice(0, 8) + '...',
        endpoint: this.config.endpoint,
        sessionId: this.session.getSnapshot().sessionId,
        autocapture: {
          pageViews,
          clicks,
          formSubmissions,
          scrollDepth,
          timeOnPage,
        },
        adapters: this.adapters.map((adapter) => adapter.name),
      });
    }
  }

  // Public methods

  /**
   * The core operation — fire a custom tracking event.
   *
   * Sequence:
   * 1. Guard — SDK not destroyed
   * 2. Privacy check — is tracking allowed?
   * 3. Validate and sanitise properties
   * 4. Get session ID (updates lastActivityAt)
   * 5. Build the complete event object
   * 6. Enqueue for sending
   */
  public track(eventName: string, properties?: EventProperties): void {
    const sanitisedEventName = validateCustomEventName(eventName);

    this.enqueueEvent(
      buildCustomEvent,
      sanitisedEventName,
      sanitisedEventName,
      properties,
    );
  }

  public trackInternal(
    eventType: InternalEventType,
    properties?: EventProperties,
  ): void {
    this.enqueueEvent(buildInternalEvent, eventType, eventType, properties);
  }

  private trackMedia(
    eventType: MediaEventType,
    properties?: EventProperties,
  ): void {
    this.trackInternal(eventType, properties);
  }

  private enqueueEvent<TName extends string>(
    build: (
      name: TName,
      properties?: EventProperties,
    ) => ReturnType<typeof buildInternalEvent>,
    logLabel: string,
    name: TName,
    properties?: EventProperties,
  ): void {
    // Guard — do nothing if destroyed
    if (this.isDestroyed) {
      if (this.config.debug) {
        console.warn(
          '[Tanilytics] track() called after destroy() — event dropped.',
        );
      }
      return;
    }

    // Privacy gate — checked on every single event
    if (!isTrackingAllowed()) {
      if (this.config.debug) {
        console.info(
          `[Tanilytics] Event "${logLabel}" blocked by privacy settings.`,
        );
      }
      return;
    }

    // Validate and sanitise properties
    // Invalid properties are stripped, not dropped — event still fires
    const { sanitised } = validateProperties(properties, this.config.debug);

    // Get session ID — also updates lastActivityAt
    const sessionId = this.session.getSessionId();

    // Build the complete event
    const event = build(
      name,
      Object.keys(sanitised).length > 0 ? sanitised : undefined,
    );

    if (this.config.debug) {
      console.info('[Tanilytics] Queuing event:', event);
    }

    // Enqueue — the queue handles batching, timing, and sending
    this.queue.enqueue(event, sessionId);
  }

  /**
   * Flush all queued events immediately.
   * Awaitable — resolves when the flush completes.
   */
  public async flush(): Promise<void> {
    return this.queue.flush();
  }

  /**
   * Tear down the SDK cleanly.
   * Flushes remaining events, stops timers, removes listeners.
   */
  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Remove SPA navigation listeners and restore original history functions
    detachPageViewTracker();
    detachClickTracker();
    detachFormTracker();
    detachScrollDepthTracker();
    detachTimeOnPageTracker();

    for (const adapter of this.adapters) {
      try {
        adapter.detach();
      } catch (error) {
        if (this.config.debug) {
          console.warn(
            `[Tanilytics] Failed to detach media adapter "${adapter.name}".`,
            error,
          );
        }
      }
    }

    // Stop flush timer, remove unload listeners, flush remaining events
    this.queue.destroy();

    if (this.config.debug) {
      console.info('[Tanilytics] Destroyed.');
    }
  }
}

function validateCustomEventName(eventName: string): string {
  if (typeof eventName !== 'string') {
    throw new TypeError('[Tanilytics] track() event name must be a string.');
  }

  const trimmedEventName = eventName.trim();

  if (trimmedEventName.length === 0) {
    throw new Error('[Tanilytics] track() event name cannot be empty.');
  }

  if (trimmedEventName.length > 100) {
    throw new Error(
      `[Tanilytics] track() event name is too long. Received ${trimmedEventName.length} characters; maximum is 100.`,
    );
  }

  return trimmedEventName;
}
