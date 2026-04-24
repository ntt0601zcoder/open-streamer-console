/**
 * Copy text to the clipboard.
 *
 * navigator.clipboard is only exposed in secure contexts (HTTPS or localhost).
 * When the console is served over plain HTTP to an IP (common for internal
 * deployments), the API is undefined and a naive call silently fails. Fall
 * back to a hidden-textarea + document.execCommand('copy') in that case.
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

  const ta = document.createElement('textarea');
  ta.value = text;
  // Keep it off-screen but focusable; readOnly avoids the iOS keyboard popping.
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.opacity = '0';
  ta.style.pointerEvents = 'none';
  document.body.appendChild(ta);

  try {
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}
