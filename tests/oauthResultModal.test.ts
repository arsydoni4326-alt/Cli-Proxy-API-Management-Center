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

/*
 * Protected feature contract (project-owner mandate): the OAuth result modal
 * must never be removed, replaced by toasts, or silently downgraded. The
 * source-level checks below fail the test suite if a future merge or edit
 * regresses the feature. See SPECIFICATION.md ("OAuth result modals").
 */
const pageSource = await Bun.file('src/pages/OAuthPage.tsx').text();
const modalSource = await Bun.file('src/components/common/OAuthResultModal.tsx').text();
const styleSource = await Bun.file('src/styles/components.scss').text();

describe('OAuth result modal feature contract (protected)', () => {

  test('the OAuth page still mounts the OAuthResultModal component', () => {
    expect(modalSource).toContain('export function OAuthResultModal');
    expect(pageSource).toContain('OAuthResultModal');
    expect(pageSource).toMatch(/<OAuthResultModal\s+result=\{oauthResult\}/);
  });

  test('the OAuth page still routes OAuth outcomes through showOauthResult', () => {
    expect(pageSource).toContain("import { OAuthResultModal, type OAuthResult }");
    expect(pageSource).toContain('const showOauthResult = useCallback(');
    // Known call sites: poll success/error, start error, missing state, Devin
    // cancel, callback required/validation/state, callback success/error, and
    // Vertex import file/required/success/error.
    expect(pageSource.match(/showOauthResult\(/g)?.length).toBeGreaterThanOrEqual(15);
  });

  test('main login results keep the strict localized status message', () => {
    // Poll success and error must show ONLY the provider status text.
    expect(pageSource).toContain(
      "showOauthResult('success', getProviderTextByID(provider, 'oauth_status_success'))"
    );
    expect(pageSource).toContain(
      "showOauthResult('error', getProviderTextByID(provider, 'oauth_status_error'))"
    );
    // The waiting status text must never be used as a modal message.
    expect(pageSource).not.toMatch(/showOauthResult\([^)]*oauth_status_waiting/);
  });

  test('OAuth outcomes are never downgraded to toast notifications', () => {
    // The only allowed toast on the OAuth page is the clipboard feedback.
    const toastCalls = pageSource.match(/showNotification\(/g) ?? [];
    expect(toastCalls.length).toBeLessThanOrEqual(1);
    if (toastCalls.length > 0) {
      expect(pageSource).toMatch(/showNotification\(\s*t\(copied \? 'notification\.link_copied'/);
    }
  });

  test('modal styles remain defined in the global component stylesheet', () => {
    const styles = styleSource;
    expect(styles).toContain('.oauth-result-modal-content');
    for (const type of ['success', 'error', 'warning']) {
      expect(styles).toContain(`.oauth-result-modal-${type} .oauth-result-modal-icon`);
    }
  });
});
