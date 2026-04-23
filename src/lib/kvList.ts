export interface KeyValuePair {
  key: string;
  value: string;
}

/** Record<string, string> from API → array preserving insertion order. */
export function recordToList(rec: Record<string, string> | undefined | null): KeyValuePair[] {
  if (!rec) return [];
  return Object.entries(rec).map(([key, value]) => ({ key, value }));
}

/**
 * Array form values → Record for the API. Drops entries with empty key.
 * On duplicate keys the last write wins, matching JSON object semantics.
 * Returns undefined when the resulting object would be empty.
 */
export function listToRecord(list: KeyValuePair[] | undefined): Record<string, string> | undefined {
  if (!list || list.length === 0) return undefined;
  const out: Record<string, string> = {};
  for (const { key, value } of list) {
    const k = key.trim();
    if (!k) continue;
    out[k] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
