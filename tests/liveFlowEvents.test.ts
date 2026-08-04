import { describe, expect, test } from 'bun:test';

import {
  LIVE_FLOW_BUFFER_LIMIT,
  appendBoundedEvent,
  boundedBufferLength,
  buildLiveFlowWsUrl,
  normalizeFlowEvent,
  reconnectDelayMs,
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
