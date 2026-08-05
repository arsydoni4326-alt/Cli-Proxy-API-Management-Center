import { describe, expect, test } from 'bun:test';
import {
  compareVersions,
  isBackendVersionSupported,
  MIN_BACKEND_VERSION,
} from '../src/utils/version';

describe('backend version floor (Phase 1.1)', () => {
  test('floor constant is 7.1.0', () => {
    expect(MIN_BACKEND_VERSION).toBe('7.1.0');
  });

  test('accepts the exact minimum and newer versions (incl. v-prefix and partial segments)', () => {
    for (const v of ['7.1.0', '7.1.1', '7.2.0', '8.0.0', 'v7.1.0', ' 7.1.0 ', '7.1', '8']) {
      expect(isBackendVersionSupported(v)).toBe(true);
    }
  });

  test('rejects older versions (version drift regression)', () => {
    for (const v of ['7.0.9', '6.9.9', '0.1.0', 'v6.10.0']) {
      expect(isBackendVersionSupported(v)).toBe(false);
    }
  });

  test('rejects missing or unparseable versions (fail closed)', () => {
    for (const v of [null, undefined, '', '   ', 'abc', 'seven.one', '7.x.1'] as Array<
      string | null | undefined
    >) {
      expect(isBackendVersionSupported(v)).toBe(false);
    }
    expect(compareVersions('abc', MIN_BACKEND_VERSION)).toBeNull();
  });

  test('missing segments are treated as zero', () => {
    expect(compareVersions('7.1', '7.1.0')).toBe(0);
    expect(compareVersions('8', MIN_BACKEND_VERSION)).toBeGreaterThan(0);
  });

  // Contract: useAuthStore.login rejects unsupported backends with
  // ApiError { code: 'ERR_BACKEND_VERSION_UNSUPPORTED' }, which LoginPage maps to the
  // localized login.error_backend_unsupported_version message in all four locales.
});
