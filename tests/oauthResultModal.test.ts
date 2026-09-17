import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import {
  OAuthResultModal,
  type OAuthResult,
} from '../src/components/common/OAuthResultModal';
import en from '../src/i18n/locales/en.json';
import zhCN from '../src/i18n/locales/zh-CN.json';
import zhTW from '../src/i18n/locales/zh-TW.json';
import ru from '../src/i18n/locales/ru.json';

const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } } });

const baseResult: OAuthResult = { type: 'success', message: 'Authentication successful!' };

function renderModal(result: OAuthResult | null): string {
  return renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(OAuthResultModal, { result, onClose: () => {} })
    )
  );
}

describe('OAuthResultModal', () => {
  test('renders nothing when there is no result', () => {
    expect(renderModal(null)).toBe('');
  });

  test('renders a dialog with the localized result title and message', () => {
    const markup = renderModal(baseResult);
    expect(markup).toContain('modal-overlay');
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('Success');
    expect(markup).toContain('Authentication successful!');
  });

  test('uses matching title keys for every result type in all four locales', () => {
    const titleKeys: Record<OAuthResult['type'], keyof typeof en.common> = {
      success: 'success',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    for (const locale of [en, zhCN, zhTW, ru]) {
      for (const key of Object.values(titleKeys)) {
        expect(String(locale.common[key]).trim()).toBeTruthy();
      }
    }
  });

  test('provides a manual dismissal close button', () => {
    const markup = renderModal({ type: 'error', message: 'OAuth failed' });
    expect(markup).toContain('aria-label="Close"');
    expect(markup).toContain('<span>Close</span>');
  });

  test('never auto-dismisses: the component schedules no timer', async () => {
    const source = await Bun.file('src/components/common/OAuthResultModal.tsx').text();
    expect(source).not.toMatch(/setTimeout|setInterval|NotificationTimer/);
  });
});
