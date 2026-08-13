/**
 * Scroll-lock regression suite for Modal/Sheet overlays.
 *
 * `src/components/ui/scrollLock.ts` is pure DOM logic shared by every
 * overlay. Locking must capture a snapshot, apply `position: fixed`
 * plus hidden overflow, and restore exactly on the final unlock.
 * Ref-counting means nested overlays (e.g. a modal opening a sheet)
 * never unlock one layer early and jolt the scroll position.
 */

import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { FOCUSABLE_SELECTOR, lockScroll, unlockScroll } from '@/components/ui/scrollLock';

const originalWindow = (globalThis as { window?: unknown }).window;
const originalDocument = (globalThis as { document?: unknown }).document;
const originalHTMLElement = (globalThis as { HTMLElement?: unknown }).HTMLElement;

/**
 * `resolveContentScrollContainer` uses `instanceof HTMLElement`, so the stub
 * must be a real class registered on globalThis, not a plain object — only
 * then is the content-container snapshot/restore path actually exercised.
 */
class MockHTMLElement {
  tagName: string;
  classes = new Set<string>();
  style: Record<string, string> = {};
  private scrollTopValue = 0;

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }

  get classList() {
    return {
      add: (c: string) => void this.classes.add(c),
      remove: (c: string) => void this.classes.delete(c),
      contains: (c: string) => this.classes.has(c),
    };
  }

  get scrollTop() {
    return this.scrollTopValue;
  }

  scrollTo(opts: { top?: number }) {
    this.scrollTopValue = opts.top ?? 0;
  }
}

let body: MockHTMLElement;
let html: MockHTMLElement;
let contentEl: MockHTMLElement;

/** Install a fake `document`, fake `HTMLElement`, and fake `window`. */
function installDom() {
  body = new MockHTMLElement('body');
  html = new MockHTMLElement('html');
  contentEl = new MockHTMLElement('content');
  contentEl.scrollTop = 88;

  const documentStub = {
    body: body as unknown as HTMLElement,
    documentElement: html as unknown as HTMLElement,
    querySelector: (sel: string) => (sel === '.content' ? contentEl : null),
  };
  (globalThis as unknown as { document: unknown }).document = documentStub;
  (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = MockHTMLElement;
  (globalThis as unknown as { window: unknown }).window = {
    scrollY: 240,
    pageYOffset: 240,
    scrollTo: () => undefined,
  };
}

beforeEach(() => {
  installDom();
});

afterAll(() => {
  if (originalDocument === undefined) {
    delete (globalThis as { document?: unknown }).document;
  } else {
    (globalThis as { document?: unknown }).document = originalDocument;
  }
  if (originalHTMLElement === undefined) {
    delete (globalThis as { HTMLElement?: unknown }).HTMLElement;
  } else {
    (globalThis as { HTMLElement?: unknown }).HTMLElement = originalHTMLElement;
  }
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

describe('lockScroll', () => {
  test('applies position fixed + hidden overflow and records scroll positions', () => {
    lockScroll();

    expect(body.style.position).toBe('fixed');
    expect(body.style.top).toBe('-240px');
    expect(body.style.left).toBe('0');
    expect(body.style.right).toBe('0');
    expect(body.style.width).toBe('100%');
    expect(body.style.overflow).toBe('hidden');
    expect(html.style.overflow).toBe('hidden');
    expect(body.classList.contains('modal-open')).toBe(true);
    expect(html.classList.contains('modal-open')).toBe(true);
  });

  test('captures the inline-style snapshot only on the first lock', () => {
    body.style.position = 'absolute';
    lockScroll();

    // A nested overlay mutates position after the first lock; the snapshot
    // must keep the ORIGINAL value so the final restore returns to it.
    body.style.position = 'relative';
    lockScroll();

    unlockScroll(); // 2 → 1 : still locked
    expect(body.style.position).toBe('relative');

    unlockScroll(); // 1 → 0 : restores the first-lock snapshot
    expect(body.style.position).toBe('absolute');
  });

  test('is a no-op without a document (SSR-safe)', () => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { HTMLElement?: unknown }).HTMLElement;

    expect(() => lockScroll()).not.toThrow();
    expect(body.classList.contains('modal-open')).toBe(false);
  });
});

describe('unlockScroll', () => {
  test('restores inline styles and the content/window scroll on final unlock', () => {
    lockScroll();
    unlockScroll();

    // Inline styles return to their pre-lock (empty) baseline.
    expect(body.style).toEqual({});
    expect(body.classList.contains('modal-open')).toBe(false);
    expect(html.classList.contains('modal-open')).toBe(false);
    // Content container is scrolled back to its baseline (88).
    expect(contentEl.scrollTop).toBe(88);
  });

  test('requires one unlock per lock (ref-counted)', () => {
    lockScroll();
    lockScroll();

    unlockScroll(); // 2 → 1 : body stays locked
    expect(body.classList.contains('modal-open')).toBe(true);

    unlockScroll(); // 1 → 0 : body restored
    expect(body.classList.contains('modal-open')).toBe(false);
  });

  test('does not jolt the content scroll while a nested lock is active', () => {
    lockScroll();
    lockScroll();
    unlockScroll(); // 2 → 1 : content must keep its baseline
    expect(contentEl.scrollTop).toBe(88);
    unlockScroll();
    expect(contentEl.scrollTop).toBe(88);
  });

  test('is safe to call without a prior lock (never goes negative)', () => {
    unlockScroll();
    unlockScroll();
    expect(body.classList.contains('modal-open')).toBe(false);
  });
});

describe('focusable selector', () => {
  test('targets interactive elements only', () => {
    expect(FOCUSABLE_SELECTOR).toContain('a[href]');
    expect(FOCUSABLE_SELECTOR).toContain('button:not([disabled])');
    expect(FOCUSABLE_SELECTOR).toContain('input:not([disabled])');
    expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
  });
});