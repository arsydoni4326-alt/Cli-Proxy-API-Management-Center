import { describe, expect, test, beforeAll } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { UpdateModal } from '../src/components/common/UpdateModal';
import {
  UPSTREAM_CHANGELOG_URL,
  UPSTREAM_REPOSITORY_URL,
} from '../src/components/common/updateChangelog';
import { useAuthStore } from '../src/stores/useAuthStore';
import { shouldCheckInitialUpdate } from '../src/utils/updateNotification';
import en from '../src/i18n/locales/en.json';
import zhCN from '../src/i18n/locales/zh-CN.json';
import zhTW from '../src/i18n/locales/zh-TW.json';
import ru from '../src/i18n/locales/ru.json';

// Mock localStorage and window for Bun test environment
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const storage = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
      clear: () => { storage.clear(); },
      get length() { return storage.size; },
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
    } as Storage;
  }
  if (typeof globalThis.window === 'undefined') {
    (globalThis as any).window = {
      location: {
        host: 'localhost:5173',
        hostname: 'localhost',
        port: '5173',
        protocol: 'http:',
        href: 'http://localhost:5173/',
      },
    };
  }
});

const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } } });

describe('automatic update notification', () => {
  test('runs once after the initial browser document connects', () => {
    expect(shouldCheckInitialUpdate({ hasChecked: false, connectionStatus: 'disconnected' })).toBe(
      false
    );
    expect(shouldCheckInitialUpdate({ hasChecked: false, connectionStatus: 'connected' })).toBe(
      true
    );
    expect(shouldCheckInitialUpdate({ hasChecked: true, connectionStatus: 'connected' })).toBe(
      false
    );
  });

  test('does not repeat after a hash-route navigation leaves the root shell mounted', () => {
    const hasChecked = true;
    expect(shouldCheckInitialUpdate({ hasChecked, connectionStatus: 'connected' })).toBe(false);
  });
});

describe('UpdateModal', () => {
  test('renders the current and available upstream versions with repository links', () => {
    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(UpdateModal, {
          isOpen: true,
          onClose: () => {},
          latestVersion: 'v7.2.148',
          latestCommit: '1234567890abcdef',
        })
      )
    );

    // During SSR, Zustand store hooks return initial state (empty), so serverVersion is "Unknown"
    // In the browser, the store would have the actual server version
    expect(markup).toContain('Current version: Unknown');
    expect(markup).toContain(
      'An update from the upstream repository is available: v7.2.148 (commit 1234567).'
    );
    expect(markup).toContain(`href="${UPSTREAM_REPOSITORY_URL}"`);
    expect(markup).toContain('aria-expanded="false"');
    expect(UPSTREAM_CHANGELOG_URL).toBe(
      'https://github.com/arsydoni4326-alt/CLIProxyAPI/blob/main/frontend/CHANGELOG.md'
    );
  });

  test('provides all changelog labels in every supported locale', () => {
    for (const locale of [en, zhCN, zhTW, ru]) {
      for (const key of [
        'show_changelog',
        'hide_changelog',
        'changelog_title',
        'changelog_description',
        'view_changelog',
        'version_unknown',
      ]) {
        expect(locale.update_modal[key as keyof typeof locale.update_modal]).toBeTruthy();
      }
    }
  });
});
