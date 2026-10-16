import { useId, type ReactNode } from 'react';
import { RESPONSE_DIMENSIONS, type ResponseDimension } from '@rayfin-app/shared';

import { ChoiceScale } from './choice-scale';
import { Notice } from './notice';
import { FIVE_POINT } from '@/lib/scales';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

export function TextArea({
  label,
  hint,
  value,
  onChange,
  maxLength,
  placeholder,
  rows = 3,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-200">
      <label htmlFor={id} className="flex flex-col gap-100">
        <span className="text-300 font-semibold text-foreground">{label}</span>
        {hint ? <span className="text-200 text-muted-foreground">{hint}</span> : null}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={rows}
        className={cn(ui.input, 'resize-y')}
      />
    </div>
  );
}

/** The four 1–5 answer-quality scales, shared by guided and freeform ratings. */
export function RatingsGrid({
  ratings,
  onRate,
}: {
  ratings: Record<ResponseDimension, number | null>;
  onRate: (key: ResponseDimension, value: number) => void;
}) {
  return (
    <div className="grid gap-x-700 gap-y-600 md:grid-cols-2 xl:grid-cols-4">
      {RESPONSE_DIMENSIONS.map((d) => (
        <ChoiceScale
          key={d.key}
          name={d.key}
          legend={d.label}
          hint={d.hint}
          choices={FIVE_POINT}
          value={ratings[d.key]}
          onChange={(v: number) => onRate(d.key, v)}
          ends={['Poor', 'Excellent']}
        />
      ))}
    </div>
  );
}

export type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

/** Form footer: what's still needed (or the save result), extra buttons, and submit. */
export function SubmitRow({
  state,
  missing,
  label,
  savedNote = 'Saved. Thank you!',
  children,
}: {
  state: SaveState;
  /** Required answers still empty; submit stays disabled until this is empty. */
  missing: string[];
  label: string;
  savedNote?: string;
  /** Extra buttons shown left of submit (e.g. Back / Skip). */
  children?: ReactNode;
}) {
  const saving = state.kind === 'saving';
  return (
    <div className="flex flex-col gap-300 border-t border-border pt-500">
      <div aria-live="polite">
        {state.kind === 'error' ? (
          <Notice tone="error">{state.message}</Notice>
        ) : state.kind === 'saved' ? (
          <Notice tone="success">{savedNote}</Notice>
        ) : (
          <p className="text-200 text-muted-foreground">
            {missing.length > 0 ? `Still needed: ${missing.join(', ')}` : 'Ready to submit.'}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-300">
        {children}
        <button type="submit" disabled={saving || missing.length > 0} className={cn(ui.button.primary, 'ml-auto px-600')}>
          {saving ? 'Saving…' : label}
        </button>
      </div>
    </div>
  );
}
