/**
 * Backend version floor enforcement (Phase 1.1).
 *
 * The Management Center requires CLIProxyAPI backend >= MIN_BACKEND_VERSION.
 * Older or unversioned backends are rejected at login with a distinct
 * "unsupported backend version" diagnostic (see LoginPage).
 */

export const MIN_BACKEND_VERSION = '7.1.0';

/**
 * Compare two dotted version strings (e.g. "7.1.0", "v7.2", "8").
 * Returns a negative number if a < b, 0 if equal, positive if a > b.
 * Missing segments are treated as 0. Non-numeric segments compare as 0
 * unless the whole string fails to parse, in which case null is returned.
 */
export const compareVersions = (a: string, b: string): number | null => {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  if (!pa || !pb) return null;
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
};

/** True when `version` is a valid version >= MIN_BACKEND_VERSION. */
export const isBackendVersionSupported = (version: string | null | undefined): boolean => {
  if (!version) return false;
  const cmp = compareVersions(version, MIN_BACKEND_VERSION);
  return cmp !== null && cmp >= 0;
};

const parseVersionParts = (version: string): number[] | null => {
  const cleaned = version.trim().replace(/^v/i, '');
  if (!cleaned) return null;
  const parts = cleaned.split('.').map((seg) => {
    const digits = seg.match(/^\d+/);
    return digits ? parseInt(digits[0], 10) : NaN;
  });
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts;
};
