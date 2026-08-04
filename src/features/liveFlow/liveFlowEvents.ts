/**
 * Live Flow (ROADMAP 2.6) - pure, framework-free logic.
 *
 * The backend streams bounded, metadata-only events over GET /live-flow/ws
 * (see CLIProxyAPI/internal/api/flowviz.go). Events never contain prompt
 * bodies, headers, or credentials - only routing metadata.
 */
import { normalizeApiBase } from '@/utils/connection';

/** Bounded per-request metadata event mirrored by the backend flow hub. */
export interface LiveFlowEvent {
  id: string;
  /** Unix milliseconds when the request started. */
  ts: number;
  method: string;
  path: string;
  /** Present only when a handler tags the request; usually absent today. */
  model?: string;
  status: number;
  latency_ms: number;
}

export type LiveFlowStatusTone = 'success' | 'redirect' | 'client-error' | 'server-error' | 'unknown';

export type LiveFlowStreamState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed'
  | 'error';

export const LIVE_FLOW_BUFFER_LIMIT = 200;

/** Trimmed length after appending (drop-oldest eviction). */
export const boundedBufferLength = (length: number, max: number): number =>
  Math.min(length + 1, max);

/**
 * Append one event to a newest-first bounded list, dropping the oldest entries
 * when the buffer exceeds `max`. Returns a new array.
 */
export function appendBoundedEvent(
  list: readonly LiveFlowEvent[],
  event: LiveFlowEvent,
  max: number = LIVE_FLOW_BUFFER_LIMIT
): LiveFlowEvent[] {
  const next = [event, ...list];
  if (next.length > max) {
    next.length = max;
  }
  return next;
}

/** Map an HTTP status code onto a coarse display tone for edges/badges. */
export const statusTone = (status: number): LiveFlowStatusTone => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client-error';
  if (status >= 500) return 'server-error';
  return 'unknown';
};

const toFiniteNumber = (value: unknown): number | null => {
  const num = typeof value === 'string' ? Number(value) : value;
  return typeof num === 'number' && Number.isFinite(num) ? num : null;
};

/**
 * Validate and normalize one raw WS payload. Returns null for malformed
 * frames instead of throwing, so the stream keeps flowing.
 */
export function normalizeFlowEvent(input: unknown): LiveFlowEvent | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  const ts = toFiniteNumber(raw.ts);
  const status = toFiniteNumber(raw.status);
  const latency = toFiniteNumber(raw.latency_ms);
  const method = typeof raw.method === 'string' ? raw.method : '';
  const path = typeof raw.path === 'string' ? raw.path : '';
  if (ts === null || status === null || latency === null || !method || !path) {
    return null;
  }

  const id =
    typeof raw.id === 'string' && raw.id
      ? raw.id
      : `${ts}-${method}-${path}-${Math.round(status)}`;
  const model = typeof raw.model === 'string' && raw.model ? raw.model : undefined;

  return {
    id,
    ts,
    method,
    path,
    ...(model ? { model } : {}),
    status,
    latency_ms: latency,
  };
}

/**
 * Build the WebSocket URL for the live-flow stream.
 *
 * The route is registered at the server root (not under /v0/management), so we
 * start from the normalized API base. Browsers cannot set headers on WebSocket
 * handshakes, so when ws-auth is enabled the first configured API key is passed
 * as the `key` query parameter (accepted by the backend configaccess provider).
 */
export function buildLiveFlowWsUrl(
  apiBase: string,
  options: { wsAuth?: boolean; apiKey?: string } = {}
): string {
  const normalized = normalizeApiBase(apiBase);
  if (!normalized) return '';
  const wsBase = normalized.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
  let url = `${wsBase}/live-flow/ws`;
  if (options.wsAuth && options.apiKey) {
    url += `?key=${encodeURIComponent(options.apiKey)}`;
  }
  return url;
}

/** Exponential reconnect backoff: 1s, doubling, capped (never less than 1s). */
export function reconnectDelayMs(attempt: number, capMs = 15000): number {
  const cappedAttempt = Math.max(0, attempt);
  return Math.min(capMs, 1000 * 2 ** cappedAttempt);
}
