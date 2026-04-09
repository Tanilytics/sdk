import type { IngestionEvent, IngestionPayload } from '../types';
import { buildPayload } from './payload';
import { withRetry } from './retry';

export interface SenderConfig {
  endpoint: string;
  siteToken: string;
  debug: boolean;
}

export interface SendResult {
  ok: boolean;
  retryable: boolean;
  status?: number;
  reason?: string;
}

interface RequestBody {
  headers: Record<string, string>;
  body: string | ArrayBuffer;
}

export async function sendBatch(
  events: IngestionEvent[],
  config: SenderConfig,
  visitorId: string
): Promise<SendResult> {
  const result = await withRetry(() => attemptSend(events, config, visitorId), {
    maxAttempts: 3,
    baseDelayMs: 1000,
  });

  if (result.success) {
    if (config.debug) {
      console.info(
        `[AnalyticsSDK] Sent ${events.length} event(s) successfully.`
      );
    }
    return { ok: true, retryable: false };
  }

  if (config.debug) {
    console.warn(
      `[AnalyticsSDK] Failed to send ${events.length} event(s) after ` +
        `${result.attempts} attempt(s). ${result.finalError ?? ''}`
    );
  }

  return result.value ?? { ok: false, retryable: true };
}

async function attemptSend(
  events: IngestionEvent[],
  config: SenderConfig,
  visitorId: string
): Promise<SendResult> {
  let response: Response;

  try {
    const payload = buildPayload(events, visitorId, config.siteToken);
    const requestBody = await buildRequestBody(payload);

    response = await fetch(config.endpoint, {
      method: 'POST',
      headers: requestBody.headers,
      body: requestBody.body,
      // keepalive allows the request to outlive the page
      // Important for events sent just before navigation
      keepalive: true,
    });
  } catch (err) {
    return {
      ok: false,
      retryable: true,
      reason: `Network error: ${
        err instanceof Error ? err.message : 'unknown'
      }`,
    };
  }

  return classifyResponse(response);
}

async function buildRequestBody(
  payload: IngestionPayload
): Promise<RequestBody> {
  const json = JSON.stringify(payload);
  const compressedBody = await gzipJson(json);

  if (compressedBody === null) {
    return {
      headers: {
        'Content-Type': 'application/json',
      },
      body: json,
    };
  }

  return {
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
    },
    body: compressedBody,
  };
}

async function gzipJson(value: string): Promise<ArrayBuffer | null> {
  if (typeof CompressionStream !== 'function') {
    return null;
  }

  try {
    const compressedStream = new Blob([value])
      .stream()
      .pipeThrough(new CompressionStream('gzip'));

    return await new Response(compressedStream).arrayBuffer();
  } catch {
    return null;
  }
}

function classifyResponse(response: Response): SendResult {
  const status = response.status;

  // ── Success ────────────────────────────────────────────────────────────────
  if (status >= 200 && status < 300) {
    return { ok: true, retryable: false, status };
  }

  // ── Rate limited ───────────────────────────────────────────────────────────
  if (status === 429) {
    return {
      ok: false,
      retryable: true,
      status,
      reason: 'Rate limited (429)',
    };
  }

  // ── Permanent client errors ────────────────────────────────────────────────
  // 4xx means WE sent something wrong — retrying will produce the same error
  if (status >= 400 && status < 500) {
    return {
      ok: false,
      retryable: false,
      status,
      reason: `Client error (${status}) — check site token and event schema`,
    };
  }

  // ── Transient server errors ────────────────────────────────────────────────
  // 5xx means the SERVER has a problem — retrying after a delay may succeed
  if (status >= 500) {
    return {
      ok: false,
      retryable: true,
      status,
      reason: `Server error (${status})`,
    };
  }

  return {
    ok: false,
    retryable: false,
    status,
    reason: `Unexpected status (${status})`,
  };
}
