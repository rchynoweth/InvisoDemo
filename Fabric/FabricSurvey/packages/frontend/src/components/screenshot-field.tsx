import { useEffect, useId, useMemo, useState, type DragEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { MAX_SCREENSHOTS } from '@rayfin-app/shared';

import { ACCEPT_ATTR, imagesFrom, isAcceptedImage } from '@/lib/screenshots';
import { cn } from '@/lib/utils';

/**
 * Screenshot picker: drag in, browse, or paste. Pasting is handled by the parent
 * form (see `pasteScreenshots` in lib/screenshots) so Ctrl+V works anywhere in the form, not
 * just while this box has focus.
 */
export function ScreenshotField({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const full = files.length >= MAX_SCREENSHOTS;

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function add(incoming: File[]) {
    const images = incoming.filter(isAcceptedImage);
    if (images.length) onChange([...files, ...images].slice(0, MAX_SCREENSHOTS));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) add(imagesFrom(e.dataTransfer));
  }

  return (
    <div className="flex flex-col gap-200">
      <div className="flex flex-col gap-100">
        <span className="text-300 font-semibold text-foreground">Screenshots</span>
        <span className="text-200 text-muted-foreground">
          Optional. Paste with Ctrl+V, drag in, or browse (up to {MAX_SCREENSHOTS})
        </span>
      </div>

      <div className="flex flex-wrap items-stretch gap-300">
        {files.map((file, i) => (
          <figure
            key={`${file.name}-${i}`}
            className="relative h-[96px] w-[144px] overflow-hidden rounded-lg border border-border bg-muted"
          >
            <img src={previews[i]} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              disabled={disabled}
              aria-label={`Remove screenshot ${i + 1}`}
              className="absolute top-100 right-100 rounded-full bg-card/90 p-100 text-foreground shadow-sm transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="icon-size-200" aria-hidden="true" />
            </button>
          </figure>
        ))}

        {!full ? (
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex min-h-[96px] min-w-[220px] flex-1 cursor-pointer flex-col items-center justify-center gap-100 rounded-lg border-2 border-dashed px-400 py-300 text-center transition',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              dragging ? 'border-primary bg-accent' : 'border-input hover:border-primary hover:bg-accent',
              disabled && 'pointer-events-none opacity-50'
            )}
          >
            <ImagePlus className="text-primary icon-size-400" aria-hidden="true" />
            <span className="text-200 font-semibold text-foreground">
              Paste, drop, or <span className="text-primary underline">browse</span>
            </span>
            <input
              id={inputId}
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              disabled={disabled}
              className="sr-only"
              onChange={(e) => {
                add(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
