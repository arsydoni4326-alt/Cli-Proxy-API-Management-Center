import { describe, expect, test } from 'bun:test';
import { createElement, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse as parseYaml } from 'yaml';
import { useVisualConfig } from '../src/hooks/useVisualConfig';
import type { VisualConfigValues } from '../src/types/visualConfig';

/**
 * Round-trip + concurrency harness for the config groups swept into the visual
 * editor in phase 1.5: cooldown persistence, header timezone, cloaking, codex
 * advanced toggles, xai, pprof, and flow visualization.
 */
function runHarness(initialYaml: string, changes: Partial<VisualConfigValues>, latestYaml: string) {
  function Harness() {
    const visualConfig = useVisualConfig();
    const [phase, setPhase] = useState(0);

    if (phase === 0) {
      visualConfig.loadVisualValuesFromYaml(initialYaml);
      setPhase(1);
    } else if (phase === 1) {
      visualConfig.setVisualValues(changes);
      setPhase(2);
    } else {
      return createElement('pre', null, visualConfig.applyVisualChangesToYaml(latestYaml));
    }

    return null;
  }

  const markup = renderToStaticMarkup(createElement(Harness));
  return markup.slice('<pre>'.length, -'</pre>'.length);
}

describe('visual config phase 1.5 fields', () => {
  test('writes cooldown, diagnostics, and cloaking fields while preserving concurrent edits', () => {
    const initial = [
      'debug: false',
      'save-cooldown-status: true',
      'transient-error-cooldown-seconds: 30',
      'claude-header-defaults:',
      '  timeout: 60',
      'claude-code:',
      '  disable-cloaking-model-list:',
      '    - claude-old',
      '',
    ].join('\n');

    const latest = [
      'debug: true', // concurrent edit: must survive
      'save-cooldown-status: true',
      'transient-error-cooldown-seconds: 30',
      'claude-header-defaults:',
      '  timeout: 90', // concurrent edit: must survive
      'claude-code:',
      '  disable-cloaking-model-list:',
      '    - claude-old',
      'unrelated-key: keep-me', // concurrent addition: must survive
      '',
    ].join('\n');

    const merged = runHarness(
      initial,
      {
        saveCooldownStatus: false,
        transientErrorCooldownSeconds: '120',
        claudeHeaderTimezone: 'Asia/Jakarta',
        disableClaudeCloakMode: true,
        claudeCodeDisableCloakingModelList: ['claude-new-a', 'claude-new-b'],
        codexIdentityConfuse: true,
        codexDisableCodexCloaking: true,
        codexOptimizeMultiAgentV2: true,
        xaiInjectXSearch: true,
        pprofEnable: true,
        pprofAddr: '127.0.0.1:6060',
        flowVisualizationEnabled: true,
        videoResultAuthCacheTtl: '2h',
      },
      latest
    );

    expect(parseYaml(merged)).toEqual({
      debug: true,
      'save-cooldown-status': false,
      'transient-error-cooldown-seconds': 120,
      'claude-header-defaults': {
        timeout: 90,
        timezone: 'Asia/Jakarta',
      },
      'disable-claude-cloak-mode': true,
      'claude-code': {
        'disable-cloaking-model-list': ['claude-new-a', 'claude-new-b'],
      },
      codex: {
        'identity-confuse': true,
        'disable-codex-cloaking': true,
        'optimize-multi-agent-v2': true,
      },
      xai: {
        'inject-x-search': true,
      },
      pprof: {
        enable: true,
        addr: '127.0.0.1:6060',
      },
      'flow-visualization-enabled': true,
      'video-result-auth-cache-ttl': '2h',
      'unrelated-key': 'keep-me',
    });
  });

  test('does not persist save-cooldown-status default unless it changed', () => {
    const initial = 'debug: false\n';
    const latest = 'debug: false\n';

    const merged = runHarness(initial, { requestRetry: '5' }, latest);
    const parsed = parseYaml(merged);

    expect(parsed['request-retry']).toBe(5);
    expect('save-cooldown-status' in parsed).toBe(false);
  });

  test('clears cloak model list by removing an empty claude-code map', () => {
    const initial = [
      'claude-code:',
      '  disable-cloaking-model-list:',
      '    - claude-old',
      '',
    ].join('\n');

    const merged = runHarness(initial, { claudeCodeDisableCloakingModelList: [] }, initial);
    const parsed = parseYaml(merged);

    expect(parsed['claude-code']).toBeUndefined();
  });
});
