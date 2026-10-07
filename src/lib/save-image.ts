// Client-side helper: save a DOM node as a branded PNG.
// On phones (iOS Safari/WebView, Android) anchor-download is unreliable or ignored,
// so prefer the Web Share API with a file — it opens the native sheet with
// "Save Image". Fall back to a download link, then to opening the image.
import { toBlob } from 'html-to-image';

export async function saveNodeAsPng(
  node: HTMLElement,
  filename: string,
  options?: { backgroundColor?: string }
): Promise<void> {
  const blob = await toBlob(node, {
    pixelRatio: 2,
    backgroundColor: options?.backgroundColor ?? '#0b1220',
    filter: (el) => !(el instanceof HTMLElement && el.dataset && 'exportHide' in el.dataset),
  });
  if (!blob) throw new Error('capture_failed');

  // Mobile-first: native share sheet ("Save Image" on iOS/Android).
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch (err) {
    // User cancelled the share sheet: stop silently; otherwise fall through.
    if (err instanceof DOMException && err.name === 'AbortError') return;
  }

  // Desktop: classic download link.
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.download = filename;
    a.href = url;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
