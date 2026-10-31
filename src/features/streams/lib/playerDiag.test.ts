import { describe, expect, it } from 'vitest';
import { createPlayerDiag, hlsErrorRecorder, stripQuery, type DiagEvent } from './playerDiag';

const ev = (n: number): DiagEvent => ({ t: n, kind: 'state', detail: `e${n}` });

describe('playerDiag', () => {
  it('ring buffer drops oldest past capacity', () => {
    const d = createPlayerDiag(3);
    for (let i = 1; i <= 5; i++) d.record(ev(i));
    expect(d.events().map((e) => e.detail)).toEqual(['e3', 'e4', 'e5']);
  });

  it('toJSON round-trips', () => {
    const d = createPlayerDiag();
    d.record({ t: 1, kind: 'hls_error', fatal: true, detail: 'x' });
    d.record(ev(2));
    expect(JSON.parse(d.toJSON())).toEqual(d.events());
  });

  it('records non-fatal hls errors', () => {
    const d = createPlayerDiag();
    hlsErrorRecorder(d)('hlsError', {
      type: 'networkError',
      details: 'fragLoadError',
      fatal: false,
      url: 'https://h/live/a/seg1.ts?token=SECRET',
      response: { code: 503 },
    });
    const [e] = d.events();
    expect(e.kind).toBe('hls_error');
    expect(e.fatal).toBe(false);
    expect(e.detail).toContain('fragLoadError');
    expect(e.detail).toContain('503');
    expect(e.detail).not.toContain('SECRET');
  });

  it('stripQuery removes query and hash', () => {
    expect(stripQuery('http://h/a.m3u8?token=1#x')).toBe('http://h/a.m3u8');
  });
});
