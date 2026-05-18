import { useMemo } from 'react';
import type { OutputProtocols, Stream, Template } from '@/api/types';
import { resolveStream } from '@/features/streams/lib/resolveStream';
import { useTemplate } from '@/features/templates/hooks/useTemplates';

// Sections that can be inherited from a template (mirrors domain.ResolveStream
// on the server). `general` lumps together the scalar identity fields
// (name / description / stream_key / tags) for the General tab.
export type InheritableSection =
  | 'general'
  | 'inputs'
  | 'protocols'
  | 'push'
  | 'transcoder'
  | 'dvr'
  | 'watermark'
  | 'thumbnail';

export interface StreamTemplateState {
  /** Resolved template document, or null while loading / when stream has none. */
  template: Template | null;
  /**
   * The stream with the template merge applied — what the runtime actually
   * uses. Equal to `stream` when there's no template. Tabs feed this into
   * their form builders so every field reflects the effective value.
   */
  resolved: Stream;
  /** Per-section inheritance flag — true when the section will fall back to the template at runtime. */
  inherited: Record<InheritableSection, boolean>;
  /** Sub-field inheritance flags for the General tab (scalar fields). */
  generalInherited: GeneralInheritance;
  /** True while the template is being fetched. */
  isLoading: boolean;
}

export interface GeneralInheritance {
  name: boolean;
  description: boolean;
  stream_key: boolean;
  tags: boolean;
}

const EMPTY_GENERAL: GeneralInheritance = {
  name: false,
  description: false,
  stream_key: false,
  tags: false,
};

const EMPTY_INHERITED: Record<InheritableSection, boolean> = {
  general: false,
  inputs: false,
  protocols: false,
  push: false,
  transcoder: false,
  dvr: false,
  watermark: false,
  thumbnail: false,
};

/**
 * Determine which sections of a stream will inherit from its referenced
 * template at runtime.
 *
 * `GET /streams/:code` returns the RAW stream — config exactly as persisted,
 * with no template merge applied. The server's coordinator runs the merge
 * (domain.ResolveStream) before driving the pipeline; this hook mirrors
 * that merge logic to surface "this field is empty, the runtime will pull
 * it from template X" to the operator.
 *
 * Rules (matching domain.ResolveStream):
 *   - string scalars: stream value is "" → inherit
 *   - slices: len == 0 → inherit
 *   - pointer fields (transcoder, dvr, watermark, thumbnail): nil → inherit
 *   - protocols struct: all booleans false → inherit
 *
 * A section is also only "inherited" when the template actually carries a
 * value for it — an empty field on both sides is just empty, not inheritance.
 */
export function useStreamTemplate(stream: Stream): StreamTemplateState {
  const code = stream.template ?? '';
  const tplQuery = useTemplate(code);

  return useMemo<StreamTemplateState>(() => {
    if (!code) {
      return {
        template: null,
        resolved: stream,
        inherited: EMPTY_INHERITED,
        generalInherited: EMPTY_GENERAL,
        isLoading: false,
      };
    }
    const tpl = tplQuery.data ?? null;
    if (!tpl) {
      return {
        template: null,
        resolved: stream,
        inherited: EMPTY_INHERITED,
        generalInherited: EMPTY_GENERAL,
        isLoading: tplQuery.isLoading,
      };
    }

    const generalInherited: GeneralInheritance = {
      name: scalarInherits(stream.name, tpl.name),
      description: scalarInherits(stream.description, tpl.description),
      stream_key: scalarInherits(stream.stream_key, tpl.stream_key),
      tags: listInherits(stream.tags, tpl.tags),
    };

    const inherited: Record<InheritableSection, boolean> = {
      general:
        generalInherited.name ||
        generalInherited.description ||
        generalInherited.stream_key ||
        generalInherited.tags,
      inputs: listInherits(stream.inputs, tpl.inputs),
      protocols: protocolsInherits(stream.protocols, tpl.protocols),
      push: listInherits(stream.push, tpl.push),
      transcoder: !stream.transcoder && !!tpl.transcoder,
      dvr: !stream.dvr && !!tpl.dvr,
      watermark: !stream.watermark && !!tpl.watermark,
      thumbnail: !stream.thumbnail && !!tpl.thumbnail,
    };

    return {
      template: tpl,
      resolved: resolveStream(stream, tpl),
      inherited,
      generalInherited,
      isLoading: false,
    };
  }, [stream, code, tplQuery.data, tplQuery.isLoading]);
}

function scalarInherits(s: string | undefined, t: string | undefined): boolean {
  return !s && !!t;
}

function listInherits<T>(s: T[] | null | undefined, t: T[] | null | undefined): boolean {
  return (!s || s.length === 0) && !!t && t.length > 0;
}

function protocolsInherits(
  s: OutputProtocols | undefined,
  t: OutputProtocols | undefined,
): boolean {
  // `protocols` is a pointer on the server: nil/undefined means inherit;
  // a present struct (even with all-false toggles) is an explicit override.
  if (!t) return false;
  const tplAny = !!(t.hls || t.dash || t.rtmp || t.rtsp || t.srt || t.mpegts);
  if (!tplAny) return false;
  return s == null;
}
