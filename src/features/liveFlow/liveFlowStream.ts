/**
 * WebSocket subscriber for the live-flow stream (GET /live-flow/ws).
 *
 * Lightweight by design: one socket, no persistence, no keepalive protocol.
 * Reconnects with exponential backoff until `close()` is called. Malformed
 * frames are dropped by the normalizer instead of tearing down the socket.
 */
import {
  normalizeFlowEvent,
  reconnectDelayMs,
  type LiveFlowEvent,
  type LiveFlowStreamState,
} from './liveFlowEvents';

interface LiveFlowStreamHandlers {
  onEvent: (event: LiveFlowEvent) => void;
  onStateChange?: (state: LiveFlowStreamState) => void;
}

export interface LiveFlowConnection {
  /** Permanently close the stream. Safe to call more than once. */
  close: () => void;
}

export function connectLiveFlowStream(
  url: string,
  handlers: LiveFlowStreamHandlers
): LiveFlowConnection {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let reconnectTimer: number | null = null;

  const setState = (state: LiveFlowStreamState) => {
    handlers.onStateChange?.(state);
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = reconnectDelayMs(attempt);
    attempt += 1;
    setState('reconnecting');
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      open();
    }, delay);
  };

  const open = () => {
    if (closed) return;
    setState('connecting');
    try {
      socket = new WebSocket(url);
    } catch {
      setState('error');
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      attempt = 0;
      setState('open');
    };

    socket.onmessage = (message: MessageEvent) => {
      if (typeof message.data !== 'string') return;
      try {
        const event = normalizeFlowEvent(JSON.parse(message.data));
        if (event) handlers.onEvent(event);
      } catch {
        // Malformed frame - ignore and keep the stream alive.
      }
    };

    socket.onclose = () => {
      socket = null;
      if (closed) {
        setState('closed');
        return;
      }
      scheduleReconnect();
    };

    socket.onerror = () => {
      // The close event follows and drives reconnection.
      setState('error');
    };
  };

  open();

  return {
    close: () => {
      if (closed) return;
      closed = true;
      clearReconnectTimer();
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        try {
          socket.close();
        } catch {
          // Ignore close races; the socket is being discarded anyway.
        }
        socket = null;
      }
      setState('closed');
    },
  };
}
