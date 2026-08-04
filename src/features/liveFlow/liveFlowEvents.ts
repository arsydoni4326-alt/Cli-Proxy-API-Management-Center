/**
 * Live Flow (ROADMAP 2.6) - pure, framework-free logic.
 *
 * The backend streams bounded, metadata-only events over GET /live-flow/ws
 * (see CLIProxyAPI/internal/api/flowviz.go). Events never contain prompt
 * bodies, headers, or credentials - only routing metadata.
 */
import { normalizeApiBase } from '@/utils/connection';

/** Bounded per-request metadata event mirrored by the backend flow hub.
 * `model` is populated by the server middleware when the request body declares
 * one (see sniffFlowModel in flowviz.go). */
export interface LiveFlowEvent {
  id: string;
  /** Unix milliseconds when the request started. */
  ts: number;
  method: string;
  path: string;
  /** Model requested by the client, when the request body declares one. */
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

/* ------------------------------------------------------------------ */
/* Topology canvas: CPA-centric ring of model nodes. Pure helpers so   */
/* layout and grouping stay unit-testable without reactflow or DOM.    */
/* ------------------------------------------------------------------ */

/** Hard cap on model nodes rendered in the canvas. Excess collapse into
 * a single synthetic "others" node so the layout stays light. */
export const LIVE_FLOW_MAX_MODEL_NODES = 24;

/** Sentinel id for the aggregate node receiving pulses for capped models. */
export const LIVE_FLOW_OTHERS_NODE_ID = '__others__';

/** One model node in the persistent topology. */
export interface FlowModelNodeDescriptor {
  /** Stable node id (equals the model name, or the others sentinel). */
  id: string;
  /** Short display label. */
  label: string;
  /** Deterministic position on the ring around the CLIProxyAPI node. */
  position: { x: number; y: number };
}

/**
 * Insert a model name into a bounded, insertion-ordered set. Existing entries
 * are kept in place so node positions stay stable frame to frame. Returns the
 * same reference when the model already exists or is empty, so callers can
 * skip re-renders.
 */
export function registerModelName(
  models: readonly string[],
  modelName: string | undefined
): readonly string[] {
  const name = (modelName ?? '').trim();
  if (!name) return models;
  if (models.includes(name)) return models;
  return [...models, name];
}

/**
 * Compute the visible model set: the first `max` inserted models are shown as
 * individual nodes; anything beyond collapses into the "others" node.
 * Returns the ordered node list plus a lookup that maps any observed model
 * name onto the node id that should receive its traffic pulse.
 */
export function buildTopology(
  models: readonly string[],
  max: number = LIVE_FLOW_MAX_MODEL_NODES
): { nodes: FlowModelNodeDescriptor[]; route: (model: string | undefined) => string } {
  const visible = models.slice(0, max);
  const overflow = models.length > visible.length;
  const total = visible.length + (overflow ? 1 : 0);

  // Ring layout around a canvas centered at (0,0). Radius grows a touch with
  // node count so labels don't crowd the center node.
  const radius = Math.max(220, Math.min(420, 140 + total * 14));
  const nodes: FlowModelNodeDescriptor[] = [];
  for (let i = 0; i < total; i += 1) {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2; // start at the top
    const isOthers = overflow && i === total - 1;
    nodes.push({
      id: isOthers ? LIVE_FLOW_OTHERS_NODE_ID : visible[i]!,
      label: isOthers ? `+${models.length - visible.length} more` : visible[i]!,
      position: {
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius * 0.72), // oval for wide canvases
      },
    });
  }

  const visibleSet = new Set(visible);
  const route = (model: string | undefined): string => {
    if (model && visibleSet.has(model)) return model;
    if (model && !visibleSet.has(model) && overflow) return LIVE_FLOW_OTHERS_NODE_ID;
    // Unknown/absent model: pulse to the others node when it exists, else no
    // destination (caller renders a short self-loop / skips the edge).
    return overflow ? LIVE_FLOW_OTHERS_NODE_ID : '';
  };

  return { nodes, route };
}
