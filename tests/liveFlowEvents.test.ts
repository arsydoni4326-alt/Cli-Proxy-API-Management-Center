import { describe, expect, test } from 'bun:test';

import {
  LIVE_FLOW_BUFFER_LIMIT,
  LIVE_FLOW_FILTER_ALL,
  LIVE_FLOW_MAX_MODEL_NODES,
  LIVE_FLOW_OTHERS_NODE_ID,
  appendBoundedEvent,
  boundedBufferLength,
  buildLiveFlowWsUrl,
  buildTopology,
  filterLiveFlowEvents,
  isWsFlowEvent,
  matchesModelFilter,
  normalizeFlowEvent,
  reconnectDelayMs,
  registerModelName,
  statusTone,
  type LiveFlowEvent,
} from '../src/features/liveFlow/liveFlowEvents';

describe('buildLiveFlowWsUrl', () => {
  test('converts http base to ws and appends the live-flow path', () => {
    expect(buildLiveFlowWsUrl('http://localhost:8317')).toBe(
      'ws://localhost:8317/live-flow/ws'
    );
  });

  test('converts https base to wss', () => {
    expect(buildLiveFlowWsUrl('https://cpa.example.com')).toBe(
      'wss://cpa.example.com/live-flow/ws'
    );
  });

  test('strips the /v0/management suffix and trailing slashes', () => {
    expect(buildLiveFlowWsUrl('http://localhost:8317/v0/management')).toBe(
      'ws://localhost:8317/live-flow/ws'
    );
    expect(buildLiveFlowWsUrl('http://localhost:8317/v0/management/')).toBe(
      'ws://localhost:8317/live-flow/ws'
    );
    expect(buildLiveFlowWsUrl('http://localhost:8317/')).toBe(
      'ws://localhost:8317/live-flow/ws'
    );
  });

  test('assumes http for schemeless input', () => {
    expect(buildLiveFlowWsUrl('localhost:8317')).toBe(
      'ws://localhost:8317/live-flow/ws'
    );
  });

  test('appends the api key as ?key= only when ws-auth is enabled', () => {
    expect(
      buildLiveFlowWsUrl('http://localhost:8317', { wsAuth: true, apiKey: 'secret-key' })
    ).toBe('ws://localhost:8317/live-flow/ws?key=secret-key');
  });

  test('omits the key when ws-auth is disabled or no key is configured', () => {
    expect(
      buildLiveFlowWsUrl('http://localhost:8317', { wsAuth: false, apiKey: 'secret-key' })
    ).toBe('ws://localhost:8317/live-flow/ws');
    expect(buildLiveFlowWsUrl('http://localhost:8317', { wsAuth: true })).toBe(
      'ws://localhost:8317/live-flow/ws'
    );
    expect(buildLiveFlowWsUrl('http://localhost:8317', { wsAuth: true, apiKey: '' })).toBe(
      'ws://localhost:8317/live-flow/ws'
    );
  });

  test('url-encodes the api key', () => {
    expect(
      buildLiveFlowWsUrl('http://localhost:8317', { wsAuth: true, apiKey: 'a b/c?d' })
    ).toBe('ws://localhost:8317/live-flow/ws?key=a%20b%2Fc%3Fd');
  });

  test('returns an empty string for unparseable input', () => {
    expect(buildLiveFlowWsUrl('')).toBe('');
    expect(buildLiveFlowWsUrl('   ')).toBe('');
  });
});

describe('normalizeFlowEvent', () => {
  test('accepts a complete backend frame', () => {
    const event = normalizeFlowEvent({
      id: 'req_1',
      ts: 1760424360123,
      method: 'POST',
      path: '/v1/chat/completions',
      model: 'gpt-4o',
      status: 200,
      latency_ms: 842,
    });
    expect(event).toEqual({
      id: 'req_1',
      ts: 1760424360123,
      method: 'POST',
      path: '/v1/chat/completions',
      model: 'gpt-4o',
      status: 200,
      latency_ms: 842,
    });
  });

  test('omits model when absent or empty (backend omits it today)', () => {
    const withoutModel = normalizeFlowEvent({
      id: 'req_2',
      ts: 1760424360123,
      method: 'POST',
      path: '/v1/chat/completions',
      status: 200,
      latency_ms: 12,
    });
    expect(withoutModel).not.toBeNull();
    expect(withoutModel?.model).toBeUndefined();
    expect('model' in (withoutModel as object)).toBe(false);

    const emptyModel = normalizeFlowEvent({
      id: 'req_3',
      ts: 1760424360123,
      method: 'POST',
      path: '/v1/chat/completions',
      model: '',
      status: 200,
      latency_ms: 12,
    });
    expect(emptyModel?.model).toBeUndefined();
  });

  test('synthesizes an id when the frame omits one', () => {
    const event = normalizeFlowEvent({
      ts: 1760424360123,
      method: 'POST',
      path: '/v1/models',
      status: 404,
      latency_ms: 3,
    });
    expect(event?.id).toBe('1760424360123-POST-/v1/models-404');
  });

  test('accepts numeric strings for ts/status/latency_ms', () => {
    const event = normalizeFlowEvent({
      id: 'req_4',
      ts: '1760424360123',
      method: 'GET',
      path: '/v1/models',
      status: '200',
      latency_ms: '7',
    });
    expect(event?.ts).toBe(1760424360123);
    expect(event?.status).toBe(200);
    expect(event?.latency_ms).toBe(7);
  });

  test('rejects malformed frames instead of throwing', () => {
    expect(normalizeFlowEvent(null)).toBeNull();
    expect(normalizeFlowEvent(undefined)).toBeNull();
    expect(normalizeFlowEvent('not an object')).toBeNull();
    expect(normalizeFlowEvent(42)).toBeNull();
    // missing required fields
    expect(
      normalizeFlowEvent({ method: 'POST', path: '/v1/x', status: 200, latency_ms: 1 })
    ).toBeNull();
    expect(
      normalizeFlowEvent({ ts: 1, path: '/v1/x', status: 200, latency_ms: 1 })
    ).toBeNull();
    expect(
      normalizeFlowEvent({ ts: 1, method: 'POST', status: 200, latency_ms: 1 })
    ).toBeNull();
    expect(
      normalizeFlowEvent({ ts: 1, method: 'POST', path: '/v1/x', latency_ms: 1 })
    ).toBeNull();
    expect(
      normalizeFlowEvent({ ts: 1, method: 'POST', path: '/v1/x', status: 200 })
    ).toBeNull();
    // non-finite numbers
    expect(
      normalizeFlowEvent({
        ts: Number.NaN,
        method: 'POST',
        path: '/v1/x',
        status: 200,
        latency_ms: 1,
      })
    ).toBeNull();
  });
});

describe('appendBoundedEvent / boundedBufferLength', () => {
  const makeEvent = (id: string): LiveFlowEvent => ({
    id,
    ts: 1760424360123,
    method: 'POST',
    path: '/v1/chat/completions',
    status: 200,
    latency_ms: 1,
  });

  test('prepends events (newest first)', () => {
    let list: LiveFlowEvent[] = [];
    list = appendBoundedEvent(list, makeEvent('a'));
    list = appendBoundedEvent(list, makeEvent('b'));
    expect(list.map((e) => e.id)).toEqual(['b', 'a']);
  });

  test('drops the oldest events once the cap is exceeded', () => {
    let list: LiveFlowEvent[] = [];
    for (let i = 0; i < 5; i += 1) {
      list = appendBoundedEvent(list, makeEvent(`e${i}`), 3);
    }
    expect(list.map((e) => e.id)).toEqual(['e4', 'e3', 'e2']);
    expect(list.length).toBe(3);
  });

  test('defaults to the live-flow buffer limit', () => {
    let list: LiveFlowEvent[] = [];
    for (let i = 0; i < LIVE_FLOW_BUFFER_LIMIT + 10; i += 1) {
      list = appendBoundedEvent(list, makeEvent(`e${i}`));
    }
    expect(list.length).toBe(LIVE_FLOW_BUFFER_LIMIT);
    expect(list[0]?.id).toBe(`e${LIVE_FLOW_BUFFER_LIMIT + 9}`);
  });

  test('boundedBufferLength mirrors the drop-oldest eviction', () => {
    expect(boundedBufferLength(0, 200)).toBe(1);
    expect(boundedBufferLength(199, 200)).toBe(200);
    expect(boundedBufferLength(200, 200)).toBe(200);
    expect(boundedBufferLength(999, 200)).toBe(200);
  });
});

describe('statusTone', () => {
  test('maps status code ranges onto display tones', () => {
    expect(statusTone(200)).toBe('success');
    expect(statusTone(299)).toBe('success');
    expect(statusTone(300)).toBe('redirect');
    expect(statusTone(302)).toBe('redirect');
    expect(statusTone(400)).toBe('client-error');
    expect(statusTone(404)).toBe('client-error');
    expect(statusTone(499)).toBe('client-error');
    expect(statusTone(500)).toBe('server-error');
    expect(statusTone(503)).toBe('server-error');
  });

  test('treats anything below 200 as unknown', () => {
    expect(statusTone(0)).toBe('unknown');
    expect(statusTone(100)).toBe('unknown');
    expect(statusTone(199)).toBe('unknown');
  });
});

describe('reconnectDelayMs', () => {
  test('doubles from 1s and caps at the provided ceiling', () => {
    expect(reconnectDelayMs(0)).toBe(1000);
    expect(reconnectDelayMs(1)).toBe(2000);
    expect(reconnectDelayMs(2)).toBe(4000);
    expect(reconnectDelayMs(3)).toBe(8000);
    expect(reconnectDelayMs(20)).toBe(15000);
    expect(reconnectDelayMs(20, 5000)).toBe(5000);
  });

  test('clamps negative attempts to the 1s floor', () => {
    expect(reconnectDelayMs(-5)).toBe(1000);
  });
});

describe('registerModelName', () => {
  test('appends a new model and preserves insertion order', () => {
    let models: readonly string[] = [];
    models = registerModelName(models, 'gpt-4o');
    models = registerModelName(models, 'claude-3.7');
    models = registerModelName(models, 'gemini-2.5');
    expect(models).toEqual(['gpt-4o', 'claude-3.7', 'gemini-2.5']);
  });

  test('returns the same reference for a duplicate or empty name', () => {
    const models = registerModelName([], 'gpt-4o');
    expect(registerModelName(models, 'gpt-4o')).toBe(models);
    expect(registerModelName(models, '')).toBe(models);
    expect(registerModelName(models, undefined)).toBe(models);
    expect(registerModelName(models, '   ')).toBe(models);
  });

  test('trims whitespace around the name', () => {
    const models = registerModelName([], '  gpt-4o  ');
    expect(models).toEqual(['gpt-4o']);
  });
});

describe('buildTopology', () => {
  test('lays every model on the ring when under the cap', () => {
    const { nodes, route } = buildTopology(['a', 'b', 'c']);
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b', 'c']);
    // No overflow → no synthetic others node.
    expect(nodes.some((n) => n.id === LIVE_FLOW_OTHERS_NODE_ID)).toBe(false);
    // Positions are deterministic and non-zero-radius.
    for (const node of nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
      expect(Math.hypot(node.position.x, node.position.y)).toBeGreaterThan(0);
    }
    expect(route('b')).toBe('b');
    // Unknown model with no overflow → no destination.
    expect(route('zzz')).toBe('');
    expect(route(undefined)).toBe('');
  });

  test('collapses overflow into a single others node and routes capped models to it', () => {
    const models = Array.from({ length: LIVE_FLOW_MAX_MODEL_NODES + 3 }, (_, i) => `m${i}`);
    const { nodes, route } = buildTopology(models);
    expect(nodes.length).toBe(LIVE_FLOW_MAX_MODEL_NODES + 1);
    const others = nodes[nodes.length - 1];
    expect(others?.id).toBe(LIVE_FLOW_OTHERS_NODE_ID);
    expect(others?.label).toBe('+3 more');
    // Visible models route to themselves.
    expect(route('m0')).toBe('m0');
    expect(route(`m${LIVE_FLOW_MAX_MODEL_NODES - 1}`)).toBe(`m${LIVE_FLOW_MAX_MODEL_NODES - 1}`);
    // Overflowed models route to the others node.
    expect(route(`m${LIVE_FLOW_MAX_MODEL_NODES}`)).toBe(LIVE_FLOW_OTHERS_NODE_ID);
    // Unknown/absent model with overflow → others node for visibility.
    expect(route('never-seen')).toBe(LIVE_FLOW_OTHERS_NODE_ID);
    expect(route(undefined)).toBe(LIVE_FLOW_OTHERS_NODE_ID);
  });

  test('is deterministic across calls (insertion order drives layout)', () => {
    const models = ['x', 'y', 'z'];
    const first = buildTopology(models);
    const second = buildTopology(models);
    expect(first.nodes).toEqual(second.nodes);
  });

  test('handles an empty model set', () => {
    const { nodes, route } = buildTopology([]);
    expect(nodes).toEqual([]);
    expect(route('anything')).toBe('');
  });
});

describe('per-model filter (ROADMAP 2.6 step 5)', () => {
  const makeEvent = (id: string, model?: string): LiveFlowEvent => ({
    id,
    ts: 1760424360123,
    method: 'POST',
    path: '/v1/chat/completions',
    ...(model ? { model } : {}),
    status: 200,
    latency_ms: 1,
  });

  test('the ALL filter passes every event and returns the same reference', () => {
    const events = [makeEvent('a', 'gpt-4o'), makeEvent('b'), makeEvent('c', 'claude-3.7')];
    for (const event of events) {
      expect(matchesModelFilter(event, LIVE_FLOW_FILTER_ALL)).toBe(true);
    }
    expect(filterLiveFlowEvents(events, LIVE_FLOW_FILTER_ALL)).toBe(events);
  });

  test('a concrete model keeps only exact matches (model-less events excluded)', () => {
    const events = [makeEvent('a', 'gpt-4o'), makeEvent('b'), makeEvent('c', 'claude-3.7')];
    expect(matchesModelFilter(makeEvent('x', 'gpt-4o'), 'gpt-4o')).toBe(true);
    expect(matchesModelFilter(makeEvent('y'), 'gpt-4o')).toBe(false);
    expect(matchesModelFilter(makeEvent('z', 'claude-3.7'), 'gpt-4o')).toBe(false);
    expect(filterLiveFlowEvents(events, 'gpt-4o').map((e) => e.id)).toEqual(['a']);
    expect(filterLiveFlowEvents(events, 'never-seen')).toEqual([]);
  });

  test('the others sentinel matches only overflow-demoted models', () => {
    const overflow = new Set(['m24', 'm25']);
    // A demoted (overflow) model matches.
    expect(matchesModelFilter(makeEvent('a', 'm25'), LIVE_FLOW_OTHERS_NODE_ID, overflow)).toBe(true);
    // A visible model does not.
    expect(matchesModelFilter(makeEvent('b', 'm0'), LIVE_FLOW_OTHERS_NODE_ID, overflow)).toBe(false);
    // Model-less events never match the others node.
    expect(matchesModelFilter(makeEvent('c'), LIVE_FLOW_OTHERS_NODE_ID, overflow)).toBe(false);
    // Without any overflow set, nothing matches the others node.
    expect(matchesModelFilter(makeEvent('d', 'm25'), LIVE_FLOW_OTHERS_NODE_ID, null)).toBe(false);
    expect(matchesModelFilter(makeEvent('e'), LIVE_FLOW_OTHERS_NODE_ID, null)).toBe(false);
    const events = [makeEvent('a', 'm25'), makeEvent('b', 'm0'), makeEvent('c')];
    expect(
      filterLiveFlowEvents(events, LIVE_FLOW_OTHERS_NODE_ID, overflow).map((e) => e.id)
    ).toEqual(['a']);
  });
});

describe('isWsFlowEvent', () => {
  test('detects websocket conversation turn events', () => {
    expect(
      isWsFlowEvent({
        id: 'req_1',
        ts: 1760424360123,
        method: 'WS',
        path: '/v1/responses',
        status: 200,
        latency_ms: 1,
      })
    ).toBe(true);
    expect(
      isWsFlowEvent({
        id: 'req_2',
        ts: 1760424360123,
        method: 'POST',
        path: '/v1/chat/completions',
        status: 200,
        latency_ms: 1,
      })
    ).toBe(false);
  });
});
