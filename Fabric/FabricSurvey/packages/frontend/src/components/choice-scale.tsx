import { cn } from '@/lib/utils';

export interface Choice<T extends string | number> {
  value: T;
  label: string;
  /** Extra classes applied while this option is selected (e.g. NPS band colour). */
  selectedClassName?: string;
}

interface ChoiceScaleProps<T extends string | number> {
  name: string;
  legend: string;
  hint?: string;
  choices: readonly Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Captions under the first and last option, e.g. "Not likely" / "Very likely". */
  ends?: [string, string];
  /** Stretch options to fill the row (numeric scales) vs. size to their labels. */
  fill?: boolean;
}

/**
 * A row of tap targets backed by native radio inputs, so arrow keys, Tab and
 * screen readers behave like any radio group with no extra wiring.
 */
export function ChoiceScale<T extends string | number>({
  name,
  legend,
  hint,
  choices,
  value,
  onChange,
  ends,
  fill = true,
}: ChoiceScaleProps<T>) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-200">
      <legend className="mb-200 flex flex-col gap-100">
        <span className="text-300 font-semibold text-foreground">{legend}</span>
        {hint ? <span className="text-200 text-muted-foreground">{hint}</span> : null}
      </legend>
      <div className={cn('flex', fill ? 'gap-100' : 'flex-wrap gap-200')}>
        {choices.map((choice) => {
          const selected = value === choice.value;
          return (
            <label
              key={String(choice.value)}
              className={cn(
                'flex min-h-11 cursor-pointer select-none items-center justify-center rounded-lg border text-[length:var(--text-300)] font-semibold transition',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
                fill ? 'min-w-0 flex-1 px-100' : 'px-400',
                selected
                  ? cn(
                      'border-primary bg-primary text-primary-foreground shadow-sm',
                      choice.selectedClassName
                    )
                  : 'border-input bg-card text-foreground hover:border-primary hover:bg-accent'
              )}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={selected}
                onChange={() => onChange(choice.value)}
              />
              {choice.label}
            </label>
          );
        })}
      </div>
      {ends ? (
        <div
          className="flex justify-between text-200 text-muted-foreground"
          aria-hidden="true"
        >
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      ) : null}
    </fieldset>
  );
}
