import { api } from './client';

/**
 * Single sample parsed from a Prometheus text-format scrape.
 *
 * Counters always grow; the caller compares two samples taken at different
 * times to derive a rate. We never carry a TYPE — the consumer knows what
 * it asked for.
 */
export interface PromSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

export const metricsApi = {
  /** Raw Prometheus text from /metrics. */
  fetchRaw: () => api.get('metrics').text(),
};

/**
 * Parse Prometheus exposition format. Returns one entry per series sample
 * in the body. Ignores `# HELP`, `# TYPE` and lines we can't parse — the
 * scrape endpoint is well-formed in practice and this is read-only.
 */
export function parseProm(text: string): PromSample[] {
  const out: PromSample[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const braceStart = line.indexOf('{');
    let name: string;
    let labels: Record<string, string> = {};
    let rest: string;

    if (braceStart === -1) {
      // name value [timestamp]
      const sp = line.indexOf(' ');
      if (sp === -1) continue;
      name = line.slice(0, sp);
      rest = line.slice(sp + 1).trim();
    } else {
      const braceEnd = line.indexOf('}', braceStart);
      if (braceEnd === -1) continue;
      name = line.slice(0, braceStart);
      const labelBlock = line.slice(braceStart + 1, braceEnd);
      labels = parseLabels(labelBlock);
      rest = line.slice(braceEnd + 1).trim();
    }

    const valueStr = rest.split(/\s+/)[0];
    const value = Number(valueStr);
    if (!Number.isFinite(value)) continue;

    out.push({ name, labels, value });
  }
  return out;
}

function parseLabels(block: string): Record<string, string> {
  // key="value with optional escapes",key2="..."
  const out: Record<string, string> = {};
  let i = 0;
  while (i < block.length) {
    while (i < block.length && /\s|,/.test(block[i]!)) i++;
    if (i >= block.length) break;

    const eq = block.indexOf('=', i);
    if (eq === -1) break;
    const key = block.slice(i, eq).trim();
    if (block[eq + 1] !== '"') break;
    let j = eq + 2;
    let value = '';
    while (j < block.length) {
      const c = block[j]!;
      if (c === '\\' && j + 1 < block.length) {
        const next = block[j + 1]!;
        value += next === 'n' ? '\n' : next;
        j += 2;
        continue;
      }
      if (c === '"') break;
      value += c;
      j += 1;
    }
    out[key] = value;
    i = j + 1;
  }
  return out;
}
