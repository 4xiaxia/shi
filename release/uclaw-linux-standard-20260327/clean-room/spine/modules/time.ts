export function parseSqliteTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 0) {
      return null;
    }
    return value < 1e12 ? value * 1000 : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
      }
      return numeric < 1e12 ? numeric * 1000 : numeric;
    }

    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function isWithinRange(
  value: unknown,
  startMs: number,
  endMs: number
): boolean {
  const timestamp = parseSqliteTimestamp(value);
  if (timestamp === null) {
    return false;
  }
  return timestamp >= startMs && timestamp <= endMs;
}
