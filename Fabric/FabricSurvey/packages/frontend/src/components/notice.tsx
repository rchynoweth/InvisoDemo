import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

/** Inline error or success line with an icon, so colour is never the only cue. */
export function Notice({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  const Icon = tone === 'error' ? AlertTriangle : CheckCircle2;
  return (
    <p
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'flex items-start gap-200 text-[length:var(--text-200)]',
        tone === 'error' ? 'text-destructive' : 'font-semibold text-success'
      )}
    >
      <Icon className="mt-px shrink-0 icon-size-200" aria-hidden="true" />
      {children}
    </p>
  );
}

/** Full-panel failure state with a retry button. */
export function LoadError({ what, message, onRetry }: { what: string; message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-400" role="alert">
      <p className="flex items-start gap-200 text-300 text-destructive">
        <AlertTriangle className="mt-px shrink-0 icon-size-300" aria-hidden="true" />
        Couldn't load {what}. {message}
      </p>
      <button type="button" onClick={onRetry} className={ui.button.secondary}>
        Try again
      </button>
    </div>
  );
}

/** Placeholder block while data loads. */
export function Loading({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={cn('animate-pulse rounded-xl bg-muted', className ?? 'h-[240px]')}>
      <span className="sr-only">{label}</span>
    </div>
  );
}
