import { describe, expect, test } from 'bun:test';
import { getVisualConfigValidationErrors } from '../src/hooks/useVisualConfig';
import { DEFAULT_VISUAL_VALUES } from '../src/types/visualConfig';

describe('visual config validation', () => {
  test('requires Redis usage retention to be empty or within 1..3600', () => {
    const values = structuredClone(DEFAULT_VISUAL_VALUES);

    values.redisUsageQueueRetentionSeconds = '';
    expect(getVisualConfigValidationErrors(values).redisUsageQueueRetentionSeconds).toBeUndefined();

    values.redisUsageQueueRetentionSeconds = '0';
    expect(getVisualConfigValidationErrors(values).redisUsageQueueRetentionSeconds).toBe(
      'integer_range_1_3600'
    );

    values.redisUsageQueueRetentionSeconds = '3601';
    expect(getVisualConfigValidationErrors(values).redisUsageQueueRetentionSeconds).toBe(
      'integer_range_1_3600'
    );

    values.redisUsageQueueRetentionSeconds = '3600';
    expect(getVisualConfigValidationErrors(values).redisUsageQueueRetentionSeconds).toBeUndefined();
  });

  test('transient error cooldown accepts empty, -1, or a non-negative integer', () => {
    const values = structuredClone(DEFAULT_VISUAL_VALUES);

    values.transientErrorCooldownSeconds = '';
    expect(
      getVisualConfigValidationErrors(values).transientErrorCooldownSeconds
    ).toBeUndefined();

    values.transientErrorCooldownSeconds = '-1';
    expect(
      getVisualConfigValidationErrors(values).transientErrorCooldownSeconds
    ).toBeUndefined();

    values.transientErrorCooldownSeconds = '0';
    expect(
      getVisualConfigValidationErrors(values).transientErrorCooldownSeconds
    ).toBeUndefined();

    values.transientErrorCooldownSeconds = '30';
    expect(
      getVisualConfigValidationErrors(values).transientErrorCooldownSeconds
    ).toBeUndefined();

    values.transientErrorCooldownSeconds = '-2';
    expect(getVisualConfigValidationErrors(values).transientErrorCooldownSeconds).toBe(
      'integer_min_minus1'
    );

    values.transientErrorCooldownSeconds = 'abc';
    expect(getVisualConfigValidationErrors(values).transientErrorCooldownSeconds).toBe(
      'integer_min_minus1'
    );
  });
});
