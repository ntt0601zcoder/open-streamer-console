import { describe, expect, it } from 'vitest';
import {
  createPlayerDiag,
  dashErrorInfo,
  hlsErrorRecorder,
  installPlayerDiag,
  recordNow,
  scrubUrls,
  stripQuery,
  uninstallPlayerDiag,
  type DiagEvent,
} from './playerDiag';

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

  it('stripQuery handles relative and malformed URLs', () => {
    expect(stripQuery('/live/a/index.m3u8?t=1')).toBe('/live/a/index.m3u8');
    expect(stripQuery('not a url?x=1#y')).toBe('not a url');
    expect(stripQuery('')).toBe('');
  });

  it('scrubs URLs embedded in detail', () => {
    const d = createPlayerDiag();
    recordNow(d, 'hls_error', 'load failed https://h/s.ts?token=SECRET#f retrying', false);
    expect(d.events()[0].detail).toBe('load failed https://h/s.ts retrying');
    expect(scrubUrls('a http://x/y?z=1 b')).toBe('a http://x/y b');
  });

  it('record stores a copy', () => {
    const d = createPlayerDiag();
    const e = ev(1);
    d.record(e);
    e.detail = 'mutated';
    expect(d.events()[0].detail).toBe('e1');
  });

  it('install/uninstall only clears when still current', () => {
    const a = createPlayerDiag();
    const b = createPlayerDiag();
    installPlayerDiag(a);
    expect(window.__osPlayerDiag).toBe(a);
    installPlayerDiag(b);
    uninstallPlayerDiag(a);
    expect(window.__osPlayerDiag).toBe(b);
    uninstallPlayerDiag(b);
    expect(window.__osPlayerDiag).toBeUndefined();
  });

  it('dash error event: code in detail, fatal undefined unless dash.js says so', () => {
    const d = createPlayerDiag();
    const info = dashErrorInfo({ type: 'error', error: { code: 25, message: 'manifest parse' } });
    recordNow(d, 'dash_error', info.detail, info.fatal);
    expect(d.events()[0].detail).toBe('code=25 manifest parse');
    expect(d.events()[0].fatal).toBeUndefined();
    expect('fatal' in d.events()[0]).toBe(false);
    expect(dashErrorInfo({ error: { code: 1, message: 'x', fatal: true } }).fatal).toBe(true);
  });

  it('dash error message fallbacks', () => {
    expect(dashErrorInfo({ message: 'x' }).detail).toBe('code=? x');
    expect(dashErrorInfo({ error: 'boom' }).detail).toBe('code=? boom');
    expect(dashErrorInfo({ error: { code: 25 } }).detail).toBe('code=25 DASH error');
    expect(dashErrorInfo({}).detail).toBe('code=? DASH error');
    expect(dashErrorInfo(undefined).message).toBe('DASH error');
  });

  it('scrubs uppercase scheme URLs', () => {
    expect(scrubUrls('see HTTPS://h/a?t=1')).toBe('see HTTPS://h/a');
  });
});
