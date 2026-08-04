import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, { Background, type Edge, type Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPause, IconPlay, IconTrash2 } from '@/components/ui/icons';
import { useAuthStore, useConfigStore } from '@/stores';
import {
  LIVE_FLOW_BUFFER_LIMIT,
  appendBoundedEvent,
  buildLiveFlowWsUrl,
  statusTone,
  type LiveFlowEvent,
  type LiveFlowStatusTone,
  type LiveFlowStreamState,
} from '@/features/liveFlow/liveFlowEvents';
import { connectLiveFlowStream } from '@/features/liveFlow/liveFlowStream';
import styles from './LiveFlowPage.module.scss';

interface ActiveEdge {
  id: string;
  tone: LiveFlowStatusTone;
}

const NODE_IDS = { client: 'client', proxy: 'proxy', upstream: 'upstream' } as const;

const baseNodes: Node[] = [
  { id: NODE_IDS.client, position: { x: 40, y: 90 }, data: { label: 'Client' }, draggable: false },
  {
    id: NODE_IDS.proxy,
    position: { x: 300, y: 90 },
    data: { label: 'CLIProxyAPI' },
    draggable: false,
  },
  { id: NODE_IDS.upstream, position: { x: 560, y: 90 }, data: { label: 'Upstream' }, draggable: false },
];

const baseEdges: Edge[] = [
  { id: 'client-proxy', source: NODE_IDS.client, target: NODE_IDS.proxy },
  { id: 'proxy-upstream', source: NODE_IDS.proxy, target: NODE_IDS.upstream },
];

const TONE_CLASS: Record<LiveFlowStatusTone, string> = {
  success: styles.toneSuccess,
  redirect: styles.toneRedirect,
  'client-error': styles.toneClientError,
  'server-error': styles.toneServerError,
  unknown: styles.toneUnknown,
};

const ACTIVE_EDGE_MS = 900;

const streamStateBadge = (state: LiveFlowStreamState): 'success' | 'warning' | 'error' | 'info' => {
  switch (state) {
    case 'open':
      return 'success';
    case 'error':
      return 'error';
    case 'connecting':
    case 'reconnecting':
      return 'warning';
    default:
      return 'info';
  }
};

export function LiveFlowPage() {
  const { t } = useTranslation();
  const apiBase = useAuthStore((state) => state.apiBase);
  const config = useConfigStore((state) => state.config);

  const [streamState, setStreamState] = useState<LiveFlowStreamState>('idle');
  const [events, setEvents] = useState<LiveFlowEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [activeEdges, setActiveEdges] = useState<ActiveEdge[]>([]);
  const [modelLabel, setModelLabel] = useState<string | null>(null);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const pendingRef = useRef<LiveFlowEvent[]>([]);
  const edgeTimersRef = useRef<number[]>([]);

  const wsAuth = config?.wsAuth === true;
  const apiKeys = config?.apiKeys;

  const flashEdges = useCallback((event: LiveFlowEvent) => {
    const tone = statusTone(event.status);
    const flashId = `${event.id}-${Math.random().toString(36).slice(2, 8)}`;
    setActiveEdges((current) => [
      ...current,
      { id: `client-proxy-${flashId}`, tone },
      { id: `proxy-upstream-${flashId}`, tone },
    ]);
    const timer = window.setTimeout(() => {
      setActiveEdges((current) =>
        current.filter((edge) => !edge.id.endsWith(flashId))
      );
    }, ACTIVE_EDGE_MS);
    edgeTimersRef.current.push(timer);
  }, []);

  useEffect(() => {
    const url = buildLiveFlowWsUrl(apiBase, {
      wsAuth,
      apiKey: Array.isArray(apiKeys) && apiKeys.length > 0 ? String(apiKeys[0]) : undefined,
    });
    if (!url) {
      setStreamState('error');
      return;
    }

    const connection = connectLiveFlowStream(url, {
      onEvent: (event) => {
        if (pausedRef.current) {
          pendingRef.current = appendBoundedEvent(pendingRef.current, event);
          return;
        }
        setEvents((current) => appendBoundedEvent(current, event));
        setModelLabel(event.model ?? null);
        flashEdges(event);
      },
      onStateChange: setStreamState,
    });

    const timers = edgeTimersRef.current;
    return () => {
      connection.close();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [apiBase, wsAuth, apiKeys, flashEdges]);

  const togglePause = useCallback(() => {
    if (pausedRef.current) {
      if (pendingRef.current.length > 0) {
        const pending = pendingRef.current;
        pendingRef.current = [];
        setEvents((current) => {
          let next = current;
          for (let i = pending.length - 1; i >= 0; i -= 1) {
            next = appendBoundedEvent(next, pending[i]);
          }
          return next;
        });
      }
      setPaused(false);
    } else {
      setPaused(true);
    }
  }, []);

  const clearEvents = useCallback(() => {
    pendingRef.current = [];
    setEvents([]);
  }, []);

  const nodes: Node[] = baseNodes.map((node) =>
    node.id === NODE_IDS.upstream && modelLabel
      ? { ...node, data: { label: `Upstream · ${modelLabel}` } }
      : node
  );

  const edges: Edge[] = baseEdges.map((edge) => ({
    ...edge,
    animated: true,
    className: styles.baseEdge,
  }));

  const flashEdgeOverlays: Edge[] = activeEdges.map((flash) => {
    const isRequestLeg = flash.id.startsWith('client-proxy');
    return {
      id: flash.id,
      source: isRequestLeg ? NODE_IDS.client : NODE_IDS.proxy,
      target: isRequestLeg ? NODE_IDS.proxy : NODE_IDS.upstream,
      animated: true,
      className: `${styles.flashEdge} ${TONE_CLASS[flash.tone]}`,
    };
  });

  const configuredOut = streamState === 'error' || streamState === 'closed';
  const showDisabledHint = configuredOut && events.length === 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('live_flow.title', { defaultValue: 'Live Flow' })}</h2>
          <p className="hint">
            {t('live_flow.subtitle', {
              defaultValue: 'Real-time request flow through the gateway (metadata only).',
            })}
          </p>
        </div>
        <div className={styles.controls}>
          <span className={`status-badge ${streamStateBadge(streamState)}`}>
            {t(`live_flow.status.${streamState}`, { defaultValue: streamState })}
          </span>
          <Button variant="secondary" size="sm" onClick={togglePause}>
            {paused ? <IconPlay size={14} /> : <IconPause size={14} />}
            {paused
              ? t('live_flow.resume', { defaultValue: 'Resume' })
              : t('live_flow.pause', { defaultValue: 'Pause' })}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearEvents}>
            <IconTrash2 size={14} />
            {t('live_flow.clear', { defaultValue: 'Clear' })}
          </Button>
        </div>
      </div>

      <Card className={styles.flowCard}>
        <div className={styles.flowCanvas}>
          <ReactFlow
            nodes={nodes}
            edges={[...edges, ...flashEdgeOverlays]}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            zoomOnScroll={false}
            panOnDrag={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} size={1} />
          </ReactFlow>
        </div>
      </Card>

      <Card
        className={styles.eventsCard}
        title={t('live_flow.events_title', { defaultValue: 'Recent requests' })}
        extra={
          <span className="hint">
            {paused
              ? t('live_flow.buffered_while_paused', {
                  defaultValue: 'Paused · {{count}} buffered',
                  count: pendingRef.current.length,
                })
              : t('live_flow.buffer_size', {
                  defaultValue: 'Latest {{count}} events',
                  count: LIVE_FLOW_BUFFER_LIMIT,
                })}
          </span>
        }
      >
        {events.length === 0 ? (
          <EmptyState
            title={
              showDisabledHint
                ? t('live_flow.disabled_title', { defaultValue: 'Live flow unavailable' })
                : t('live_flow.empty_title', { defaultValue: 'Waiting for requests' })
            }
            description={
              showDisabledHint
                ? t('live_flow.disabled_desc', {
                    defaultValue:
                      'Could not connect. Enable "flow-visualization-enabled" in the server config and check that ws-auth credentials are valid.',
                  })
                : t('live_flow.empty_desc', {
                    defaultValue: 'Events appear here as requests pass through the gateway.',
                  })
            }
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('live_flow.col_time', { defaultValue: 'Time' })}</th>
                <th>{t('live_flow.col_method', { defaultValue: 'Method' })}</th>
                <th>{t('live_flow.col_path', { defaultValue: 'Path' })}</th>
                <th>{t('live_flow.col_model', { defaultValue: 'Model' })}</th>
                <th>{t('live_flow.col_status', { defaultValue: 'Status' })}</th>
                <th>{t('live_flow.col_latency', { defaultValue: 'Latency' })}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const tone = statusTone(event.status);
                return (
                  <tr key={event.id}>
                    <td>{new Date(event.ts).toLocaleTimeString()}</td>
                    <td>{event.method}</td>
                    <td className={styles.pathCell} title={event.path}>
                      {event.path}
                    </td>
                    <td>{event.model ?? '—'}</td>
                    <td>
                      <span className={`status-badge ${styles[toneBadge(tone)]}`}>
                        {event.status}
                      </span>
                    </td>
                    <td>{event.latency_ms} ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function toneBadge(tone: LiveFlowStatusTone): string {
  switch (tone) {
    case 'success':
      return 'toneSuccessBadge';
    case 'client-error':
      return 'toneWarningBadge';
    case 'server-error':
      return 'toneErrorBadge';
    default:
      return 'toneNeutralBadge';
  }
}
