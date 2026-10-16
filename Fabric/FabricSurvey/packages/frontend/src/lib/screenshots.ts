import type { ClipboardEvent } from 'react';
import { MAX_SCREENSHOTS } from '@rayfin-app/shared';

/** Images at or under this size upload as-is; larger ones are re-encoded. */
const PASS_THROUGH_BYTES = 1.5 * 1024 * 1024;
/** Longest edge after downscaling; plenty for reading a screenshot. */
const MAX_EDGE = 2000;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const ACCEPT_ATTR = ACCEPTED.join(',');

export function isAcceptedImage(file: Blob): boolean {
  return ACCEPTED.includes(file.type);
}

/** Image files from a paste or drop, ignoring text and anything else. */
export function imagesFrom(items: DataTransfer | null): File[] {
  return items ? Array.from(items.files).filter(isAcceptedImage) : [];
}

/** onPaste handler for a form: adds pasted images and leaves text paste alone. */
export function pasteScreenshots(files: File[], onChange: (files: File[]) => void) {
  return (e: ClipboardEvent) => {
    const images = imagesFrom(e.clipboardData);
    if (images.length === 0) return;
    e.preventDefault();
    onChange([...files, ...images].slice(0, MAX_SCREENSHOTS));
  };
}

/** Shrink big screenshots in the browser so uploads stay small and under the function's 4 MB cap. */
async function shrink(file: Blob): Promise<Blob> {
  if (file.size <= PASS_THROUGH_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!out) throw new Error("Couldn't prepare one of the screenshots. Try a smaller image.");
  return out;
}

/** The upload payload for one screenshot: shrunk if needed, then base64. */
export async function screenshotBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await (await shrink(file)).arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
