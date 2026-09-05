import { describe, expect, test } from 'bun:test';
import { resolveProxyUrl } from '../src/features/providers/useProviderWorkbench';

describe('provider direct connection (resolveProxyUrl)', () => {
  test('checked direct connection persists the backend "direct" marker', () => {
    expect(resolveProxyUrl(true, '')).toBe('direct');
    expect(resolveProxyUrl(true, 'http://127.0.0.1:7890')).toBe('direct');
    expect(resolveProxyUrl(true, ' socks5://proxy.example:1080 ')).toBe('direct');
  });

  test('unchecked + empty proxy URL inherits the system proxy', () => {
    expect(resolveProxyUrl(false, '')).toBeUndefined();
    expect(resolveProxyUrl(false, '   ')).toBeUndefined();
    expect(resolveProxyUrl(undefined, undefined)).toBeUndefined();
  });

  test('unchecked clears a previously persisted direct marker so traffic uses the system proxy', () => {
    expect(resolveProxyUrl(false, 'direct')).toBeUndefined();
    expect(resolveProxyUrl(false, ' none ')).toBeUndefined();
  });

  test('unchecked keeps an explicit proxy URL override', () => {
    expect(resolveProxyUrl(false, 'socks5://proxy.example:1080')).toBe(
      'socks5://proxy.example:1080'
    );
    expect(resolveProxyUrl(false, ' http://127.0.0.1:7890 ')).toBe('http://127.0.0.1:7890');
  });
});