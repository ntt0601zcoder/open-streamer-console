import type { Stream, Template } from '@/api/types';

/**
 * Apply the same template merge the server performs in `domain.ResolveStream`
 * before driving the pipeline.
 *
 * `GET /streams/:code` returns the RAW stream — config exactly as persisted.
 * To show operators what the runtime is actually using, the UI mirrors the
 * server's merge rules here and feeds the result into the per-tab forms.
 * That way every field shows the effective value (inherited or explicit),
 * matching what the pipeline reads, instead of a separate "preview" panel.
 *
 * Merge rules (mirror domain.ResolveStream):
 *   - string scalars: empty stream value falls back to template
 *   - slices: length 0 falls back to template
 *   - pointer fields (protocols, transcoder, dvr, watermark, thumbnail):
 *     nil/undefined falls back. A non-nil empty struct (e.g. all-false
 *     protocols) is an EXPLICIT empty — no inheritance.
 */
export function resolveStream(stream: Stream, template: Template | null): Stream {
  if (!template) return stream;
  const out: Stream = { ...stream };

  if (!out.name && template.name) out.name = template.name;
  if (!out.description && template.description) out.description = template.description;
  if (!out.stream_key && template.stream_key) out.stream_key = template.stream_key;
  if ((out.tags?.length ?? 0) === 0 && (template.tags?.length ?? 0) > 0) {
    out.tags = template.tags;
  }
  if ((out.inputs?.length ?? 0) === 0 && (template.inputs?.length ?? 0) > 0) {
    out.inputs = template.inputs;
  }
  if (!out.transcoder && template.transcoder) out.transcoder = template.transcoder;
  // protocols is a pointer type on the server (apidocs.StreamResponse.protocols).
  // nil/undefined → inherit; any present struct (even all-false) is explicit.
  if (out.protocols == null && template.protocols) {
    out.protocols = template.protocols;
  }
  if ((out.push?.length ?? 0) === 0 && (template.push?.length ?? 0) > 0) {
    out.push = template.push;
  }
  if (!out.dvr && template.dvr) out.dvr = template.dvr;
  if (!out.watermark && template.watermark) out.watermark = template.watermark;
  if (!out.thumbnail && template.thumbnail) out.thumbnail = template.thumbnail;

  return out;
}
