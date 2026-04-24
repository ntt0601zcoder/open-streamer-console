/**
 * Copy text to the clipboard.
 *
 * navigator.clipboard is only exposed in secure contexts (HTTPS or localhost).
 * When the console is served over plain HTTP to an IP (common for internal
 * deployments), the API is undefined and we fall back to execCommand('copy').
 *
 * The fallback uses the Selection API on a detached <span> instead of a hidden
 * <textarea>.focus()+select() because the focus-based approach breaks inside
 * Radix Dialog / Popover: the focus trap snatches focus from our temp input
 * before execCommand runs, and the copy reads the wrong selection (or none).
 *
 * Returns true on success, false otherwise.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand
    }
  }

  if (typeof document === 'undefined') return false;

  const span = document.createElement('span');
  span.textContent = text;
  // Keep contents exactly as-is (preserve whitespace, no line-wrap quirks).
  span.style.whiteSpace = 'pre';
  // Off-screen but still in the layout tree so Selection can target it.
  span.style.position = 'fixed';
  span.style.top = '0';
  span.style.left = '0';
  span.style.opacity = '0';
  span.style.pointerEvents = 'none';
  document.body.appendChild(span);

  const selection = window.getSelection();
  if (!selection) {
    document.body.removeChild(span);
    return false;
  }

  const prevRanges: Range[] = [];
  for (let i = 0; i < selection.rangeCount; i++) prevRanges.push(selection.getRangeAt(i));
  const range = document.createRange();
  range.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  selection.removeAllRanges();
  for (const r of prevRanges) selection.addRange(r);
  document.body.removeChild(span);
  return ok;
}
