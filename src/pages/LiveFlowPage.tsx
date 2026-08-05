import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  LIVE_FLOW_OTHERS_NODE_ID,
  appendBoundedEvent,
  buildLiveFlowWsUrl,
  buildTopology,
  registerModelName,
  statusTone,
  type LiveFlowEvent,
  type LiveFlowStatusTone,
  type LiveFlowStreamState,
} from '@/features/liveFlow/liveFlowEvents';
import { connectLiveFlowStream } from '@/features/liveFlow/liveFlowStream';
import styles from './LiveFlowPage.module.scss';

const CENTER_NODE_ID = 'cliproxyapi';

interface ActivePulse {
  id: string;
  target: string;
  tone: LiveFlowStatusTone;
}

const TONE_CLASS: Record<LiveFlowStatusTone, string> = {
  success: styles.toneSuccess,
  redirect: styles.toneRedirect,
  'client-error': styles.toneClientError,
  'server-error': styles.toneServerError,
  unknown: styles.toneUnknown,
};

// Kept in sync with the `pulseEdgeFade` keyframe duration in LiveFlowPage.module.scss.
// Range: 1000–3000 ms (per UX request). Must stay identical to the SCSS value.
const ACTIVE_PULSE_MS = 2000;

// On first open, fitView frames the topology but caps the fit zoom below 1.0 so
// the page starts slightly zoomed out (the model ring feels less dense).
// This only affects the initial fit; it never fights user pan/zoom afterwards.
const INITIAL_FIT_MAX_ZOOM = 0.89;

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
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);
  const [models, setModels] = useState<readonly string[]>([]);

  const pausedRef = useRef(paused);
  const pendingRef = useRef<LiveFlowEvent[]>([]);
  const pulseTimersRef = useRef<number[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Keep the mutable paused flag in sync without writing the ref during render.
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const wsAuth = config?.wsAuth === true;
  const apiKeys = config?.apiKeys;

  const flashPulse = useCallback((event: LiveFlowEvent, target: string) => {
    if (!target) return;
    const tone = statusTone(event.status);
    const pulseId = `${event.id}-${Math.random().toString(36).slice(2, 8)}`;
    setActivePulses((current) => [...current, { id: pulseId, target, tone }]);
    const timer = window.setTimeout(() => {
      setActivePulses((current) => current.filter((pulse) => pulse.id !== pulseId));
    }, ACTIVE_PULSE_MS);
    pulseTimersRef.current.push(timer);
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
          setPendingCount(pendingRef.current.length);
          return;
        }
        setEvents((current) => appendBoundedEvent(current, event));
        setModels((current) => registerModelName(current, event.model));
      },
      onStateChange: setStreamState,
    });

    const timers = pulseTimersRef.current;
    return () => {
      connection.close();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [apiBase, wsAuth, apiKeys]);

  const { nodes: topoNodes, route } = useMemo(() => buildTopology(models), [models]);

  // Pulse whenever the latest event changes, routing towards its model node.
  const latestEventId = events[0]?.id;
  const latestEvent = events[0];
  useEffect(() => {
    if (!latestEvent) return;
    flashPulse(latestEvent, route(latestEvent.model));
  }, [latestEventId, latestEvent, route, flashPulse]);

  const togglePause = useCallback(() => {
    if (pausedRef.current) {
      if (pendingRef.current.length > 0) {
        const pending = pendingRef.current;
        pendingRef.current = [];
        setPendingCount(0);
        setEvents((current) => {
          let next = current;
          for (let i = pending.length - 1; i >= 0; i -= 1) {
            next = appendBoundedEvent(next, pending[i]);
          }
          return next;
        });
        setModels((current) => {
          let next = current;
          for (const ev of pending) {
            next = registerModelName(next, ev.model);
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
    setPendingCount(0);
    setEvents([]);
  }, []);

  const nodes: Node[] = useMemo(() => {
    const center: Node = {
      id: CENTER_NODE_ID,
      position: { x: 0, y: 0 },
      data: { label: 'CLIProxyAPI' },
      draggable: false,
      className: styles.centerNode,
    };
    const ring: Node[] = topoNodes.map((descriptor) => ({
      id: descriptor.id,
      position: descriptor.position,
      data: { label: descriptor.label },
      draggable: false,
      className:
        descriptor.id === LIVE_FLOW_OTHERS_NODE_ID ? styles.othersNode : styles.modelNode,
    }));
    return [center, ...ring];
  }, [topoNodes]);

  const edges: Edge[] = activePulses.map((pulse) => ({
    id: pulse.id,
    source: CENTER_NODE_ID,
    target: pulse.target,
    animated: true,
    className: `${styles.pulseEdge} ${TONE_CLASS[pulse.tone]}`,
  }));

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
            edges={edges}
            fitView
            fitViewOptions={{ maxZoom: INITIAL_FIT_MAX_ZOOM }}
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
                  count: pendingCount,
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
